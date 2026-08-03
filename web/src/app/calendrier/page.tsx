import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TMDB_KEY = "4e2f8bed54601f3f2b98de4dc0dc7aa9";

interface TmdbMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  release_date: string;
}

async function getUpcoming(): Promise<TmdbMovie[]> {
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/upcoming?language=fr-FR&region=FR&page=1&api_key=${TMDB_KEY}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const today = new Date().toISOString().slice(0, 10);
    return (data.results || [])
      .filter((m: TmdbMovie) => m.release_date && m.release_date >= today)
      .sort((a: TmdbMovie, b: TmdbMovie) => a.release_date.localeCompare(b.release_date));
  } catch {
    return [];
  }
}

function daysUntil(date: string): number {
  const diff = new Date(date).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

export default async function CalendarPage() {
  const movies = await getUpcoming();

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#0f0f23]">
        <div className="relative pt-24 pb-6 px-4 sm:px-6">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/20 to-transparent h-48" />
          <div className="relative mx-auto max-w-[1200px]">
            <h1 className="text-2xl sm:text-3xl font-bold">
              <span className="bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">Calendrier des sorties</span>
            </h1>
            <p className="mt-2 text-sm text-gray-400">Les prochains films au cinéma, avec compte à rebours.</p>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pb-16">
          {movies.length === 0 ? (
            <div className="rounded-xl border border-white/5 bg-[#151515]/80 p-12 text-center text-gray-400">
              Aucune sortie à venir pour le moment.
            </div>
          ) : (
            <div className="space-y-3">
              {movies.map((m) => {
                const d = daysUntil(m.release_date);
                return (
                  <div key={m.id} className="flex gap-4 rounded-xl border border-white/5 bg-[#151515]/80 p-3 sm:p-4">
                    <div className="relative w-16 sm:w-20 aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 shrink-0">
                      {m.poster_path && (
                        <Image src={`https://image.tmdb.org/t/p/w342${m.poster_path}`} alt={m.title} fill className="object-cover" sizes="80px" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-lg">{m.title}</h2>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded bg-emerald-600 px-2 py-0.5 font-semibold">
                          {new Date(m.release_date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        <span className="rounded bg-green-600 px-2 py-0.5 font-semibold">
                          {d === 0 ? "Aujourd'hui" : `Dans ${d} jour${d > 1 ? "s" : ""}`}
                        </span>
                      </div>
                      {m.overview && <p className="mt-2 text-sm text-gray-400 line-clamp-2">{m.overview}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <Footer />
      </div>
    </>
  );
}
