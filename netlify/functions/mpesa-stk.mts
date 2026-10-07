import { createClient } from "@supabase/supabase-js";
import type { Context } from "@netlify/functions";

function normalizePhone(input:string){
  const s=input.replace(/\\D/g,"");
  if(s.startsWith("254")) return s;
  if(s.startsWith("0")) return "254"+s.slice(1);
  if(s.startsWith("7")||s.startsWith("1")) return "254"+s;
  return s;
}

export default async (req:Request, _context:Context) => {
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  const body = await req.json();
  const url=Netlify.env.get("SUPABASE_URL"), key=Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const consumerKey=Netlify.env.get("MPESA_CONSUMER_KEY"), consumerSecret=Netlify.env.get("MPESA_CONSUMER_SECRET");
  const shortcode=Netlify.env.get("MPESA_SHORTCODE"), passkey=Netlify.env.get("MPESA_PASSKEY");
  const callbackUrl=Netlify.env.get("MPESA_CALLBACK_URL");
  const environment=Netlify.env.get("MPESA_ENVIRONMENT")||"sandbox";
  if(!url||!key||!consumerKey||!consumerSecret||!shortcode||!passkey||!callbackUrl)
    return Response.json({error:"M-Pesa integration is not configured. Add Daraja credentials to Netlify environment variables."},{status:503});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const {data:tenant,error:te}=await db.from("tenants").select("id,property_id,full_name,phone").eq("id",body.tenant_id).single();
  if(te||!tenant) return Response.json({error:"Tenant not found"},{status:404});
  const phone=normalizePhone(body.phone||tenant.phone);
  if(!/^254[17]\\d{8}$/.test(phone)) return Response.json({error:"Use a valid Kenyan M-Pesa number."},{status:400});
  const base=environment==="production"?"https://api.safaricom.co.ke":"https://sandbox.safaricom.co.ke";
  const auth=Buffer.from(consumerKey+":"+consumerSecret).toString("base64");
  const tokenRes=await fetch(base+"/oauth/v1/generate?grant_type=client_credentials",{headers:{Authorization:"Basic "+auth}});
  const tokenJson=await tokenRes.json();
  if(!tokenRes.ok||!tokenJson.access_token) return Response.json({error:"Could not obtain M-Pesa access token",detail:tokenJson},{status:502});
  const now=new Date();
  const timestamp=now.toISOString().replace(/[-:TZ.]/g,"").slice(0,14);
  const password=Buffer.from(shortcode+passkey+timestamp).toString("base64");
  const stkBody={BusinessShortCode:shortcode,Password:password,Timestamp:timestamp,TransactionType:"CustomerPayBillOnline",Amount:Math.round(Number(body.amount)),PartyA:phone,PartyB:shortcode,PhoneNumber:phone,CallBackURL:callbackUrl,AccountReference:String(body.invoice_number||tenant.id).slice(0,12),TransactionDesc:"RentFlow rent payment"};
  const res=await fetch(base+"/mpesa/stkpush/v1/processrequest",{method:"POST",headers:{Authorization:"Bearer "+tokenJson.access_token,"Content-Type":"application/json"},body:JSON.stringify(stkBody)});
  const data=await res.json();
  await db.from("mpesa_transactions").insert({property_id:tenant.property_id,tenant_id:tenant.id,checkout_request_id:data.CheckoutRequestID||null,merchant_request_id:data.MerchantRequestID||null,phone,amount:Number(body.amount),status:data.ResponseCode==="0"?"pending":"failed",result_code:data.ResponseCode?Number(data.ResponseCode):null,result_description:data.ResponseDescription||""});
  if(!res.ok||data.ResponseCode!=="0") return Response.json({error:data.ResponseDescription||"STK Push failed",data},{status:502});
  return Response.json({success:true,checkout_request_id:data.CheckoutRequestID,customer_message:data.CustomerMessage});
};
