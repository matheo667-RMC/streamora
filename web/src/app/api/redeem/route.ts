import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { grantPlan, PLAN_LABELS, PlanTier } from "@/lib/subscription";

// Redeem a Streamora-XXXX key for the signed-in user.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Connecte-toi pour utiliser une clé." }, { status: 401 });
  }
  const { code } = await req.json().catch(() => ({ code: "" }));
  const trimmed = String(code || "").trim();
  if (!trimmed) return NextResponse.json({ error: "Entre une clé." }, { status: 400 });

  const key = await prisma.redeemKey.findUnique({ where: { code: trimmed } });
  if (!key) return NextResponse.json({ error: "Clé invalide." }, { status: 404 });
  if (key.used) return NextResponse.json({ error: "Cette clé a déjà été utilisée." }, { status: 409 });

  const tier = key.planTier as Exclude<PlanTier, "free">;
  await grantPlan(session.user.id, tier);
  await prisma.redeemKey.update({
    where: { id: key.id },
    data: { used: true, usedById: session.user.id, usedAt: new Date() },
  });

  return NextResponse.json({ success: true, planTier: tier, planLabel: PLAN_LABELS[tier] ?? tier });
}
