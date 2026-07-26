import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Poster-based avatar choices drawn from the current catalog (films + series).
export async function GET() {
  const [films, series] = await Promise.all([
    prisma.film.findMany({
      where: { featured: true, posterUrl: { not: "" } },
      select: { title: true, posterUrl: true },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
    prisma.series.findMany({
      where: { featured: true, posterUrl: { not: "" } },
      select: { title: true, posterUrl: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const posters = [...films, ...series]
    .map((x) => ({ title: x.title, url: x.posterUrl }))
    .filter((x) => x.url.startsWith("http"));

  return NextResponse.json({ posters: posters.slice(0, 30) });
}
