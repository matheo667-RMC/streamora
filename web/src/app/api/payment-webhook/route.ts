import { NextRequest, NextResponse } from "next/server";
import { verifyIpnSignature, deliverOrder } from "@/lib/payments";

export const dynamic = "force-dynamic";

// NOWPayments IPN callback: delivers the key automatically once paid.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-nowpayments-sig");
  if (!verifyIpnSignature(raw, signature)) {
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }
  let body: { payment_id?: string | number; payment_status?: string };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "json invalide" }, { status: 400 });
  }
  if (body.payment_id && body.payment_status) {
    await deliverOrder(String(body.payment_id), body.payment_status);
  }
  return NextResponse.json({ ok: true });
}
