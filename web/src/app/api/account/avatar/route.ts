import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST { avatar } -> sets the current user's avatar (preset id or image URL)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { avatar } = await req.json().catch(() => ({}));
  const value = String(avatar || "").slice(0, 500);
  await prisma.user.update({ where: { id: session.user.id }, data: { image: value } });
  return NextResponse.json({ success: true, image: value });
}
