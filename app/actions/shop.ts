"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

export async function buyInputAction(formData:FormData){
  const session=await readSession();if(!session)redirect("/login?return_to=%2Fshop");const user=await getUserById(session.userId);if(!user||user.role!=="farmer")redirect("/dashboard");
  const inputId=Number(formData.get("input_id"));const quantity=Number(formData.get("quantity"));if(!Number.isInteger(inputId)||inputId<1||!Number.isInteger(quantity)||quantity<1||quantity>100000)redirect("/shop?error=invalid_quantity");
  const {writeDb}=await import("@/app/lib/write-db");
  const purchase=writeDb.transaction(async ()=>{const input=await (writeDb.prepare("SELECT id,price,stock FROM inputs WHERE id=?").get(inputId)) as {id:number;price:number;stock:number}|undefined;if(!input||input.stock<quantity)return false;const total=Number(input.price)*quantity;const updated=await (writeDb.prepare("UPDATE inputs SET stock=stock-? WHERE id=? AND stock>=?").run(quantity,inputId,quantity));if(!updated.changes)return false;await (writeDb.prepare("INSERT INTO purchases (farmer_id,input_id,quantity,total_price,date) VALUES (?,?,?,?,datetime('now'))").run(user.id,inputId,quantity,total));return true;});
  if(!purchase)redirect("/shop?error=not_enough_stock");revalidatePath("/shop");redirect("/shop?purchased=1");
}
