import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  const profile = await prisma.profile.findUnique({
    where: { id: params.id },
    select: { userId: true, pin: true },
  });
  if (!user || !profile || profile.userId !== user.id) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { pin } = await req.json();
  if (profile.pin && String(pin) !== profile.pin) {
    return NextResponse.json({ error: "Code incorrect" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
