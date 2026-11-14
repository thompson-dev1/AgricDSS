import path from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@libsql/client";

const sourcePath = path.resolve(process.argv[2] || process.env.AGRIC_DB_PATH || "../database.sqlite");
const targetUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!targetUrl || !authToken) {
  console.error("Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN before running this one-time migration.");
  process.exit(1);
}
const source = createClient({ url: pathToFileURL(sourcePath).href, intMode: "number" });
const target = createClient({ url: targetUrl, authToken, intMode: "number" });
try {
  const currentTables = await target.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (currentTables.rows.length) throw new Error("The Turso database is not empty. Choose a new empty database before migrating to avoid overwriting data.");
  const objects = await source.execute("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'trigger' THEN 2 ELSE 3 END");
  const tables = objects.rows.filter((row) => row.type === "table");
  const indexesAndTriggers = objects.rows.filter((row) => row.type === "index" || row.type === "trigger");
  await target.execute("PRAGMA foreign_keys = OFF");
  for (const object of tables) await target.execute(String(object.sql));
  let copied = 0;
  for (const table of tables) {
    const tableName = String(table.name);
    const columns = await source.execute("PRAGMA table_info(" + JSON.stringify(tableName) + ")");
    const names = columns.rows.map((column) => String(column.name));
    if (!names.length) continue;
    const records = await source.execute("SELECT * FROM " + JSON.stringify(tableName));
    for (let offset = 0; offset < records.rows.length; offset += 100) {
      const batch = records.rows.slice(offset, offset + 100).map((record) => ({
        sql: "INSERT INTO " + JSON.stringify(tableName) + " (" + names.map((name) => JSON.stringify(name)).join(",") + ") VALUES (" + names.map(() => "?").join(",") + ")",
        args: names.map((name) => record[name]),
      }));
      await target.batch(batch, "write");
      copied += batch.length;
    }
    console.log("Copied " + records.rows.length + " rows from " + tableName);
  }
  try {
    const sequences = await source.execute("SELECT name, seq FROM sqlite_sequence");
    if (sequences.rows.length) {
      await target.execute("DELETE FROM sqlite_sequence");
      await target.batch(sequences.rows.map((row) => ({ sql: "INSERT INTO sqlite_sequence (name, seq) VALUES (?, ?)", args: [row.name, row.seq] })), "write");
    }
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("no such table")) throw error;
  }
  for (const object of indexesAndTriggers) await target.execute(String(object.sql));
  console.log("Migration complete: " + tables.length + " tables and " + copied + " rows copied from " + sourcePath + ".");
} finally { await Promise.all([source.close(), target.close()]); }
