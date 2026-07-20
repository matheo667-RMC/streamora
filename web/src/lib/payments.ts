import { prisma } from "./prisma";
import { grantPlan, revokePlan, generateKeyCode, PLAN_DAYS, PlanTier } from "./subscription";

// ---- PayPal configuration -------------------------------------------------

export function paypalClientId(): string {
  return process.env.PAYPAL_CLIENT_ID || "";
}
function paypalSecret(): string {
  return process.env.PAYPAL_CLIENT_SECRET || "";
}
export function paypalWebhookId(): string {
  return process.env.PAYPAL_WEBHOOK_ID || "";
}
export function paymentsEnabled(): boolean {
  return !!(paypalClientId() && paypalSecret());
}
function apiBase(): string {
  return (process.env.PAYPAL_MODE || "live").toLowerCase() === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}
function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://streamora-films.vercel.app";
}

export const PLAN_LABELS: Record<string, string> = {
  month1: "Streamora — 1 mois",
  month2: "Streamora — 2 mois",
  month6: "Streamora — 6 mois",
  lifetime: "Streamora — À vie",
};

async function accessToken(): Promise<string> {
  const auth = Buffer.from(`${paypalClientId()}:${paypalSecret()}`).toString("base64");
  const res = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error("PayPal auth échouée");
  const j = (await res.json()) as { access_token: string };
  return j.access_token;
}

interface PaypalLink {
  href: string;
  rel: string;
}

// Create a PayPal order and return the approval URL to redirect the buyer to.
export async function createPaypalOrder(params: {
  priceEur: number;
  planTier: string;
  orderId: string;
}): Promise<{ id: string; url: string }> {
  if (!paymentsEnabled()) throw new Error("Paiement non configuré");
  const token = await accessToken();
  const base = siteUrl();
  const res = await fetch(`${apiBase()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: params.orderId,
          description: PLAN_LABELS[params.planTier] || "Streamora",
          amount: { currency_code: "EUR", value: params.priceEur.toFixed(2) },
        },
      ],
      application_context: {
        brand_name: "Streamora",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
        return_url: `${base}/payer?paid=1&order=${params.orderId}`,
        cancel_url: `${base}/payer?canceled=1`,
      },
    }),
  });
  const j = (await res.json()) as { id?: string; links?: PaypalLink[]; message?: string };
  if (!res.ok || !j.id) throw new Error(j.message || "Création commande PayPal échouée");
  const approve = (j.links || []).find((l) => l.rel === "approve" || l.rel === "payer-action");
  return { id: j.id, url: approve?.href || "" };
}

export async function getOrderStatus(paypalOrderId: string): Promise<string> {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${paypalOrderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const j = (await res.json()) as { status?: string };
  return String(j.status || ""); // CREATED | APPROVED | COMPLETED | VOIDED
}

interface CaptureResource {
  status?: string;
  purchase_units?: {
    payments?: { captures?: { id: string; status: string }[] };
  }[];
}

// Capture an approved PayPal order. Returns whether it is now paid and the capture id.
export async function captureOrder(
  paypalOrderId: string
): Promise<{ paid: boolean; captureId: string }> {
  const token = await accessToken();
  const res = await fetch(`${apiBase()}/v2/checkout/orders/${paypalOrderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const j = (await res.json().catch(() => ({}))) as CaptureResource & { name?: string };
  const capture = j.purchase_units?.[0]?.payments?.captures?.[0];
  if (j.status === "COMPLETED" && capture) {
    return { paid: capture.status === "COMPLETED", captureId: capture.id };
  }
  // Already captured earlier (ORDER_ALREADY_CAPTURED) — fall back to a status read.
  const status = await getOrderStatus(paypalOrderId);
  return { paid: status === "COMPLETED", captureId: capture?.id || "" };
}

// Verify a PayPal webhook signature server-side.
export async function verifyWebhook(
  headers: Record<string, string>,
  rawBody: string
): Promise<boolean> {
  const webhookId = paypalWebhookId();
  if (!webhookId) return false;
  const token = await accessToken();
  const res = await fetch(`${apiBase()}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { verification_status?: string };
  return j.verification_status === "SUCCESS";
}

// Idempotently deliver a paid order: generate a key and grant the plan.
export async function deliverOrder(
  paypalOrderId: string,
  paid: boolean,
  captureId?: string
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { paymentId: paypalOrderId } });
  if (!order) return;

  if (paid && order.status !== "paid") {
    await prisma.order.update({
      where: { paymentId: paypalOrderId },
      data: { status: "paid", payAddress: captureId || order.payAddress },
    });
  }
  if (!paid) return;

  // Atomically claim delivery so concurrent calls can't hand out two keys.
  const claim = await prisma.order.updateMany({
    where: { paymentId: paypalOrderId, delivered: false },
    data: { delivered: true },
  });
  if (claim.count === 0) return; // already delivered

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
      note: `Achat auto PayPal ${paypalOrderId}`,
    },
  });
  await grantPlan(order.userId, tier);
  await prisma.order.update({
    where: { paymentId: paypalOrderId },
    data: { keyCode: code, status: "paid" },
  });
}

// A refund was issued → cut the subscription and disable the delivered key.
export async function revokeByCaptureId(captureId: string): Promise<void> {
  if (!captureId) return;
  const order = await prisma.order.findFirst({ where: { payAddress: captureId } });
  if (!order) return;
  await handleRefundForOrder(order.id);
}

export async function revokeByPaypalOrderId(paypalOrderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { paymentId: paypalOrderId } });
  if (!order) return;
  await handleRefundForOrder(order.id);
}

async function handleRefundForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "refunded") return;
  await prisma.order.update({ where: { id: order.id }, data: { status: "refunded" } });
  // Disable the key that was handed out for this order.
  if (order.keyCode) {
    await prisma.redeemKey
      .updateMany({
        where: { code: order.keyCode },
        data: { used: true, note: `Remboursé — accès révoqué (${order.paymentId})` },
      })
      .catch(() => {});
  }
  await revokePlan(order.userId);
}
