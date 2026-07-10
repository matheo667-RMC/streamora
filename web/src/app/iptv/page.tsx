"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

type Kind = "live" | "vod" | "series";

interface Item {
  id: number | string;
  name: string;
  logo?: string;
  category?: string;
  ext?: string;
}

interface Episode {
  id: number | string;
  season: number;
  episode: number;
  title: string;
  ext?: string;
}

const TABS: { key: Kind; label: string }[] = [
  { key: "live", label: "Direct TV" },
  { key: "vod", label: "Films" },
  { key: "series", label: "Séries" },
];

const PAGE_SIZE = 60;

export default function IptvPage() {
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const [tab, setTab] = useState<Kind>("live");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const cache = useRef<Record<Kind, Item[]>>({ live: [], vod: [], series: [] });

  // playback state
  const [playing, setPlaying] = useState<{ src: string; title: string } | null>(null);
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [epLoading, setEpLoading] = useState(false);

  useEffect(() => {
    fetch("/api/iptv/config")
      .then((r) => r.json())
      .then((d) => setAgentUrl(d.agentUrl || ""))
      .catch(() => setAgentUrl(""));
  }, []);

  useEffect(() => {
    if (!agentUrl) return;
    setLimit(PAGE_SIZE);
    setQuery("");
    setCategory("");
    if (cache.current[tab].length) {
      setItems(cache.current[tab]);
      return;
    }
    setLoading(true);
    setError("");
    fetch(`${agentUrl}/api/${tab}`)
      .then((r) => r.json())
      .then((d) => {
        const list: Item[] = d.items || [];
        cache.current[tab] = list;
        setItems(list);
      })
      .catch(() => setError("Impossible de contacter ton agent IPTV. Vérifie qu'il est bien lancé sur ton PC."))
      .finally(() => setLoading(false));
  }, [tab, agentUrl]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => i.category && set.add(i.category));
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (i) => (!category || i.category === category) && (!q || i.name.toLowerCase().includes(q))
    );
  }, [items, query, category]);

  const visible = filtered.slice(0, limit);

  const playStream = (kind: Kind, item: Item) => {
    if (!agentUrl) return;
    const ext = item.ext || "mp4";
    const src =
      kind === "live"
        ? `${agentUrl}/stream/live/${item.id}`
        : `${agentUrl}/stream/movie/${item.id}.${ext}`;
    setEpisodes(null);
    setPlaying({ src, title: item.name });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openSeries = async (item: Item) => {
    if (!agentUrl) return;
    setSeriesTitle(item.name);
    setEpLoading(true);
    setEpisodes([]);
    setPlaying(null);
    try {
      const r = await fetch(`${agentUrl}/api/series/${item.id}`);
      const d = await r.json();
      setEpisodes(d.episodes || []);
    } catch {
      setError("Impossible de charger les épisodes.");
    } finally {
      setEpLoading(false);
    }
  };

  const playEpisode = (ep: Episode) => {
    if (!agentUrl) return;
    const ext = ep.ext || "mp4";
    setPlaying({ src: `${agentUrl}/stream/series/${ep.id}.${ext}`, title: `${seriesTitle} — S${ep.season}E${ep.episode}` });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="mb-1 text-3xl font-bold">Mon IPTV</h1>
        <p className="mb-6 text-sm text-gray-400">
          Contenu français en direct depuis ton abonnement, via ton agent maison.
        </p>

        {agentUrl === "" && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-6">
            <h2 className="mb-2 text-lg font-semibold text-purple-300">Agent IPTV non configuré</h2>
            <p className="text-sm text-gray-300">
              Lance le programme <span className="font-mono">Streamora IPTV Agent</span> sur ton PC, puis colle le
              lien qu&apos;il te donne dans la page <span className="font-semibold">Admin → onglet IPTV</span>. Ton
              contenu apparaîtra ici automatiquement.
            </p>
          </div>
        )}

        {playing && (
          <div className="mb-6">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
              <video
                key={playing.src}
                src={playing.src}
                controls
                autoPlay
                playsInline
                className="aspect-video w-full bg-black"
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium">{playing.title}</span>
              <button onClick={() => setPlaying(null)} className="text-xs text-gray-400 hover:text-white">
                Fermer le lecteur
              </button>
            </div>
          </div>
        )}

        {agentUrl && (
          <>
            <div className="mb-5 flex flex-wrap gap-2">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setTab(t.key); setEpisodes(null); }}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    tab === t.key ? "bg-purple-600 text-white" : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {episodes !== null ? (
              <div>
                <button onClick={() => setEpisodes(null)} className="mb-4 text-sm text-purple-300 hover:text-purple-200">
                  ← Retour aux séries
                </button>
                <h2 className="mb-3 text-xl font-semibold">{seriesTitle}</h2>
                {epLoading ? (
                  <p className="text-gray-400">Chargement des épisodes…</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {episodes.map((ep) => (
                      <button
                        key={String(ep.id)}
                        onClick={() => playEpisode(ep)}
                        className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-left text-sm hover:bg-purple-600/20"
                      >
                        <span className="truncate">{ep.title}</span>
                        <span className="ml-2 shrink-0 text-xs text-purple-300">S{ep.season}E{ep.episode}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }}
                    placeholder="Rechercher…"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-purple-500 sm:max-w-xs"
                  />
                  <select
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setLimit(PAGE_SIZE); }}
                    className="w-full rounded-lg border border-white/10 bg-[#16213e] px-4 py-2 text-sm outline-none focus:border-purple-500 sm:max-w-xs"
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {loading && <p className="text-gray-400">Chargement du catalogue…</p>}
                {error && <p className="text-red-400">{error}</p>}

                {!loading && !error && (
                  <>
                    <p className="mb-3 text-xs text-gray-500">{filtered.length} résultats</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                      {visible.map((item) => (
                        <button
                          key={String(item.id)}
                          onClick={() => (tab === "series" ? openSeries(item) : playStream(tab, item))}
                          className="group overflow-hidden rounded-lg bg-white/5 text-left transition-transform hover:scale-[1.03]"
                        >
                          <div className="relative aspect-[2/3] w-full bg-[#16213e]">
                            {item.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.logo} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-gray-400">
                                {item.name}
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="truncate text-xs font-medium">{item.name}</p>
                            {item.category && <p className="truncate text-[10px] text-gray-500">{item.category}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                    {limit < filtered.length && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => setLimit((l) => l + PAGE_SIZE)}
                          className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold hover:bg-purple-500"
                        >
                          Voir plus
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
