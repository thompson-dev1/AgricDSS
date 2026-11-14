import { access, mkdir, open, unlink } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

function fail(message) {
  console.error("AGRIC DSS startup check failed: " + message);
  process.exit(1);
}
const secret = process.env.SESSION_SECRET || "";
if (secret.length < 32 || secret.startsWith("replace-")) fail("SESSION_SECRET must be a unique value with at least 32 characters.");
const smtpHost = process.env.SMTP_HOST || "";
const smtpUser = process.env.SMTP_USER || "";
const smtpPassword = process.env.SMTP_PASSWORD || "";
const smtpPort = Number(process.env.SMTP_PORT || 587);
if (!smtpHost || !smtpUser || !smtpPassword || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
  fail("SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD must be configured for account verification.");
}
const databasePath = process.env.AGRIC_DB_PATH || "/data/database.sqlite";
try { await access(databasePath); } catch { fail("SQLite database not found at " + databasePath + "; initialize the deployment data directory first."); }
const database = createClient({ url: pathToFileURL(path.resolve(databasePath)).href, intMode: "number" });
try {
  const check = await database.execute("PRAGMA quick_check");
  if (!check.rows.length || Object.values(check.rows[0])[0] !== "ok") fail("SQLite quick_check did not return ok.");
  const tableRows = await database.execute("SELECT name FROM sqlite_master WHERE type='table'");
  const existing = new Set(tableRows.rows.map((row) => row.name));
  const required = ["users", "products", "orders", "cart", "notifications", "messages", "buy_requests", "prices", "loans", "subscriptions", "promotions", "company_services", "companies", "inputs", "purchases", "sales", "buyer_reputation", "crops", "markets", "farmer_products", "buy_products", "buy_transactions", "peer_feedback"];
  const missing = required.filter((table) => !existing.has(table));
  if (missing.length) fail("Database schema is missing required tables: " + missing.join(", ") + ".");
  const demoAccounts = await database.execute({ sql: "SELECT email, password FROM users WHERE lower(email) IN (?, ?, ?)", args: ["kwame.farmer@example.com", "akosua.farmer@example.com", "yaw.buyer@example.com"] });
  for (const account of demoAccounts.rows) {
    if (await bcrypt.compare("password123", String(account.password || ""))) fail("A seeded demo account still uses password123. Sign in to each affected account and change its password to 12+ characters before deployment.");
  }
} catch (error) {
  fail("SQLite validation failed: " + (error instanceof Error ? error.message : "unknown error") + ".");
} finally { await database.close(); }
async function verifyWritableDirectory(directory) {
  await mkdir(directory, { recursive: true });
  const probe = path.join(directory, ".agric-write-check-" + process.pid);
  const handle = await open(probe, "wx", 0o600);
  await handle.close();
  await unlink(probe);
}
try {
  await verifyWritableDirectory(path.dirname(databasePath));
  await verifyWritableDirectory(path.join(process.cwd(), "public", "uploads"));
  await verifyWritableDirectory(path.join(process.cwd(), "private_uploads"));
  await verifyWritableDirectory(path.join(process.cwd(), ".next", "cache"));
} catch (error) {
  fail("A persistent data or cache directory is not writable by the app user: " + (error instanceof Error ? error.message : "unknown error") + ".");
}
console.log("AGRIC DSS startup checks passed.");
