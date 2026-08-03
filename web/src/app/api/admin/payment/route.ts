import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { FOUNDER_EMAIL } from "@/lib/subscription";

async function requireAdmin() {
  const session = await auth();
  return session?.user?.email === FOUNDER_EMAIL || (session?.user as { role?: string })?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const s = await prisma.siteSettings.findUnique({ where: { id: "main" } });
  return NextResponse.json(s ?? {});
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const data = {
    maxAccountsPerIp: parseInt(String(b.maxAccountsPerIp ?? 2), 10) || 2,
    autoMaintenance: !!b.autoMaintenance,
  };
  const s = await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: data,
    create: { id: "main", ...data },
  });
  return NextResponse.json(s);
}
