import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { FilmsFilter } from "@/components/FilmsFilter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IptvSection } from "@/components/IptvSection";

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

  type SeriesWithCount = Awaited<ReturnType<typeof prisma.series.findMany>>[number] & { _count: { episodes: number } };
  let series: SeriesWithCount[] = [];
  let categoryList: string[] = ["Toutes"];

  try {
    series = await prisma.series.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { episodes: true } } },
    }) as SeriesWithCount[];

    const categories = await prisma.series.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    categoryList = [
      "Toutes",
      ...categories.map((c) => c.category).filter(Boolean),
    ];
  } catch {
    // Database not available yet
  }

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-[#1a1a2e]">
      <div className="relative pt-20 pb-6 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent h-48" />
        <div className="relative mx-auto max-w-[1400px]">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-lg font-bold">
              Séries
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </h1>
            <span className="text-sm text-gray-400">{series.length} résultat{series.length > 1 ? "s" : ""}</span>
          </div>
          <FilmsFilter categories={categoryList} />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        {series.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {series.map((s) => (
              <Link key={s.id} href={`/series/${s.id}`} className="group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-purple-500/50 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-purple-900/30">
                  {s.posterUrl ? (
                    <Image
                      src={s.posterUrl}
                      alt={s.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 14vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30 text-gray-600">
                      <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                  {/* Episode count badge */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col items-center">
                    <span className="rounded-t bg-purple-600 px-1.5 py-0.5 text-[8px] font-bold leading-none uppercase">Eps</span>
                    <span className="rounded-b bg-purple-800 px-1.5 py-0.5 text-[11px] font-bold leading-none">{s._count.episodes}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-center text-gray-300 line-clamp-2 group-hover:text-white transition-colors">{s.title}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-[#16213e]/80 p-12 text-center">
            <p className="text-gray-400">Aucune série trouvée.</p>
          </div>
        )}
        <IptvSection kind="series" />
      </div>

      <Footer />
    </div>
    </>
  );
}
