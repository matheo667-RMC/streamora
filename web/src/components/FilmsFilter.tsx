"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";

export function FilmsFilter({ categories }: { categories: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const activeCategory = searchParams.get("category") ?? "Toutes";

  const basePath = pathname.startsWith("/series") ? "/series" : "/films";

  function applyFilter(cat?: string, query?: string) {
    const params = new URLSearchParams();
    const c = cat ?? activeCategory;
    const q = query ?? search;
    if (c && c !== "Toutes") params.set("category", c);
    if (q) params.set("q", q);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="mb-6 space-y-4">
      {/* Search bar */}
      <form
        onSubmit={(e) => { e.preventDefault(); applyFilter(undefined, search); }}
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
            if (e.target.value === "") applyFilter(undefined, "");
          }}
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => { setSearch(""); applyFilter(undefined, ""); }}
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
            onClick={() => applyFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeCategory === cat
                ? "bg-red-600 text-white shadow-lg shadow-red-900/30 scale-105"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5 hover:border-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
}
