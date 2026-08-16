import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const STREAMORA_ICONS = [
  "/avatars/bleu.png",
  "/avatars/rose.png",
  "/avatars/violet.png",
  "/avatars/jaune.png",
  "/avatars/rouge.png",
];

// Icon gallery: the Streamora characters first, then posters from the catalog.
export async function GET() {
  const [films, series] = await Promise.all([
    prisma.film.findMany({
      where: { posterUrl: { not: "" } },
      select: { title: true, posterUrl: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.series.findMany({
      where: { posterUrl: { not: "" } },
      select: { title: true, posterUrl: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);

  const toIcons = (rows: { title: string; posterUrl: string }[]) =>
    rows
      .filter((x) => x.posterUrl.startsWith("http"))
      .map((x) => ({ title: x.title, url: x.posterUrl }));

  const groups = [
    {
      title: "Classiques Streamora",
      icons: STREAMORA_ICONS.map((url) => ({ title: "Streamora", url })),
    },
    { title: "Films", icons: toIcons(films) },
    { title: "Séries", icons: toIcons(series) },
  ].filter((g) => g.icons.length > 0);

  return NextResponse.json({
    groups,
    posters: groups.flatMap((g) => (g.title === "Classiques Streamora" ? [] : g.icons)).slice(0, 30),
  });
}
