import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Increment the signed-in user's total watch time (seconds). Called as a heartbeat.
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false });
  const { seconds } = await req.json().catch(() => ({ seconds: 0 }));
  const inc = Math.min(Math.max(parseInt(String(seconds || 0), 10) || 0, 0), 120);
  if (inc > 0) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { watchSeconds: { increment: inc } },
    });
  }
  return NextResponse.json({ ok: true });
}
