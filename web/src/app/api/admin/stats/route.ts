import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (
    !session?.user ||
    (session.user as Record<string, unknown>).role !== "admin"
  ) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const [totalFilms, totalUsers, totalDownloads] = await Promise.all([
    prisma.film.count(),
    prisma.user.count(),
    prisma.download.count(),
  ]);

  const topFilms = await prisma.film.findMany({
    include: { _count: { select: { downloads: true } } },
    orderBy: { downloads: { _count: "desc" } },
    take: 10,
  });

  const recentDownloads = await prisma.download.findMany({
    include: {
      film: { select: { title: true } },
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    totalFilms,
    totalUsers,
    totalDownloads,
    topFilms,
    recentDownloads,
  });
}
