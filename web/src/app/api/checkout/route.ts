import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createPaypalOrder, paymentsEnabled } from "@/lib/payments";
import { PlanTier } from "@/lib/subscription";

export const dynamic = "force-dynamic";

const PLAN_PRICE_FIELD: Record<string, string> = {
  month1: "priceMonth1",
  month2: "priceMonth2",
  month6: "priceMonth6",
  lifetime: "priceLifetime",
};

// Creates a PayPal order and returns its approval URL.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  if (!paymentsEnabled()) return NextResponse.json({ error: "Paiement non configuré" }, { status: 503 });

  const { planTier } = await req.json().catch(() => ({}));
  const tier = planTier as PlanTier;
  if (!["month1", "month2", "month6", "lifetime"].includes(tier)) {
    return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
  }

  const settings = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  const priceEur = Number((settings as unknown as Record<string, number>)?.[PLAN_PRICE_FIELD[tier]] ?? 0) || 0;
  if (priceEur <= 0) return NextResponse.json({ error: "Prix non défini" }, { status: 400 });

  const order = await prisma.order.create({
    data: { userId: session.user.id, planTier: tier, priceEur, payCurrency: "eur", paymentId: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
  });

  try {
    const pp = await createPaypalOrder({ priceEur, planTier: tier, orderId: order.id });
    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { paymentId: pp.id, status: "waiting" },
    });
    return NextResponse.json({ orderId: order.id, paymentId: updated.paymentId, checkoutUrl: pp.url, priceEur });
  } catch (e) {
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    return NextResponse.json({ error: e instanceof Error ? e.message : "Erreur paiement" }, { status: 502 });
  }
}
