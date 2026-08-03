import Link from "next/link";

export function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-emerald-600 to-green-600 px-4 py-2 text-sm font-bold text-white shadow-md shadow-emerald-600/20 hover:from-emerald-500 hover:to-green-500 transition-colors"
      >
        {title}
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
      <Link
        href={href}
        className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/20 transition-colors"
      >
        Voir La Suite
        <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M4 6h16v2H4zM4 11h16v2H4zM4 16h16v2H4z" /></svg>
      </Link>
    </div>
  );
}

export type PosterItem = {
  id: string;
  title: string;
  posterUrl: string | null;
  kind: "films" | "series";
  topLeft?: string;
  topRight?: string;
};

export function PosterCard({ item }: { item: PosterItem }) {
  return (
    <Link href={`/${item.kind}/${item.id}`} className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-[#1c1c1c] ring-1 ring-white/5">
        {item.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.posterUrl}
            alt={item.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-white/20">🎬</div>
        )}

        {item.topLeft && (
          <span className="absolute left-0 top-0 rounded-br-md bg-black/80 px-2 py-1 text-[10px] font-bold uppercase text-white">
            {item.topLeft}
          </span>
        )}
        {item.topRight && (
          <span className="absolute right-0 top-0 rounded-bl-md bg-gradient-to-r from-emerald-600 to-green-600 px-2 py-1 text-[10px] font-bold uppercase text-white">
            {item.topRight}
          </span>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-green-600 text-white shadow-lg">
            <svg className="h-6 w-6 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </div>
      </div>
      <p className="mt-2 truncate text-center text-sm text-gray-200 group-hover:text-emerald-400 transition-colors">
        {item.title}
      </p>
    </Link>
  );
}
