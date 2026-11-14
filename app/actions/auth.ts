"use server";

import bcrypt from "bcryptjs";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { getUserByEmail } from "@/app/lib/data/users";
import { sendVerificationEmail } from "@/app/lib/email";
import { createSession, deleteSession } from "@/app/lib/session";
import { consumeRateLimit, requestAddress } from "@/app/lib/rate-limit";

function verificationCode() {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function codeHash(code: string) {
  const secret = process.env.SESSION_SECRET || "local-development-only-secret-change-before-deploy-000000";
  return createHmac("sha256", secret).update(code).digest("hex");
}

function verificationRecord(code: string, farmSize: string) {
  return JSON.stringify({
    codeHash: codeHash(code),
    expiresAt: Date.now() + 10 * 60 * 1000,
    farmSize,
  });
}

type VerificationRecord = { codeHash: string; expiresAt: number; farmSize: string };

function parseVerificationRecord(raw: string | null): VerificationRecord | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as VerificationRecord;
    if (!/^[a-f0-9]{64}$/.test(parsed.codeHash) || typeof parsed.expiresAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function registerAction(formData: FormData) {
  const { writeDb } = await import("@/app/lib/write-db");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const farmSize = String(formData.get("farm_size") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  const address = await requestAddress();
  if (!(await consumeRateLimit("register-ip", address, 5, 60 * 60 * 1000)).allowed) redirect("/register?error=rate_limited");
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !phone || !location || password.length < 12 || !["farmer", "buyer"].includes(role)) {
    redirect("/register?error=invalid_details");
  }

  const existing = await (writeDb
    .prepare("SELECT id, is_verified, otp FROM users WHERE lower(email) = lower(?) LIMIT 1")
    .get(email)) as { id: number; is_verified: number; otp: string | null } | undefined;
  if (existing?.is_verified === 0 && parseVerificationRecord(existing.otp)) {
    redirect(`/verify-email?id=${existing.id}`);
  }
  if (existing) redirect("/register?error=email_exists");

  const code = verificationCode();
  try {
    await sendVerificationEmail(email, name, code);
  } catch (error) {
    if (error instanceof Error && error.message === "Email delivery is not configured.") {
      redirect("/register?error=email_not_configured");
    }
    redirect("/register?error=email_failed");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let userId = 0;
  try {
    const result = await (writeDb
      .prepare(
        `INSERT INTO users (name, email, phone, location, password, role, is_verified, otp)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(name, email, phone, location, passwordHash, role, verificationRecord(code, farmSize)));
    userId = Number(result.lastInsertRowid);
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      redirect("/register?error=email_exists");
    }
    redirect("/register?error=registration_failed");
  }
  redirect(`/verify-email?id=${userId}`);
}

export async function verifyEmailAction(formData: FormData) {
  const { writeDb } = await import("@/app/lib/write-db");
  const userId = Number(formData.get("user_id"));
  const code = String(formData.get("code") ?? "").trim();
  if (!(await consumeRateLimit("verify-user", String(userId), 5, 15 * 60 * 1000)).allowed) redirect(`/verify-email?id=${userId}&error=rate_limited`);
  if (!Number.isInteger(userId) || userId < 1 || !/^\d{6}$/.test(code)) {
    redirect(`/verify-email?id=${userId || ""}&error=invalid_code`);
  }

  const row = await (writeDb
    .prepare("SELECT id, name, email, phone, location, password, role, is_verified, otp FROM users WHERE id = ? LIMIT 1")
    .get(userId)) as { id: number; name: string; email: string; phone: string; location: string; password: string; role: string; is_verified: number; otp: string | null } | undefined;
  const record = parseVerificationRecord(row?.otp ?? null);
  const suppliedHash = codeHash(code);
  const expectedHash = record?.codeHash ?? "0".repeat(64);
  const matches = timingSafeEqual(Buffer.from(suppliedHash), Buffer.from(expectedHash));

  if (!row || row.is_verified || !record || record.expiresAt < Date.now() || !matches) {
    redirect(`/verify-email?id=${userId}&error=${record && record.expiresAt < Date.now() ? "expired" : "invalid_code"}`);
  }

  const completeRegistration = writeDb.transaction(async () => {
    await (writeDb.prepare("UPDATE users SET is_verified = 1, otp = NULL WHERE id = ? AND is_verified = 0").run(userId));
    if (row.role === "farmer") {
      await (writeDb
        .prepare("INSERT INTO farmers (name, phone, location, role, farm_size, email, password) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(row.name, row.phone, row.location, row.role, record.farmSize, row.email, row.password));
    }
  });
  await completeRegistration();
  await createSession(row.id);
  redirect("/dashboard");
}

export async function resendVerificationAction(formData: FormData) {
  const { writeDb } = await import("@/app/lib/write-db");
  const userId = Number(formData.get("user_id"));
  if (!Number.isInteger(userId) || userId < 1) redirect("/register?error=invalid_details");

  const address = await requestAddress();
  if (!(await consumeRateLimit("resend-ip", address, 10, 60 * 60 * 1000)).allowed || !(await consumeRateLimit("resend-user", String(userId), 3, 60 * 60 * 1000)).allowed) redirect(`/verify-email?id=${userId}&error=rate_limited`);

  const row = await (writeDb
    .prepare("SELECT name, email, is_verified, otp FROM users WHERE id = ? LIMIT 1")
    .get(userId)) as { name: string; email: string; is_verified: number; otp: string | null } | undefined;
  if (!row || row.is_verified) redirect("/login");

  const previous = parseVerificationRecord(row.otp);
  if (!previous) redirect(`/verify-email?id=${userId}&error=expired`);

  const code = verificationCode();
  try {
    await sendVerificationEmail(row.email, row.name, code);
  } catch {
    redirect(`/verify-email?id=${userId}&error=email_failed`);
  }
  await (writeDb.prepare("UPDATE users SET otp = ? WHERE id = ? AND is_verified = 0").run(verificationRecord(code, previous.farmSize), userId));
  redirect(`/verify-email?id=${userId}&resent=1`);
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const returnTo = String(formData.get("return_to") ?? "");

  if (!email || !password) {
    redirect("/login?error=invalid_credentials");
  }

  const address = await requestAddress();
  const ipLimit = await consumeRateLimit("login-ip", address, 30, 15 * 60 * 1000);
  const accountLimit = await consumeRateLimit("login-account", email, 10, 15 * 60 * 1000);
  if (!ipLimit.allowed || !accountLimit.allowed) redirect("/login?error=rate_limited");

  const user = await getUserByEmail(email);
  const storedHash = user?.password ?? "";
  const compatibleHash = storedHash.startsWith("$2y$")
    ? `$2b$${storedHash.slice(4)}`
    : storedHash;
  const passwordMatches = compatibleHash
    ? await bcrypt.compare(password, compatibleHash)
    : false;

  if (!user || !passwordMatches) {
    redirect("/login?error=invalid_credentials");
  }

  if (!user.isVerified && user.hasPendingVerification) {
    redirect(`/verify-email?id=${user.id}`);
  }

  if (!(["farmer", "buyer", "admin"] as const).includes(user.role as "farmer" | "buyer" | "admin")) {
    redirect("/login?error=invalid_role");
  }

  await createSession(user.id);
  const safeReturnTo = /^\/(?!\/)/.test(returnTo) && !returnTo.includes("\\")
    ? returnTo
    : "/dashboard";
  redirect(safeReturnTo);
}

export async function logoutAction() {
  await deleteSession();
  redirect("/");
}
