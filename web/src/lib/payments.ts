import crypto from "crypto";
import { prisma } from "./prisma";
import { grantPlan, generateKeyCode, PLAN_DAYS, PlanTier } from "./subscription";

const NP_API = "https://api.nowpayments.io/v1";

export function npApiKey(): string {
  return process.env.NOWPAYMENTS_API_KEY || "";
}
export function npIpnSecret(): string {
  return process.env.NOWPAYMENTS_IPN_SECRET || "";
}

// Supported coins mapped to NOWPayments currency codes.
export const PAY_CURRENCIES: { id: string; label: string; np: string }[] = [
  { id: "btc", label: "Bitcoin (BTC)", np: "btc" },
  { id: "eth", label: "Ethereum (ETH)", np: "eth" },
  { id: "usdt", label: "USDT (TRC20)", np: "usdttrc20" },
  { id: "ltc", label: "Litecoin (LTC)", np: "ltc" },
  { id: "trx", label: "Tron (TRX)", np: "trx" },
  { id: "sol", label: "Solana (SOL)", np: "sol" },
];

export interface NpPayment {
  payment_id: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  payment_status: string;
}

export async function createNpPayment(params: {
  priceEur: number;
  payCurrency: string;
  orderId: string;
}): Promise<NpPayment> {
  const key = npApiKey();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY manquant");
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://streamora-films.vercel.app";
  const res = await fetch(`${NP_API}/payment`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: params.priceEur,
      price_currency: "eur",
      pay_currency: params.payCurrency,
      order_id: params.orderId,
      order_description: `Streamora ${params.orderId}`,
      ipn_callback_url: `${base}/api/payment-webhook`,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`NOWPayments erreur ${res.status}: ${t}`);
  }
  return res.json();
}

export async function getNpPaymentStatus(paymentId: string): Promise<string> {
  const key = npApiKey();
  if (!key) throw new Error("NOWPAYMENTS_API_KEY manquant");
  const res = await fetch(`${NP_API}/payment/${paymentId}`, {
    headers: { "x-api-key": key },
  });
  if (!res.ok) throw new Error(`NOWPayments status ${res.status}`);
  const data = await res.json();
  return data.payment_status as string;
}

// Verify NOWPayments IPN HMAC signature (sorted JSON body).
export function verifyIpnSignature(rawBody: string, signature: string | null): boolean {
  const secret = npIpnSecret();
  if (!secret || !signature) return false;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return false;
  }
  const sorted = sortObject(parsed);
  const hmac = crypto.createHmac("sha512", secret);
  hmac.update(JSON.stringify(sorted));
  const digest = hmac.digest("hex");
  return digest === signature;
}

function sortObject(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(sortObject);
  if (obj && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>)
      .sort()
      .reduce((acc: Record<string, unknown>, k) => {
        acc[k] = sortObject((obj as Record<string, unknown>)[k]);
        return acc;
      }, {});
  }
  return obj;
}

// Idempotently deliver a paid order: generate a key and grant the plan.
export async function deliverOrder(paymentId: string, status: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { paymentId } });
  if (!order) return;
  if (order.status !== status) {
    await prisma.order.update({ where: { paymentId }, data: { status } });
  }
  const paid = status === "finished" || status === "confirmed";
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
      note: `Achat auto ${paymentId}`,
    },
  });
  await grantPlan(order.userId, tier);
  await prisma.order.update({
    where: { paymentId },
    data: { delivered: true, keyCode: code, status },
  });
}
