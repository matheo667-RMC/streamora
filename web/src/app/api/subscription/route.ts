import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { hasActiveAccess, isFounder, PLAN_LABELS, PlanTier } from "@/lib/subscription";

// Returns the signed-in user's subscription status.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, hasAccess: false });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, role: true, planTier: true, planExpiresAt: true, badges: true, watchSeconds: true },
  });
  const tier = (user?.planTier || "free") as PlanTier;
  return NextResponse.json({
    authenticated: true,
    hasAccess: hasActiveAccess(user),
    founder: isFounder(user?.email),
    planTier: tier,
    planLabel: PLAN_LABELS[tier] ?? "Gratuit",
    planExpiresAt: user?.planExpiresAt ?? null,
    badges: (user?.badges || "").split(",").map((b) => b.trim()).filter(Boolean),
    watchSeconds: user?.watchSeconds ?? 0,
  });
}
