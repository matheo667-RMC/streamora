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
    <div className="min-h-screen bg-black">
      {/* Hero section with poster background */}
      <div className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 h-[450px]">
          {series.posterUrl && (
            <Image
              src={series.posterUrl}
              alt=""
              fill
              className="object-cover opacity-20 blur-xl"
              priority
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-black" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pt-24 pb-8">
          <Link
            href="/series"
            className="mb-6 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
          >
            &larr; Retour aux series
          </Link>

          <div className="flex flex-col md:flex-row gap-8 mt-4">
            {/* Poster */}
            <div className="flex-shrink-0 w-48 md:w-56">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-800 shadow-2xl shadow-purple-900/20 ring-1 ring-white/10">
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
                    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold md:text-4xl lg:text-5xl">{series.title}</h1>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-purple-600/30 border border-purple-500/30 px-3 py-1 text-sm text-purple-300 font-medium">
                  {series.category}
                </span>
                <span className="text-sm text-gray-400 font-medium">{series.year}</span>
                <span className="h-1 w-1 rounded-full bg-gray-600" />
                <span className="text-sm text-gray-400">
                  {seasonNumbers.length} saison{seasonNumbers.length > 1 ? "s" : ""}
                </span>
                <span className="h-1 w-1 rounded-full bg-gray-600" />
                <span className="text-sm text-gray-400">
                  {series.episodes.length} episode{series.episodes.length > 1 ? "s" : ""}
                </span>
              </div>

              {series.description && (
                <p className="mt-5 text-gray-300 leading-relaxed max-w-2xl">
                  {series.description}
                </p>
              )}

              {series.episodes.length > 0 && series.episodes[0]?.videoUrl && (
                <div className="mt-6">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white text-black px-5 py-2.5 text-sm font-semibold hover:bg-gray-200 transition-colors cursor-default">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Regarder
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Episodes section */}
      <div className="mx-auto max-w-7xl px-4 pb-16">
        {seasonNumbers.length > 0 ? (
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
        ) : (
          <div className="mt-8 rounded-xl border border-white/5 bg-gray-900/30 p-12 text-center">
            <p className="text-gray-400">Aucun episode disponible pour le moment.</p>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
