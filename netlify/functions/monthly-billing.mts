import { createClient } from "@supabase/supabase-js";
import type { Config } from "@netlify/functions";

export default async () => {
  const url = Netlify.env.get("SUPABASE_URL");
  const key = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return new Response("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY", {status:500});
  const db = createClient(url, key, {auth:{persistSession:false}});
  const {data: properties, error} = await db.from("properties").select("id");
  if (error) return Response.json({error:error.message},{status:500});
  const results = [];
  const month = new Date().toISOString().slice(0,7)+"-01";
  for (const property of properties ?? []) {
    const {data, error: e} = await db.rpc("generate_monthly_invoices_for_cron",{p_property_id:property.id,p_billing_month:month});
    results.push({property_id:property.id,result:data,error:e?.message??null});
  }
  return Response.json({month,results});
};

export const config: Config = { schedule: "5 0 1 * *" };
