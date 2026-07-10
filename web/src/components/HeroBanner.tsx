"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HeroItem {
  id: string;
  title: string;
  description: string;
  category: string;
  posterUrl: string;
  year: number;
  duration?: string;
  type: "film" | "series";
}

export function HeroBanner({ items }: { items: HeroItem[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
        setFade(true);
      }, 500);
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [items.length]);

  const hero = items[currentIndex];

  if (!hero) {
    return (
      <section className="relative h-[70vh] sm:h-[75vh] w-full overflow-hidden">
        <div className="h-full w-full bg-gradient-to-br from-purple-950 via-[#1a1a2e] to-pink-950" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e]/50 to-[#1a1a2e]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 md:p-12 lg:p-16">
          <div className="mx-auto max-w-7xl">
            <Image src="/logo.png" alt="Streamora" width={80} height={80} className="mb-4 rounded-xl" />
            <h1 className="mb-3 text-3xl font-extrabold sm:text-4xl md:text-6xl">
              Bienvenue sur <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Streamora</span>
            </h1>
            <p className="mb-6 max-w-xl text-base text-gray-400 sm:text-lg">
              Vos films et séries préférés, disponibles en streaming.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/films" className="btn-primary text-base px-8 py-3">Explorer les films</Link>
              <Link href="/series" className="btn-secondary text-base px-8 py-3">Voir les séries</Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const href = hero.type === "film" ? `/films/${hero.id}` : `/series/${hero.id}`;

  return (
    <section className="relative h-[70vh] sm:h-[75vh] w-full overflow-hidden">
      {/* Blurred background for atmosphere */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${fade ? "opacity-100" : "opacity-0"}`}>
        {hero.posterUrl && (
          <Image
            src={hero.posterUrl}
            alt=""
            fill
            className="object-cover scale-110 blur-2xl opacity-40"
            sizes="100vw"
          />
        )}
      </div>

      {/* Dark base */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e]/80 via-[#1a1a2e]/60 to-purple-950/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-transparent to-[#1a1a2e]/50" />

      {/* Content layout: text left, poster right */}
      <div className={`absolute inset-0 flex items-center transition-opacity duration-700 ${fade ? "opacity-100" : "opacity-0"}`}>
        <div className="mx-auto max-w-7xl w-full px-6 sm:px-8 md:px-12 lg:px-16 flex items-center gap-8 md:gap-12 lg:gap-16">
          {/* Left: info */}
          <div className="flex-1 min-w-0">
            <span className="mb-3 inline-block rounded bg-purple-600/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider">
              {hero.category}
            </span>
            <h1 className="mb-3 text-2xl font-extrabold sm:text-3xl md:text-4xl lg:text-5xl drop-shadow-2xl leading-tight">
              {hero.title}
            </h1>
            <div className="mb-3 flex items-center gap-3 text-sm text-gray-300">
              <span>{hero.year}</span>
              {hero.duration && <><span className="text-gray-600">|</span><span>{hero.duration}</span></>}
              {hero.type === "series" && <><span className="text-gray-600">|</span><span>Série</span></>}
            </div>
            {hero.description && (
              <p className="mb-5 max-w-md text-sm text-gray-300 line-clamp-3 sm:text-base">
                {hero.description}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <Link href={href} className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3">
                ▶ Regarder
              </Link>
              <Link href="/films" className="btn-secondary text-sm sm:text-base px-6 sm:px-8 py-3">
                Explorer
              </Link>
            </div>
          </div>

          {/* Right: poster - sharp and clear */}
          <div className="hidden sm:block flex-shrink-0">
            <div className="relative w-40 md:w-52 lg:w-64 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl shadow-purple-900/30 ring-1 ring-white/10">
              {hero.posterUrl && (
                <Image
                  src={hero.posterUrl}
                  alt={hero.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width: 768px) 160px, (max-width: 1024px) 208px, 256px"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dots indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 md:bottom-12 md:right-12 flex items-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setFade(false);
                setTimeout(() => {
                  setCurrentIndex(idx);
                  setFade(true);
                }, 300);
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-6 bg-purple-500" : "w-2 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
