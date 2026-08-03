"use client";

import { useState } from "react";
import { SectionHeader, PosterCard, PosterItem } from "@/components/Papy";

interface Props {
  trending: PosterItem[];
  latest: PosterItem[];
  films: PosterItem[];
  series: PosterItem[];
}

type Tab = "all" | "films" | "series";

function Grid({ items }: { items: PosterItem[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
      {items.map((it) => <PosterCard key={`${it.kind}-${it.id}`} item={it} />)}
    </div>
  );
}

export function HomeBrowser({ trending, latest, films, series }: Props) {
  const [tab, setTab] = useState<Tab>("all");

  const tabs: { id: Tab; label: string }[] = [
    { id: "all", label: "Tout" },
    { id: "films", label: "Films" },
    { id: "series", label: "Séries" },
  ];

  return (
    <div className="space-y-12">
      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              tab === t.id
                ? "bg-gradient-to-r from-emerald-600 to-green-600 text-white"
                : "bg-white/5 text-gray-300 hover:bg-white/10"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "all" && (
        <>
          {trending.length > 0 && (
            <section>
              <SectionHeader title="Tendances de la semaine" href="/films" />
              <Grid items={trending} />
            </section>
          )}
          {latest.length > 0 && (
            <section>
              <SectionHeader title="Derniers ajouts" href="/films" />
              <Grid items={latest} />
            </section>
          )}
        </>
      )}

      {tab === "films" && (
        <section>
          <SectionHeader title="Films" href="/films" />
          {films.length > 0 ? <Grid items={films} /> : <p className="text-sm text-gray-500">Aucun film pour le moment.</p>}
        </section>
      )}

      {tab === "series" && (
        <section>
          <SectionHeader title="Séries" href="/series" />
          {series.length > 0 ? <Grid items={series} /> : <p className="text-sm text-gray-500">Aucune série pour le moment.</p>}
        </section>
      )}
    </div>
  );
}
