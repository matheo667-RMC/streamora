import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { FOUNDER_EMAIL, grantPlan, PLAN_LABELS, PlanTier } from "@/lib/subscription";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.email === FOUNDER_EMAIL || (session?.user as { role?: string })?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const users = await prisma.user.findMany({
    select: {
      id: true, name: true, email: true, role: true, createdAt: true,
      planTier: true, planExpiresAt: true, badges: true, watchSeconds: true, signupIp: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(users);
}

// Admin actions on a user: set plan, add/remove badge, reset password.
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const { action, userId } = body as { action?: string; userId?: string };
  if (!userId) return NextResponse.json({ error: "userId manquant" }, { status: 400 });

  if (action === "setPlan") {
    const tier = body.planTier as PlanTier;
    if (tier === "free") {
      await prisma.user.update({ where: { id: userId }, data: { planTier: "free", planExpiresAt: null } });
    } else {
      await grantPlan(userId, tier as Exclude<PlanTier, "free">);
    }
    return NextResponse.json({ success: true, planLabel: PLAN_LABELS[tier] });
  }

  if (action === "setBadges") {
    const badges = String(body.badges ?? "").split(",").map((s: string) => s.trim()).filter(Boolean).join(",");
    await prisma.user.update({ where: { id: userId }, data: { badges } });
    return NextResponse.json({ success: true });
  }

  if (action === "resetPassword") {
    const newPassword = String(body.newPassword || "").trim();
    if (newPassword.length < 4) return NextResponse.json({ error: "Mot de passe trop court" }, { status: 400 });
    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hash } });
    return NextResponse.json({ success: true });
  }

  if (action === "setRole") {
    const role = body.role === "admin" ? "admin" : "user";
    await prisma.user.update({ where: { id: userId }, data: { role } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
}
