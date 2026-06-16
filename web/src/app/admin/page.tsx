import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboard } from "@/components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id! },
    select: { role: true },
  });

  if (user?.role !== "admin") {
    redirect("/");
  }

  const [films, seriesList, statsData, recentDownloads] = await Promise.all([
    prisma.film.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { downloads: true } } },
    }),
    prisma.series.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { episodes: true } } },
    }),
    Promise.all([
      prisma.film.count(),
      prisma.user.count(),
      prisma.download.count(),
      prisma.series.count(),
    ]).then(([totalFilms, totalUsers, totalDownloads, totalSeries]) => ({
      totalFilms,
      totalUsers,
      totalDownloads,
      totalSeries,
    })),
    prisma.download.findMany({
      include: {
        film: { select: { title: true } },
        user: { select: { name: true, email: true, image: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <AdminDashboard
      films={films}
      series={seriesList}
      stats={statsData}
      recentDownloads={recentDownloads}
    />
  );
}
