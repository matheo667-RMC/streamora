"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function FilmsFilter({ categories }: { categories: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const activeCategory = searchParams.get("category") ?? "Toutes";

  function applyFilter(cat?: string, query?: string) {
    const params = new URLSearchParams();
    const c = cat ?? activeCategory;
    const q = query ?? search;
    if (c && c !== "Toutes") params.set("category", c);
    if (q) params.set("q", q);
    router.push(`/films?${params.toString()}`);
  }

  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => applyFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              activeCategory === cat
                ? "bg-purple-600 text-white"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          applyFilter(undefined, search);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          placeholder="Rechercher un film..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field max-w-md"
        />
        <button type="submit" className="btn-primary">
          Rechercher
        </button>
      </form>
    </div>
  );
}
