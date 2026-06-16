import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { FilmsFilter } from "@/components/FilmsFilter";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { category?: string; q?: string };
}

export default async function SeriesPage({ searchParams }: Props) {
  const { category, q } = searchParams;

  const where: Record<string, unknown> = {};
  if (category && category !== "Toutes") {
    where.category = category;
  }
  if (q) {
    where.title = { contains: q };
  }

  const series = await prisma.series.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { episodes: true } } },
  });

  const categories = await prisma.series.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  const categoryList = [
    "Toutes",
    ...categories.map((c) => c.category).filter(Boolean),
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Séries</h1>

      <FilmsFilter categories={categoryList} />

      {series.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {series.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`} className="card group">
              <div className="relative aspect-[2/3] bg-gray-800">
                {s.posterUrl ? (
                  <Image
                    src={s.posterUrl}
                    alt={s.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold line-clamp-1">{s.title}</h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <span>{s.year}</span>
                  <span>·</span>
                  <span>{s.category}</span>
                  <span>·</span>
                  <span>{s._count.episodes} épisode{s._count.episodes > 1 ? "s" : ""}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
          <p className="text-gray-400">Aucune série trouvée.</p>
        </div>
      )}
    </div>
  );
}
