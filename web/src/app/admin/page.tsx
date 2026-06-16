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

  const [films, stats] = await Promise.all([
    prisma.film.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { downloads: true } } },
    }),
    Promise.all([
      prisma.film.count(),
      prisma.user.count(),
      prisma.download.count(),
    ]).then(([totalFilms, totalUsers, totalDownloads]) => ({
      totalFilms,
      totalUsers,
      totalDownloads,
    })),
  ]);

  const recentDownloads = await prisma.download.findMany({
    include: {
      film: { select: { title: true } },
      user: { select: { name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <AdminDashboard
      films={films}
      stats={stats}
      recentDownloads={recentDownloads}
    />
  );
}
