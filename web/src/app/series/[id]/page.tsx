import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/Navbar";
import { EpisodePlayer } from "@/components/EpisodePlayer";
import { Footer } from "@/components/Footer";

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
    <div className="min-h-screen bg-[#1a1a2e]">
      <div className="pt-16 sm:pt-20">
        {/* Series info - papystreaming style */}
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6">
          <div className="rounded-xl border border-white/5 bg-[#16213e]/80 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Poster */}
              <div className="shrink-0 self-start">
                <div className="relative w-32 sm:w-40 aspect-[2/3] rounded-lg overflow-hidden ring-1 ring-white/10 shadow-lg">
                  {series.posterUrl ? (
                    <Image src={series.posterUrl} alt={series.title} fill className="object-cover" priority />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gray-800 text-gray-600">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute top-1.5 left-1.5 flex flex-col items-center">
                    <span className="rounded-t bg-purple-600 px-1.5 py-0.5 text-[8px] font-bold leading-none uppercase">Eps</span>
                    <span className="rounded-b bg-purple-800 px-1.5 py-0.5 text-[11px] font-bold leading-none">{series.episodes.length}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold">{series.title}</h1>

                {series.description && (
                  <p className="mt-3 text-sm text-gray-400 leading-relaxed">{series.description}</p>
                )}

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Genre :</span>
                    <span className="text-purple-400 font-medium">{series.category}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Année :</span>
                    <span className="text-gray-300">{series.year}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Saisons :</span>
                    <span className="text-gray-300">{seasonNumbers.length}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-gray-500 shrink-0 w-24">Épisodes :</span>
                    <span className="text-gray-300">{series.episodes.length}</span>
                  </div>
                </div>

                <div className="mt-5">
                  <Link href="/series" className="btn-secondary text-sm px-4 py-2 inline-flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Retour
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Episodes */}
        <div className="mx-auto max-w-[1000px] px-4 sm:px-6 pb-16">
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
              seriesId={series.id}
              poster={series.posterUrl || undefined}
            />
          ) : (
            <div className="mt-8 rounded-xl border border-white/5 bg-[#16213e]/80 p-12 text-center">
              <p className="text-gray-400">Aucun épisode disponible pour le moment.</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
    </>
  );
}
