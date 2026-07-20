import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhook,
  paypalWebhookId,
  deliverOrder,
  revokeByCaptureId,
  revokeByPaypalOrderId,
} from "@/lib/payments";

export const dynamic = "force-dynamic";

interface PaypalEvent {
  event_type?: string;
  resource?: {
    id?: string;
    custom_id?: string;
    status?: string;
    supplementary_data?: { related_ids?: { order_id?: string } };
    links?: { href: string; rel: string }[];
  };
}

// PayPal webhook: backup key delivery on capture, and revokes access on refund.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!paypalWebhookId()) return NextResponse.json({ error: "non configuré" }, { status: 503 });

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));

  const ok = await verifyWebhook(headers, raw).catch(() => false);
  if (!ok) return NextResponse.json({ error: "signature invalide" }, { status: 401 });

  const event = JSON.parse(raw) as PaypalEvent;
  const type = event.event_type || "";
  const resource = event.resource || {};

  if (type === "PAYMENT.CAPTURE.COMPLETED") {
    // Funds captured → deliver. The PayPal order id is in related_ids.
    const orderId = resource.supplementary_data?.related_ids?.order_id || "";
    if (orderId) await deliverOrder(orderId, true, resource.id);
  } else if (type === "PAYMENT.CAPTURE.REFUNDED" || type === "PAYMENT.CAPTURE.REVERSED") {
    // Refund resource points "up" to the refunded capture id.
    const up = (resource.links || []).find((l) => l.rel === "up");
    const captureId = up?.href?.split("/").pop() || "";
    if (captureId) await revokeByCaptureId(captureId);
    // Fallback: some payloads carry the order id in custom_id.
    if (resource.custom_id) await revokeByPaypalOrderId(resource.custom_id).catch(() => {});
  }

  return NextResponse.json({ received: true });
}
