"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readSession } from "@/app/lib/session";
import { getUserById } from "@/app/lib/data/users";

export async function createBookingAction(formData:FormData){
  const session=await readSession();if(!session)redirect("/login?return_to=%2Fservices");
  const user=await getUserById(session.userId);if(!user||!["buyer","farmer"].includes(user.role))redirect("/dashboard");
  const serviceId=Number(formData.get("service_id"));const quantity=Number(formData.get("quantity"));
  if(!Number.isInteger(serviceId)||serviceId<1||!Number.isInteger(quantity)||quantity<1||quantity>10000)redirect("/services?error=invalid_booking");
  const {writeDb}=await import("@/app/lib/write-db");
  const service=await (writeDb.prepare("SELECT s.*,c.id AS company_id FROM company_services s JOIN companies c ON c.id=s.company_id WHERE s.id=?").get(serviceId)) as {company_id:number;service_type:string;service_name:string;price:number}|undefined;
  if(!service)redirect("/services?error=service_unavailable");
  const total=Number(service.price)*quantity;if(!Number.isFinite(total)||total<=0)redirect("/services?error=service_unavailable");
  const result=await (writeDb.prepare("INSERT INTO bookings (user_id,service_id,company_id,service_type,service_name,quantity,total_price,status,created_at) VALUES (?,?,?,?,?,?,?,'pending',datetime('now'))")
    .run(user.id,serviceId,service.company_id,service.service_type,service.service_name,quantity,total));
  revalidatePath("/services");revalidatePath("/bookings");redirect(`/bookings/${Number(result.lastInsertRowid)}`);
}
