import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { EpisodePlayer } from "@/components/EpisodePlayer";

interface Props {
  params: { id: string };
}

export const dynamic = "force-dynamic";

export default async function SeriesDetailPage({ params }: Props) {
  const series = await prisma.series.findUnique({
    where: { id: params.id },
    include: {
      episodes: { orderBy: [{ season: "asc" }, { number: "asc" }] },
    },
  });

  if (!series) notFound();

  const seasonNumbers = [...new Set(series.episodes.map((ep) => ep.season))].sort(
    (a, b) => a - b
  );

  return (
    <>
    <Navbar />
    <div className="mx-auto max-w-7xl px-4 pt-24 pb-8">
      <Link
        href="/series"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
      >
        &larr; Retour aux séries
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Poster */}
        <div className="lg:col-span-1">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-800">
            {series.posterUrl ? (
              <Image
                src={series.posterUrl}
                alt={series.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">
                <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="lg:col-span-2">
          <h1 className="text-3xl font-bold md:text-4xl">{series.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-purple-900/50 px-3 py-1 text-sm text-purple-300">
              {series.category}
            </span>
            <span className="text-sm text-gray-400">{series.year}</span>
            <span className="text-sm text-gray-400">
              {series.episodes.length} épisode{series.episodes.length > 1 ? "s" : ""}
            </span>
            <span className="text-sm text-gray-400">
              {seasonNumbers.length} saison{seasonNumbers.length > 1 ? "s" : ""}
            </span>
          </div>

          {series.description && (
            <p className="mt-6 text-gray-300 leading-relaxed">
              {series.description}
            </p>
          )}

          {/* Episodes by season */}
          {seasonNumbers.length > 0 && (
            <EpisodePlayer
              seasons={seasonNumbers}
              episodes={series.episodes.map(ep => ({
                id: ep.id,
                season: ep.season,
                number: ep.number,
                title: ep.title,
                videoUrl: ep.videoUrl,
                duration: ep.duration,
              }))}
              seriesTitle={series.title}
              poster={series.posterUrl || undefined}
            />
          )}

          {series.episodes.length === 0 && (
            <p className="mt-8 text-gray-400">
              Aucun épisode disponible pour le moment.
            </p>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
