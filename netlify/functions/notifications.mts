import { createClient } from "@supabase/supabase-js";
import type { Context } from "@netlify/functions";

export default async (req:Request,_context:Context)=>{
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  const body=await req.json();
  const url=Netlify.env.get("SUPABASE_URL"),key=Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const sid=Netlify.env.get("TWILIO_ACCOUNT_SID"),token=Netlify.env.get("TWILIO_AUTH_TOKEN"),from=Netlify.env.get("TWILIO_FROM");
  if(!url||!key) return Response.json({error:"Supabase server credentials missing"},{status:500});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const recipients=Array.isArray(body.recipients)?body.recipients:[];
  const results=[];
  for(const r of recipients){
    const channel=r.channel||"sms", to=r.recipient;
    const log={property_id:body.property_id||null,tenant_id:r.tenant_id||null,channel,recipient:to,template:body.template||"custom",subject:body.subject||"",message:body.message||"",status:"queued"};
    if(!sid||!token||!from){ const {data}=await db.from("notification_logs").insert({...log,status:"failed",error_message:"Twilio credentials are not configured"}).select().single(); results.push(data); continue; }
    try{
      const form=new URLSearchParams({To:channel==="whatsapp"?(to.startsWith("whatsapp:")?to:"whatsapp:"+to):to,From:channel==="whatsapp"?(from.startsWith("whatsapp:")?from:"whatsapp:"+from):from,Body:body.message||""});
      const auth=Buffer.from(sid+":"+token).toString("base64");
      const res=await fetch("https://api.twilio.com/2010-04-01/Accounts/"+sid+"/Messages.json",{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/x-www-form-urlencoded"},body:form});
      const data=await res.json();
      const row={...log,status:res.ok?"sent":"failed",provider_message_id:data.sid||null,error_message:res.ok?"":(data.message||"Provider error"),sent_at:res.ok?new Date().toISOString():null};
      const {data:saved}=await db.from("notification_logs").insert(row).select().single(); results.push(saved);
    }catch(e){const {data}=await db.from("notification_logs").insert({...log,status:"failed",error_message:String(e)}).select().single();results.push(data)}
  }
  return Response.json({results});
};
