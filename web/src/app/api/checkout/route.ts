import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createNpPayment, PAY_CURRENCIES, npApiKey } from "@/lib/payments";
import { PlanTier } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const PLAN_PRICE_FIELD: Record<string, string> = {
  month1: "priceMonth1",
  month2: "priceMonth2",
  month6: "priceMonth6",
  lifetime: "priceLifetime",
};

// Creates a crypto payment and returns the address + amount to pay on-site.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  if (!npApiKey()) return NextResponse.json({ error: "Paiement non configuré" }, { status: 503 });

  const { planTier, payCurrency } = await req.json().catch(() => ({}));
  const tier = planTier as PlanTier;
  if (!["month1", "month2", "month6", "lifetime"].includes(tier)) {
    return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
  }
  const coin = PAY_CURRENCIES.find((c) => c.id === payCurrency || c.np === payCurrency);
  if (!coin) return NextResponse.json({ error: "Crypto invalide" }, { status: 400 });

  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  const priceEur = Number((settings as unknown as Record<string, number>)?.[PLAN_PRICE_FIELD[tier]] ?? 0) || 0;
  if (priceEur <= 0) return NextResponse.json({ error: "Prix non défini" }, { status: 400 });

  // Pre-create order id so NOWPayments references it.
  const order = await prisma.order.create({
    data: { userId: session.user.id, planTier: tier, priceEur, payCurrency: coin.np, paymentId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
  });

  try {
    const np = await createNpPayment({ priceEur, payCurrency: coin.np, orderId: order.id });
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentId: String(np.payment_id),
        payAddress: np.pay_address,
        payAmount: String(np.pay_amount),
        status: np.payment_status || "waiting",
      },
    });
    return NextResponse.json({
      paymentId: updated.paymentId,
      payAddress: updated.payAddress,
      payAmount: updated.payAmount,
      payCurrency: coin.label,
      priceEur,
    });
  } catch (e) {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur paiement" }, { status: 502 });
  }
}
