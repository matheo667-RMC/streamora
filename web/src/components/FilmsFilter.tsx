"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

export function FilmsFilter({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const activeCategory = searchParams.get("category") ?? "Toutes";
  const activeYear = searchParams.get("year") ?? "";
  const activeSort = searchParams.get("sort") ?? "recent";

  const basePath = pathname.startsWith("/series") ? "/series" : "/films";

  function applyFilter(opts?: { cat?: string; query?: string; year?: string; sort?: string }) {
    const params = new URLSearchParams();
    const c = opts?.cat ?? activeCategory;
    const q = opts?.query ?? search;
    const y = opts?.year ?? activeYear;
    const s = opts?.sort ?? activeSort;
    if (c && c !== "Toutes") params.set("category", c);
    if (q) params.set("q", q);
    if (y) params.set("year", y);
    if (s && s !== "recent") params.set("sort", s);
    router.push(`${basePath}?${params.toString()}`);
  }

  const years: number[] = [];
  for (let y = new Date().getFullYear() + 1; y >= 1950; y--) years.push(y);

  return (
    <div className="mb-6 space-y-4">
      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); applyFilter({ query: search }); }}
        className="relative max-w-md"
      >
        <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={basePath === "/series" ? "Rechercher une série..." : "Rechercher un film..."}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value === "") applyFilter({ query: "" });
          }}
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); applyFilter({ query: "" }); }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => applyFilter({ cat })}
            className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeCategory === cat
                ? "bg-purple-600 text-white shadow-lg shadow-purple-900/30 scale-105"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Year + sort */}
      <div className="flex flex-wrap gap-2">
        <select
          value={activeYear}
          onChange={(e) => applyFilter({ year: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="">Toutes les années</option>
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          value={activeSort}
          onChange={(e) => applyFilter({ sort: e.target.value })}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
        >
          <option value="recent">Plus récents</option>
          <option value="year_desc">Année (récent → ancien)</option>
          <option value="year_asc">Année (ancien → récent)</option>
          <option value="title">Titre (A → Z)</option>
        </select>
      </div>
    </div>
  );
}
