import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const featuredFilms = await prisma.film.findMany({
    where: { featured: true },
    take: 6,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { downloads: true } } },
  });

  const latestFilms = await prisma.film.findMany({
    take: 12,
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { downloads: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Hero */}
      <section className="relative mb-12 overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900 via-gray-900 to-gray-950 p-8 md:p-16">
        <div className="relative z-10">
          <h1 className="mb-4 text-4xl font-extrabold md:text-6xl">
            Bienvenue sur{" "}
            <span className="text-primary-400">Streamora</span>
          </h1>
          <p className="mb-6 max-w-2xl text-lg text-gray-300">
            Regardez et téléchargez vos films préférés. Des centaines de films
            disponibles en streaming et en téléchargement.
          </p>
          <Link href="/films" className="btn-primary text-base px-8 py-3">
            Explorer les films
          </Link>
        </div>
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-primary-600/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary-500/10 blur-3xl" />
      </section>

      {/* Featured */}
      {featuredFilms.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-bold">Films en vedette</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {featuredFilms.map((film) => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
        </section>
      )}

      {/* Latest */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Derniers ajouts</h2>
          <Link
            href="/films"
            className="text-sm text-primary-400 hover:text-primary-300"
          >
            Voir tout &rarr;
          </Link>
        </div>
        {latestFilms.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {latestFilms.map((film) => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-12 text-center">
            <p className="text-gray-400">
              Aucun film disponible pour le moment.
            </p>
            <p className="mt-2 text-sm text-gray-500">
              Les films seront ajoutés par l&apos;administrateur.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function FilmCard({
  film,
}: {
  film: {
    id: string;
    title: string;
    posterUrl: string;
    year: number;
    category: string;
    _count: { downloads: number };
  };
}) {
  return (
    <Link href={`/films/${film.id}`} className="card group">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold line-clamp-1">{film.title}</h3>
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
  );
}
