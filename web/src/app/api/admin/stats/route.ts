import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [films, users, downloads, series, episodes] = await Promise.all([
      prisma.film.count(),
      prisma.user.count(),
      prisma.download.count(),
      prisma.series.count(),
      prisma.episode.count(),
    ]);

    return NextResponse.json({
      films,
      series,
      episodes,
      downloads,
      users,
    });
  } catch {
    return NextResponse.json({ films: 0, series: 0, episodes: 0, downloads: 0, users: 0 });
  }
}
