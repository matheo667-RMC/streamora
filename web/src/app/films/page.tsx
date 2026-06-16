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
    <div className="mx-auto max-w-7xl px-4 pt-24 pb-8">
      <h1 className="mb-8 text-3xl font-bold">Films</h1>

      <FilmsFilter categories={categoryList} />

      {films.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {films.map((film) => (
            <Link key={film.id} href={`/films/${film.id}`} className="card group">
              <div className="relative aspect-[2/3] bg-gray-800">
                {film.posterUrl ? (
                  <Image
                    src={film.posterUrl}
                    alt={film.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    <svg
                      className="h-12 w-12"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="text-sm font-semibold line-clamp-1">
                  {film.title}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                  <span>{film.year}</span>
                  <span>·</span>
                  <span>{film.category}</span>
                </div>
                {film._count.downloads > 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    {film._count.downloads} téléchargement
                    {film._count.downloads > 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/5 bg-gray-900/30 p-12 text-center">
          <p className="text-gray-400">Aucun film trouvé.</p>
        </div>
      )}
    </div>
    </>
  );
}
