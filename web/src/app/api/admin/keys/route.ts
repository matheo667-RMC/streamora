import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FOUNDER_EMAIL, PLAN_DAYS, PlanTier, generateKeyCode } from "@/lib/subscription";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.email === FOUNDER_EMAIL || (session?.user as { role?: string })?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const keys = await prisma.redeemKey.findMany({
    orderBy: { createdAt: "desc" },
    include: { usedBy: { select: { email: true, name: true } } },
    take: 500,
  });
  return NextResponse.json(keys);
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { planTier, count, note } = await req.json().catch(() => ({}));
  const tier = (planTier || "month1") as Exclude<PlanTier, "free">;
  if (!(tier in PLAN_DAYS)) return NextResponse.json({ error: "Offre invalide" }, { status: 400 });
  const n = Math.min(Math.max(parseInt(String(count || 1), 10) || 1, 1), 100);
  const created: string[] = [];
  for (let i = 0; i < n; i++) {
    let code = generateKeyCode();
    // avoid rare collisions
    while (await prisma.redeemKey.findUnique({ where: { code } })) code = generateKeyCode();
    await prisma.redeemKey.create({
      data: { code, planTier: tier, durationDays: PLAN_DAYS[tier], note: note || "" },
    });
    created.push(code);
  }
  return NextResponse.json({ created });
}

export async function DELETE(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id manquant" }, { status: 400 });
  await prisma.redeemKey.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
