import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { FilmsFilter } from "@/components/FilmsFilter";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { category?: string; q?: string; page?: string };
}

const PER_PAGE = 60;

export default async function FilmsPage({ searchParams }: Props) {
  const { category, q } = searchParams;
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);

  const where: Record<string, unknown> = {};
  if (category && category !== "Toutes") {
    where.category = category;
  }
  if (q) {
    where.title = { contains: q };
  }

  type FilmWithCount = Awaited<ReturnType<typeof prisma.film.findMany>>[number] & { _count: { downloads: number } };
  let films: FilmWithCount[] = [];
  let categoryList: string[] = ["Toutes"];
  let total = 0;

  try {
    total = await prisma.film.count({ where });
    films = await prisma.film.findMany({
      where,
      orderBy: [{ posterUrl: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      include: { _count: { select: { downloads: true } } },
    }) as FilmWithCount[];

    const categories = await prisma.film.findMany({
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

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const buildHref = (p: number) => {
    const sp = new URLSearchParams();
    if (category) sp.set("category", category);
    if (q) sp.set("q", q);
    sp.set("page", String(p));
    return `/films?${sp.toString()}`;
  };

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-[#0f0f23]">
      <div className="relative pt-20 pb-6 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent h-48" />
        <div className="relative mx-auto max-w-[1400px]">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-lg font-bold">
              Films
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </h1>
            <span className="text-sm text-gray-400">{total.toLocaleString("fr-FR")} film{total > 1 ? "s" : ""}</span>
          </div>
          <FilmsFilter categories={categoryList} />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        {films.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7">
            {films.map((film) => (
              <Link key={film.id} href={`/films/${film.id}`} className="group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-purple-500/50 group-hover:scale-105 group-hover:shadow-xl group-hover:shadow-purple-900/30">
                  {film.posterUrl ? (
                    <Image
                      src={film.posterUrl}
                      alt={film.title}
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
                  {/* HD badge */}
                  <div className="absolute top-1.5 left-1.5">
                    <span className="rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-bold leading-none">HD</span>
                  </div>
                  {/* Category badge */}
                  <div className="absolute top-1.5 right-1.5">
                    <span className="rounded bg-pink-600/90 px-1.5 py-0.5 text-[9px] font-bold leading-none">{film.category}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs sm:text-sm text-center text-gray-300 line-clamp-2 group-hover:text-white transition-colors">{film.title}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-white/5 bg-[#151515]/80 p-12 text-center">
            <p className="text-gray-400">Aucun film trouvé.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm">
            {page > 1 && (
              <Link href={buildHref(page - 1)} className="rounded-md bg-white/10 px-4 py-2 font-medium hover:bg-white/20 transition-colors">Précédent</Link>
            )}
            <span className="px-3 py-2 text-gray-400">Page {page} / {totalPages}</span>
            {page < totalPages && (
              <Link href={buildHref(page + 1)} className="rounded-md bg-purple-600 px-4 py-2 font-medium hover:bg-purple-500 transition-colors">Suivant</Link>
            )}
          </div>
        )}
      </div>

      <Footer />
    </div>
    </>
  );
}
