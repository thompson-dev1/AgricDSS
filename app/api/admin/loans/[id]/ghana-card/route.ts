import path from "node:path";
import { getPrivateUpload } from "@/app/lib/uploads";
import { NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context){const session=await readSession();if(!session)return new NextResponse("Unauthorized",{status:401});const user=await getUserById(session.userId);if(!user||user.role!=="admin")return new NextResponse("Forbidden",{status:403});const {id:raw}=await params;const id=Number(raw);if(!Number.isInteger(id)||id<1)return new NextResponse("Not found",{status:404});const row=await (db.prepare("SELECT ghana_card_image FROM loans WHERE id=?").get(id)) as {ghana_card_image:string|null}|undefined;if(!row?.ghana_card_image)return new NextResponse("Not found",{status:404});const filename=path.basename(row.ghana_card_image);if(filename!==row.ghana_card_image||! /^[\w .-]+\.(jpg|png)$/i.test(filename))return new NextResponse("Not found",{status:404});const upload=await getPrivateUpload(`loan-documents/${filename}`);if(!upload)return new NextResponse("Not found",{status:404});return new NextResponse(upload.data,{headers:{"Content-Type":upload.contentType,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});}
