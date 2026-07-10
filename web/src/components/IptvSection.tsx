"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

const PAGE_SIZE = 24;

const TITLES: Record<Kind, string> = {
  vod: "Depuis mon IPTV",
  series: "Depuis mon IPTV",
  live: "Depuis mon IPTV",
};

export function IptvSection({ kind }: { kind: Kind }) {
  const [agentUrl, setAgentUrl] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [playing, setPlaying] = useState<{ src: string; title: string } | null>(null);
  const [episodes, setEpisodes] = useState<Episode[] | null>(null);
  const [seriesTitle, setSeriesTitle] = useState("");
  const playerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/iptv/config")
      .then((r) => r.json())
      .then((d) => setAgentUrl(d.agentUrl || ""))
      .catch(() => setAgentUrl(""));
  }, []);

  useEffect(() => {
    if (!agentUrl) return;
    setLoading(true);
    setFailed(false);
    fetch(`${agentUrl}/api/${kind}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [agentUrl, kind]);

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

  const scrollToPlayer = () => playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const playStream = (item: Item) => {
    if (!agentUrl) return;
    const ext = item.ext || "mp4";
    const src = kind === "live" ? `${agentUrl}/stream/live/${item.id}` : `${agentUrl}/stream/movie/${item.id}.${ext}`;
    setEpisodes(null);
    setPlaying({ src, title: item.name });
    setTimeout(scrollToPlayer, 50);
  };

  const openSeries = async (item: Item) => {
    if (!agentUrl) return;
    setSeriesTitle(item.name);
    setEpisodes([]);
    setPlaying(null);
    try {
      const d = await fetch(`${agentUrl}/api/series/${item.id}`).then((r) => r.json());
      setEpisodes(d.episodes || []);
    } catch {
      setEpisodes([]);
    }
    setTimeout(scrollToPlayer, 50);
  };

  const playEpisode = (ep: Episode) => {
    if (!agentUrl) return;
    const ext = ep.ext || "mp4";
    setPlaying({ src: `${agentUrl}/stream/series/${ep.id}.${ext}`, title: `${seriesTitle} — S${ep.season}E${ep.episode}` });
    setTimeout(scrollToPlayer, 50);
  };

  // Nothing to show if the agent isn't configured or unreachable.
  if (!agentUrl || failed || (!loading && items.length === 0)) return null;

  const visible = filtered.slice(0, limit);

  return (
    <section ref={playerRef} className="mt-10 border-t border-white/10 pt-8">
      <div className="mb-4 flex items-center gap-2">
        <span className="rounded-md bg-purple-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">IPTV</span>
        <h2 className="text-xl font-bold">{TITLES[kind]}</h2>
      </div>

      {playing && (
        <div className="mb-6">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
            <video key={playing.src} src={playing.src} controls autoPlay playsInline className="aspect-video w-full bg-black" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm font-medium">{playing.title}</span>
            <button onClick={() => setPlaying(null)} className="text-xs text-gray-400 hover:text-white">Fermer le lecteur</button>
          </div>
        </div>
      )}

      {episodes !== null ? (
        <div>
          <button onClick={() => setEpisodes(null)} className="mb-4 text-sm text-purple-300 hover:text-purple-200">← Retour</button>
          <h3 className="mb-3 text-lg font-semibold">{seriesTitle}</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {episodes.map((ep) => (
              <button key={String(ep.id)} onClick={() => playEpisode(ep)}
                className="flex items-center justify-between rounded-lg bg-white/5 px-4 py-3 text-left text-sm hover:bg-purple-600/20">
                <span className="truncate">{ep.title}</span>
                <span className="ml-2 shrink-0 text-xs text-purple-300">S{ep.season}E{ep.episode}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row">
            <input value={query} onChange={(e) => { setQuery(e.target.value); setLimit(PAGE_SIZE); }} placeholder="Rechercher dans mon IPTV…"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm outline-none focus:border-purple-500 sm:max-w-xs" />
            <select value={category} onChange={(e) => { setCategory(e.target.value); setLimit(PAGE_SIZE); }}
              className="w-full rounded-lg border border-white/10 bg-[#16213e] px-4 py-2 text-sm outline-none focus:border-purple-500 sm:max-w-xs">
              <option value="">Toutes les catégories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading && <p className="text-gray-400">Chargement de ton IPTV…</p>}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {visible.map((item) => (
              <button key={String(item.id)} onClick={() => (kind === "series" ? openSeries(item) : playStream(item))}
                className="group overflow-hidden rounded-lg bg-white/5 text-left transition-transform hover:scale-[1.03]">
                <div className="relative aspect-[2/3] w-full bg-[#16213e]">
                  {item.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.logo} alt={item.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs text-gray-400">{item.name}</div>
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
              <button onClick={() => setLimit((l) => l + PAGE_SIZE)} className="rounded-lg bg-purple-600 px-6 py-2 text-sm font-semibold hover:bg-purple-500">Voir plus</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
