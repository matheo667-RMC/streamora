import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET ?mediaType&mediaId -> average + count + this user's rating/review
export async function GET(req: NextRequest) {
  const mediaType = req.nextUrl.searchParams.get("mediaType") || "";
  const mediaId = req.nextUrl.searchParams.get("mediaId") || "";
  if (!mediaType || !mediaId) return NextResponse.json({ average: 0, count: 0, mine: null });

  const agg = await prisma.rating.aggregate({
    where: { mediaType, mediaId, stars: { gt: 0 } },
    _avg: { stars: true },
    _count: true,
  });

  const session = await auth();
  let mine = null;
  if (session?.user?.id) {
    mine = await prisma.rating.findUnique({
      where: { userId_mediaType_mediaId: { userId: session.user.id, mediaType, mediaId } },
      select: { stars: true, review: true },
    });
  }

  const reviews = await prisma.rating.findMany({
    where: { mediaType, mediaId, review: { not: "" } },
    orderBy: { updatedAt: "desc" },
    take: 20,
    select: { stars: true, review: true, updatedAt: true },
  });

  return NextResponse.json({ average: agg._avg.stars || 0, count: agg._count || 0, mine, reviews });
}

// POST { mediaType, mediaId, stars, review }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { mediaType, mediaId, stars, review } = await req.json().catch(() => ({}));
  if (!["film", "series"].includes(mediaType) || !mediaId) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const s = Math.min(Math.max(parseInt(String(stars || 0), 10) || 0, 0), 5);
  const r = String(review || "").slice(0, 2000);
  await prisma.rating.upsert({
    where: { userId_mediaType_mediaId: { userId: session.user.id, mediaType, mediaId } },
    update: { stars: s, review: r },
    create: { userId: session.user.id, mediaType, mediaId, stars: s, review: r },
  });
  return NextResponse.json({ success: true });
}
