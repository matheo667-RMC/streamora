import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { FilmsFilter } from "@/components/FilmsFilter";
import { Navbar } from "@/components/Navbar";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { category?: string; q?: string };
}

export default async function FilmsPage({ searchParams }: Props) {
  const { category, q } = searchParams;

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

  try {
    films = await prisma.film.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

  return (
    <>
    <Navbar />
    <div className="min-h-screen bg-black">
      {/* Header with gradient */}
      <div className="relative pt-20 pb-8 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 to-transparent h-64" />
        <div className="relative mx-auto max-w-[1400px]">
          <h1 className="mb-2 text-3xl font-bold sm:text-4xl">Films</h1>
          <p className="text-sm text-gray-400 mb-6">Tous les films disponibles en streaming</p>
          <FilmsFilter categories={categoryList} />
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pb-16">
        {films.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {films.map((film) => (
              <Link key={film.id} href={`/films/${film.id}`} className="group">
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 ring-1 ring-white/5 transition-all duration-300 group-hover:ring-purple-500/40 group-hover:shadow-xl group-hover:shadow-purple-900/20 group-hover:scale-105">
                  {film.posterUrl ? (
                    <Image
                      src={film.posterUrl}
                      alt={film.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-purple-900/30 to-pink-900/30 text-gray-600">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex items-center justify-center h-8 w-8 rounded-full bg-white text-black shrink-0">
                        <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white line-clamp-1">{film.title}</p>
                        <p className="text-[10px] text-gray-300">{film.year} · {film.category}</p>
                      </div>
                    </div>
                  </div>
                  {/* Quality badge */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="rounded bg-purple-600/90 px-1.5 py-0.5 text-[10px] font-bold">HD</span>
                  </div>
                </div>
                <div className="mt-2 px-0.5">
                  <h3 className="text-sm font-medium line-clamp-1 text-gray-200 group-hover:text-white transition-colors">{film.title}</h3>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
                    <span>{film.year}</span>
                    <span>·</span>
                    <span>{film.category}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/5 bg-gray-900/30 p-12 text-center">
            <p className="text-gray-400">Aucun film trouvé.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
