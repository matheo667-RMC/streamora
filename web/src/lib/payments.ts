import Stripe from "stripe";
import { prisma } from "./prisma";
import { grantPlan, generateKeyCode, PLAN_DAYS, PlanTier } from "./subscription";

export function stripeSecret(): string {
  return process.env.STRIPE_SECRET_KEY || "";
}
export function stripeWebhookSecret(): string {
  return process.env.STRIPE_WEBHOOK_SECRET || "";
}
export function paymentsEnabled(): boolean {
  return !!stripeSecret();
}

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(stripeSecret());
  return _stripe;
}

export const PLAN_LABELS: Record<string, string> = {
  month1: "Streamora — 1 mois",
  month2: "Streamora — 2 mois",
  month6: "Streamora — 6 mois",
  lifetime: "Streamora — À vie",
};

// Creates a Stripe Checkout session (card, Bancontact, Revolut, etc. per dashboard).
export async function createCheckoutSession(params: {
  priceEur: number;
  planTier: string;
  orderId: string;
}): Promise<{ id: string; url: string }> {
  if (!paymentsEnabled()) throw new Error("Paiement non configuré");
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://streamora-films.vercel.app";
  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(params.priceEur * 100),
          product_data: { name: PLAN_LABELS[params.planTier] || "Streamora" },
        },
      },
    ],
    metadata: { orderId: params.orderId },
    success_url: `${base}/payer?paid=1&order=${params.orderId}`,
    cancel_url: `${base}/payer?canceled=1`,
  });
  return { id: session.id, url: session.url || "" };
}

export async function getSessionStatus(sessionId: string): Promise<string> {
  const s = await stripe().checkout.sessions.retrieve(sessionId);
  // "paid" | "unpaid" | "no_payment_required"
  return String(s.payment_status || "");
}

// Idempotently deliver a paid order: generate a key and grant the plan.
export async function deliverOrder(sessionId: string, paid: boolean): Promise<void> {
  const order = await prisma.order.findUnique({ where: { paymentId: sessionId } });
  if (!order) return;
  const status = paid ? "paid" : order.status;
  if (order.status !== status) {
    await prisma.order.update({ where: { paymentId: sessionId }, data: { status } });
  }
  if (!paid || order.delivered) return;

  const tier = order.planTier as Exclude<PlanTier, "free">;
  const code = generateKeyCode();
  await prisma.redeemKey.create({
    data: {
      code,
      planTier: tier,
      durationDays: PLAN_DAYS[tier] ?? 30,
      used: true,
      usedById: order.userId,
      usedAt: new Date(),
      note: `Achat auto ${sessionId}`,
    },
  });
  await grantPlan(order.userId, tier);
  await prisma.order.update({
    where: { paymentId: sessionId },
    data: { delivered: true, keyCode: code, status: "paid" },
  });
}
