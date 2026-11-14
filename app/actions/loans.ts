"use server";

import { randomUUID } from "node:crypto";
import { savePrivateUpload } from "@/app/lib/uploads";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

function imageExt(data: Buffer) { if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return ".jpg"; if (data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ".png"; return null; }

export async function applyForLoanAction(formData: FormData) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Floans");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const amount = Number(formData.get("amount")); const months = Number(formData.get("repayment_term")); const cardNumber = String(formData.get("ghana_card_number") || "").trim();
  const selectedPurpose = String(formData.get("purpose") || ""); const customPurpose = String(formData.get("custom_purpose") || "").trim(); const purpose = selectedPurpose === "Other" ? customPurpose : selectedPurpose;
  const allowedPurposes = new Set(["Buy Seeds", "Fertilizers & Chemicals", "Farm Equipment", "Land Preparation", "Livestock Farming"]);
  if (!Number.isFinite(amount) || amount < 100 || amount > 100_000_000 || ![1,3,6,12,24].includes(months) || cardNumber.length < 5 || cardNumber.length > 30 || !(allowedPurposes.has(selectedPurpose) || (selectedPurpose === "Other" && customPurpose)) || purpose.length > 120 || formData.get("agree") !== "yes") redirect("/farmer/loans?error=invalid_application");
  const upload = formData.get("ghana_card_image"); if (!(upload instanceof File) || upload.size < 1 || upload.size > 2_000_000) redirect("/farmer/loans?error=invalid_image");
  const bytes = Buffer.from(await upload.arrayBuffer()); const ext = imageExt(bytes); if (!ext) redirect("/farmer/loans?error=invalid_image");
  const filename = `loan_${user.id}_${randomUUID()}${ext}`;
  await savePrivateUpload(`loan-documents/${filename}`, bytes, ext === ".png" ? "image/png" : "image/jpeg");
  const { writeDb } = await import("@/app/lib/write-db");
  const trust = await (writeDb.prepare("SELECT score FROM buyer_reputation WHERE buyer_id=? ORDER BY id DESC LIMIT 1").get(user.id)) as { score: number } | undefined;
  const score = trust?.score ?? null; const rate = score === null || score < 40 ? 5 : score < 80 ? 3.5 : 2;
  const term = `${months} Months`;
  const add = writeDb.transaction(async () => {
    const result = await (writeDb.prepare("INSERT INTO loans (user_id,company_id,amount,purpose,repayment_term,status,ghana_card_number,ghana_card_image,interest_rate) VALUES (?,0,?,?,?,'Pending',?,?,?)")
      .run(user.id, amount, purpose, term, cardNumber, filename, rate));
    const id = Number(result.lastInsertRowid);
    await (writeDb.prepare("INSERT INTO notifications (user_id,message) VALUES (0,?)").run(`New loan request #${id}: user #${user.id} requested GHS ${amount.toFixed(2)} for ${term}.`));
  });
  await add(); revalidatePath("/farmer/loans"); revalidatePath("/admin?tab=loans"); redirect("/farmer/loans?success=1");
}

export async function withdrawLoanAction(formData: FormData) {
  const session = await readSession(); if (!session) redirect("/login?return_to=%2Ffarmer%2Floans");
  const user = await getUserById(session.userId); if (!user || user.role !== "farmer") redirect("/dashboard");
  const id = Number(formData.get("loan_id")); if (!Number.isInteger(id) || id < 1) redirect("/farmer/loans");
  const { writeDb } = await import("@/app/lib/write-db");
  await (writeDb.prepare("DELETE FROM loans WHERE id=? AND user_id=? AND lower(status)='pending'").run(id, user.id));
  revalidatePath("/farmer/loans"); revalidatePath("/admin"); redirect("/farmer/loans?withdrawn=1");
}
