import Link from "next/link";
import Image from "next/image";

export interface RowItem {
  id: string;
  title: string;
  posterUrl: string | null;
  category: string | null;
  kind: "films" | "series";
  badge?: string;
}

interface Props {
  title: string;
  href: string;
  items: RowItem[];
}

export function MediaRow({ title, href, items }: Props) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3 px-1">
        <Link href={href} className="group flex items-center gap-1.5 text-lg font-bold text-white hover:text-emerald-300 transition-colors">
          {title}
          <svg className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </Link>
      </div>
      <div className="flex gap-2.5 sm:gap-3 overflow-x-auto pb-3 scrollbar-hide">
        {items.map((it) => (
          <Link key={`${it.kind}-${it.id}`} href={`/${it.kind}/${it.id}`} className="flex-none w-[120px] sm:w-[145px] md:w-[165px] group">
            <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-gray-900 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-emerald-500/70 group-hover:scale-[1.06] group-hover:z-10 group-hover:shadow-2xl group-hover:shadow-emerald-900/40">
              {it.posterUrl ? (
                <Image src={it.posterUrl} alt={it.title} fill className="object-cover" sizes="165px" />
              ) : (
                <div className="flex h-full items-center justify-center bg-gradient-to-br from-emerald-900/30 to-green-900/30 text-gray-600">
                  <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" /></svg>
                </div>
              )}
              <div className="absolute top-1.5 left-1.5">
                <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold leading-none">HD</span>
              </div>
              {it.badge && (
                <div className="absolute top-1.5 right-1.5">
                  <span className="rounded bg-green-600/90 px-1.5 py-0.5 text-[9px] font-bold leading-none">{it.badge}</span>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[11px] font-medium text-white line-clamp-2">{it.title}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
