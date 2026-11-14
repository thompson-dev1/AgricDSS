import "server-only";
import { db } from "@/app/lib/db";
export type FarmService = { id: number; companyId: number; companyName: string; location: string; phone: string; type: string; name: string; price: number; description: string; image: string | null };
export async function getServices(category = ""): Promise<FarmService[]> {
  const rows = await (db.prepare(`SELECT s.id,s.company_id,c.name AS company_name,c.location,c.phone,s.service_type,s.service_name,s.price,s.description,s.image
    FROM company_services s JOIN companies c ON c.id=s.company_id WHERE (?='' OR s.service_type=?) ORDER BY s.price ASC`).all(category, category)) as Array<{
      id:number;company_id:number;company_name:string|null;location:string|null;phone:string|null;service_type:string|null;service_name:string|null;price:number|null;description:string|null;image:string|null;
    }>;
  return rows.map((r)=>({id:r.id,companyId:r.company_id,companyName:r.company_name||"Service Provider",location:r.location||"Location unavailable",phone:r.phone||"",type:r.service_type||"service",name:r.service_name||"Farm service",price:Number(r.price||0),description:r.description||"",image:r.image}));
}
export async function getService(id:number):Promise<FarmService|null>{return (await getServices("")).find((service)=>service.id===id)||null;}
