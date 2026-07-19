import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface Notif {
  id: string;
  type: "film" | "series" | "reminder";
  title: string;
  message: string;
  href: string;
  posterUrl: string | null;
  createdAt: string;
}

// Derived notifications: latest added content + personal "à regarder plus tard" reminders.
export async function GET() {
  const notifs: Notif[] = [];

  const [films, series] = await Promise.all([
    prisma.film.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, posterUrl: true, createdAt: true } }),
    prisma.series.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, title: true, posterUrl: true, createdAt: true } }),
  ]);

  for (const f of films) {
    notifs.push({
      id: `film-${f.id}`, type: "film", title: "Nouveau film",
      message: f.title, href: `/films/${f.id}`, posterUrl: f.posterUrl, createdAt: f.createdAt.toISOString(),
    });
  }
  for (const s of series) {
    notifs.push({
      id: `series-${s.id}`, type: "series", title: "Nouvelle série",
      message: s.title, href: `/series/${s.id}`, posterUrl: s.posterUrl, createdAt: s.createdAt.toISOString(),
    });
  }

  const session = await auth();
  if (session?.user?.id) {
    const later = await prisma.libraryItem.findMany({
      where: { userId: session.user.id, status: "later" }, take: 10, orderBy: { createdAt: "desc" },
    });
    const filmIds = later.filter((i) => i.mediaType === "film").map((i) => i.mediaId);
    const seriesIds = later.filter((i) => i.mediaType === "series").map((i) => i.mediaId);
    const [lf, ls] = await Promise.all([
      prisma.film.findMany({ where: { id: { in: filmIds } }, select: { id: true, title: true, posterUrl: true } }),
      prisma.series.findMany({ where: { id: { in: seriesIds } }, select: { id: true, title: true, posterUrl: true } }),
    ]);
    for (const f of lf) notifs.push({ id: `rem-f-${f.id}`, type: "reminder", title: "À regarder plus tard", message: `N'oublie pas : ${f.title}`, href: `/films/${f.id}`, posterUrl: f.posterUrl, createdAt: new Date().toISOString() });
    for (const s of ls) notifs.push({ id: `rem-s-${s.id}`, type: "reminder", title: "À regarder plus tard", message: `N'oublie pas : ${s.title}`, href: `/series/${s.id}`, posterUrl: s.posterUrl, createdAt: new Date().toISOString() });
  }

  notifs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ notifications: notifs.slice(0, 20) });
}
