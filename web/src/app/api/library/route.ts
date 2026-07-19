import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const STATUSES = ["list", "watched", "later"];

// GET ?status=list  -> user's library items (with film/series details resolved)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ items: [] });
  const status = req.nextUrl.searchParams.get("status") || undefined;
  const items = await prisma.libraryItem.findMany({
    where: { userId: session.user.id, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
  });

  const filmIds = items.filter((i) => i.mediaType === "film").map((i) => i.mediaId);
  const seriesIds = items.filter((i) => i.mediaType === "series").map((i) => i.mediaId);
  const [films, series] = await Promise.all([
    prisma.film.findMany({ where: { id: { in: filmIds } }, select: { id: true, title: true, posterUrl: true } }),
    prisma.series.findMany({ where: { id: { in: seriesIds } }, select: { id: true, title: true, posterUrl: true } }),
  ]);
  const fmap = new Map(films.map((f) => [f.id, f]));
  const smap = new Map(series.map((s) => [s.id, s]));

  const resolved = items
    .map((i) => {
      const media = i.mediaType === "film" ? fmap.get(i.mediaId) : smap.get(i.mediaId);
      if (!media) return null;
      return { id: i.id, status: i.status, mediaType: i.mediaType, mediaId: i.mediaId, title: media.title, posterUrl: media.posterUrl };
    })
    .filter(Boolean);
  return NextResponse.json({ items: resolved });
}

// POST { mediaType, mediaId, status } -> toggles membership in that list
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const { mediaType, mediaId, status } = await req.json().catch(() => ({}));
  if (!["film", "series"].includes(mediaType) || !mediaId || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  }
  const existing = await prisma.libraryItem.findUnique({
    where: { userId_mediaType_mediaId_status: { userId: session.user.id, mediaType, mediaId, status } },
  });
  if (existing) {
    await prisma.libraryItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ active: false });
  }
  await prisma.libraryItem.create({ data: { userId: session.user.id, mediaType, mediaId, status } });
  return NextResponse.json({ active: true });
}
