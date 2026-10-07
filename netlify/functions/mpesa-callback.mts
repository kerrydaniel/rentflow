import { createClient } from "@supabase/supabase-js";

export default async (req:Request) => {
  if(req.method!=="POST") return new Response("Method not allowed",{status:405});
  const payload=await req.json();
  const callback=payload?.Body?.stkCallback;
  if(!callback) return Response.json({ResultCode:0,ResultDesc:"Accepted"});
  const url=Netlify.env.get("SUPABASE_URL"), key=Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key) return Response.json({ResultCode:1,ResultDesc:"Server configuration error"},{status:500});
  const db=createClient(url,key,{auth:{persistSession:false}});
  const checkout=callback.CheckoutRequestID;
  const {data:tx}=await db.from("mpesa_transactions").select("*").eq("checkout_request_id",checkout).maybeSingle();
  const items=callback.CallbackMetadata?.Item||[];
  const get=(name:string)=>items.find((x:any)=>x.Name===name)?.Value;
  const success=Number(callback.ResultCode)===0;
  if(!tx) return Response.json({ResultCode:0,ResultDesc:"Accepted"});
  await db.from("mpesa_transactions").update({
    status:success?"success":"failed",result_code:Number(callback.ResultCode),result_description:callback.ResultDesc||"",
    mpesa_receipt:success?String(get("MpesaReceiptNumber")||""):null,
    amount:success?Number(get("Amount")||tx.amount):tx.amount,
    phone:success?String(get("PhoneNumber")||tx.phone):tx.phone,
    transaction_date:success?new Date(String(get("TransactionDate")||"")):null,
    raw_payload:payload,updated_at:new Date().toISOString()
  }).eq("id",tx.id);
  if(success && tx.tenant_id && tx.property_id){
    await db.rpc("allocate_payment_fifo_system",{p_property_id:tx.property_id,p_tenant_id:tx.tenant_id,p_amount:Number(get("Amount")||tx.amount),p_payment_date:new Date().toISOString().slice(0,10),p_method:"M-Pesa",p_reference:String(get("MpesaReceiptNumber")||"STK"),p_notes:"Automatic Daraja STK payment"});
  }
  return Response.json({ResultCode:0,ResultDesc:"Accepted"});
};
