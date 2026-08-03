import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// Streamora is free: everyone has access. This endpoint now only returns
// profile stats (watch time, badges, avatar) for the account page.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ authenticated: false, hasAccess: true });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { badges: true, watchSeconds: true, image: true },
  });
  return NextResponse.json({
    authenticated: true,
    hasAccess: true,
    badges: (user?.badges || "").split(",").map((b) => b.trim()).filter(Boolean),
    watchSeconds: user?.watchSeconds ?? 0,
    image: user?.image ?? null,
  });
}
