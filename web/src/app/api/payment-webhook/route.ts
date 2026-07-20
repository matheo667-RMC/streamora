import { NextRequest, NextResponse } from "next/server";
import { stripe, stripeWebhookSecret, deliverOrder } from "@/lib/payments";

export const dynamic = "force-dynamic";

// Stripe webhook: delivers the key automatically once the checkout is paid.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sig = req.headers.get("stripe-signature") || "";
  const secret = stripeWebhookSecret();
  if (!secret) return NextResponse.json({ error: "non configuré" }, { status: 503 });

  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "signature invalide" }, { status: 401 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as { id: string; payment_status?: string };
    await deliverOrder(session.id, session.payment_status === "paid" || session.payment_status === "no_payment_required");
  }

  return NextResponse.json({ received: true });
}
