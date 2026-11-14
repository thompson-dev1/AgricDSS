"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getUserById } from "@/app/lib/data/users";
import { readSession } from "@/app/lib/session";

export async function listCropForSaleAction(formData: FormData) {
  const session = await readSession();
  if (!session) redirect("/login?return_to=%2Ffarmer%2Fsell");
  const user = await getUserById(session.userId);
  if (!user || user.role !== "farmer") redirect("/dashboard");
  const cropId = Number(formData.get("crop_id"));
  const marketId = Number(formData.get("market_id"));
  const quantity = Number(formData.get("quantity"));
  const price = Number(formData.get("expected_price"));
  if (![cropId,marketId].every((n)=>Number.isInteger(n)&&n>0) || !Number.isFinite(quantity) || quantity<=0 || quantity>1_000_000 || !Number.isFinite(price) || price<=0 || price>100_000_000) redirect("/farmer/sell?error=invalid");
  const { writeDb } = await import("@/app/lib/write-db");
  const crop = await (writeDb.prepare("SELECT id FROM crops WHERE id=?").get(cropId));
  const market = await (writeDb.prepare("SELECT id FROM markets WHERE id=?").get(marketId));
  if (!crop || !market) redirect("/farmer/sell?error=invalid");
  await (writeDb.prepare("INSERT INTO farmer_products (user_id,crop_id,market_id,quantity,expected_price,status) VALUES (?,?,?,?,?,'Available')").run(user.id,cropId,marketId,quantity,price));
  revalidatePath("/farmer/sell"); revalidatePath("/market");
  redirect("/farmer/sell?listed=1");
}
