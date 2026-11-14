import { getStore } from "@netlify/blobs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_AUTH_TOKEN;
if (!siteID || !token) {
  console.error("Set NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN using a Netlify personal access token before migrating uploads.");
  process.exit(1);
}
const publicStore = getStore({ name: "agric-public-uploads", siteID, token });
const privateStore = getStore({ name: "agric-private-documents", siteID, token });
const mime = (filename) => ({ ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".pdf": "application/pdf" }[path.extname(filename).toLowerCase()] || "application/octet-stream");
const databasePath = path.resolve(process.argv[2] || process.env.AGRIC_DB_PATH || "../database.sqlite");
const database = createClient({ url: pathToFileURL(databasePath).href, intMode: "number" });
const privateRows = await database.execute("SELECT DISTINCT ghana_card_image FROM loans WHERE ghana_card_image IS NOT NULL AND ghana_card_image != ''");
await database.close();
const privateNames = new Set(privateRows.rows.map((row) => path.basename(String(row.ghana_card_image))));

async function uploadDirectory(root, prefix, store, excludedNames = new Set()) {
  let count = 0;
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(fullPath);
      else {
        if (excludedNames.has(entry.name)) continue;
        const key = path.relative(root, fullPath).split(path.sep).join("/");
        const data = await readFile(fullPath);
        await store.set(prefix + key, data, { metadata: { contentType: mime(fullPath) } });
        count += 1;
      }
    }
  }
  try { await visit(root); } catch (error) { if (error.code !== "ENOENT") throw error; }
  return count;
}
async function uploadPrivateLoanDocuments(root) {
  let count = 0;
  for (const filename of privateNames) {
    if (path.basename(filename) !== filename || !/^[\w .-]+\.(jpg|png)$/i.test(filename)) throw new Error("Unsafe legacy loan document name in database.");
    let data;
    for (const directory of [path.resolve(root), path.resolve("private_uploads/loan-documents")]) {
      try { data = await readFile(path.join(directory, filename)); break; } catch (error) { if (error.code !== "ENOENT") throw error; }
    }
    if (!data) throw new Error("Loan identity file was not found in the legacy or private upload folders: " + filename);
    await privateStore.set("loan-documents/" + filename, data, { metadata: { contentType: mime(filename) } });
    count += 1;
  }
  return count;
}
const privateCount = await uploadPrivateLoanDocuments(path.resolve("../uploads"));
const legacyPublicCount = await uploadDirectory(path.resolve("../uploads"), "uploads/", publicStore, privateNames);
const publicCount = await uploadDirectory(path.resolve("public/uploads"), "uploads/", publicStore, privateNames);
console.log("Uploaded " + (legacyPublicCount + publicCount) + " public files and " + privateCount + " private loan documents to Netlify Blobs.");
