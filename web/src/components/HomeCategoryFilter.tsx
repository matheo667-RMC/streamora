"use client";

import { useState } from "react";

interface Props {
  categories: string[];
  section: "films" | "series";
}

export function HomeCategoryFilter({ categories, section }: Props) {
  const [active, setActive] = useState("Par Défaut");
  const allCats = ["Par Défaut", ...categories];

  function handleClick(cat: string) {
    setActive(cat);
    const row = document.getElementById(`${section}-row`);
    if (!row) return;
    const cards = row.querySelectorAll("[data-category]");
    cards.forEach((card) => {
      const el = card as HTMLElement;
      if (cat === "Par Défaut" || el.dataset.category === cat) {
        el.style.display = "";
      } else {
        el.style.display = "none";
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {allCats.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          className={`rounded px-3 py-1.5 text-xs font-medium transition-all ${
            active === cat
              ? "bg-white/15 text-white border border-white/20"
              : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10 hover:text-white"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
