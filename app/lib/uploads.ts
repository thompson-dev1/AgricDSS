import "server-only";

import { getStore } from "@netlify/blobs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const isNetlify = () => Boolean(process.env.NETLIFY || process.env.NETLIFY_SITE_ID);
const publicRoot = () => path.join(process.cwd(), "public");
const privateRoot = () => path.join(process.cwd(), "private_uploads");

function safeKey(key: string) {
  const normalized = key.replaceAll("\\", "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid upload key.");
  }
  return normalized;
}

export async function savePublicUpload(key: string, data: Uint8Array, contentType: string) {
  const safe = safeKey(key);
  if (isNetlify()) {
    const payload = new ArrayBuffer(data.byteLength);
    new Uint8Array(payload).set(data);
    await getStore("agric-public-uploads").set(safe, payload, { metadata: { contentType }, onlyIfNew: true });
    return;
  }
  const destination = path.join(publicRoot(), ...safe.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data, { flag: "wx" });
}

export async function getPublicUpload(key: string) {
  const safe = safeKey(key);
  if (isNetlify()) {
    const result = await getStore("agric-public-uploads").getWithMetadata(safe, { type: "arrayBuffer" });
    if (!result) return null;
    return { data: new Uint8Array(result.data as ArrayBuffer), contentType: String(result.metadata.contentType || "application/octet-stream") };
  }
  try {
    const data = await readFile(path.join(publicRoot(), ...safe.split("/")));
    return { data, contentType: contentTypeFor(safe) };
  } catch {
    return null;
  }
}

export async function savePrivateUpload(key: string, data: Uint8Array, contentType: string) {
  const safe = safeKey(key);
  if (isNetlify()) {
    const payload = new ArrayBuffer(data.byteLength);
    new Uint8Array(payload).set(data);
    await getStore("agric-private-documents").set(safe, payload, { metadata: { contentType }, onlyIfNew: true });
    return;
  }
  const destination = path.join(privateRoot(), ...safe.split("/"));
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, data, { flag: "wx" });
}

export async function getPrivateUpload(key: string) {
  const safe = safeKey(key);
  if (isNetlify()) {
    const result = await getStore("agric-private-documents").getWithMetadata(safe, { type: "arrayBuffer" });
    if (!result) return null;
    return { data: new Uint8Array(result.data as ArrayBuffer), contentType: String(result.metadata.contentType || "application/octet-stream") };
  }
  try {
    return { data: await readFile(path.join(privateRoot(), ...safe.split("/"))), contentType: contentTypeFor(safe) };
  } catch {
    return null;
  }
}

function contentTypeFor(key: string) {
  switch (path.extname(key).toLowerCase()) {
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".png": return "image/png";
    case ".webp": return "image/webp";
    case ".gif": return "image/gif";
    case ".pdf": return "application/pdf";
    default: return "application/octet-stream";
  }
}
