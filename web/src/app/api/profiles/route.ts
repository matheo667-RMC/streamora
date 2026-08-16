import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_PROFILES = 5;

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET() {
  const userId = await currentUserId();
  if (!userId) return NextResponse.json([]);

  // Profiles created before accounts were separated have no owner: give them
  // to the first account that asks, so nobody loses their existing profiles.
  const mine = await prisma.profile.count({ where: { userId } });
  if (mine === 0) {
    await prisma.profile.updateMany({ where: { userId: null }, data: { userId } });
  }

  const profiles = await prisma.profile.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  // The PIN never leaves the server: the page only needs to know it exists.
  return NextResponse.json(
    profiles.map(({ pin, ...p }) => ({ ...p, locked: pin.length > 0 }))
  );
}

export async function POST(req: NextRequest) {
  const userId = await currentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Connecte-toi pour créer un profil" }, { status: 401 });
  }

  const count = await prisma.profile.count({ where: { userId } });
  if (count >= MAX_PROFILES) {
    return NextResponse.json({ error: `Maximum ${MAX_PROFILES} profils atteint` }, { status: 400 });
  }

  const { name, avatarUrl } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Le nom est requis" }, { status: 400 });
  }

  const profile = await prisma.profile.create({
    data: { userId, name: name.trim(), avatarUrl: avatarUrl || "" },
  });

  return NextResponse.json(profile);
}
