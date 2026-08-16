import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findPoster } from "@/lib/poster";
import { allowedFromAdminOrServer } from "@/lib/sync-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 8;

/** Repare les titres sans affiche, quelques-uns a chaque appel : Mr. Robot
 *  repasse regulierement jusqu'a ce que le catalogue soit complet. */
export async function POST(req: NextRequest) {
  if (!(await allowedFromAdminOrServer(req))) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const [films, series] = await Promise.all([
    prisma.film.findMany({
      where: { posterUrl: "" },
      select: { id: true, title: true, tmdbId: true },
      take: BATCH,
    }),
    prisma.series.findMany({
      where: { posterUrl: "" },
      select: { id: true, title: true, tmdbId: true },
      take: BATCH,
    }),
  ]);

  let fixed = 0;
  for (const f of films) {
    const url = await findPoster(f.title, "movie", f.tmdbId);
    if (!url) continue;
    await prisma.film.update({ where: { id: f.id }, data: { posterUrl: url } });
    fixed++;
  }
  for (const s of series) {
    const url = await findPoster(s.title, "tv", s.tmdbId);
    if (!url) continue;
    await prisma.series.update({ where: { id: s.id }, data: { posterUrl: url } });
    fixed++;
  }

  const remaining =
    (await prisma.film.count({ where: { posterUrl: "" } })) +
    (await prisma.series.count({ where: { posterUrl: "" } }));

  return NextResponse.json({ fixed, remaining });
}
