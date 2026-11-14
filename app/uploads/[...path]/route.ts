import { NextResponse } from "next/server";
import { getPublicUpload } from "@/app/lib/uploads";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!path.length || path.some((part) => !/^[\w.-]+$/.test(part) || part === "." || part === "..")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const upload = await getPublicUpload("uploads/" + path.join("/"));
  if (!upload) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(upload.data, { headers: {
    "Content-Type": upload.contentType,
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
  } });
}
