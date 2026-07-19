"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Sub {
  hasAccess: boolean; founder: boolean; planLabel: string;
  planExpiresAt: string | null; badges: string[]; watchSeconds: number;
}
interface Item { id: string; status: string; mediaType: string; mediaId: string; title: string; posterUrl: string }

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

const SECTIONS = [
  { status: "list", label: "Ma liste" },
  { status: "later", label: "À regarder plus tard" },
  { status: "watched", label: "Déjà vu" },
];

export function AccountExtras() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    fetch("/api/subscription").then((r) => r.json()).then(setSub).catch(() => {});
    fetch("/api/library").then((r) => r.json()).then((d) => setItems(d.items || [])).catch(() => {});
  }, []);

  const byStatus = (s: string) => items.filter((i) => i.status === s);

  return (
    <>
      {/* Subscription + stats */}
      <div className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Mon abonnement & statistiques</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/10 p-4">
            <div className="text-xs text-gray-400">Abonnement</div>
            <div className="text-lg font-bold">
              {sub?.founder ? "Fondateur" : sub?.hasAccess ? sub.planLabel : "Gratuit"}
            </div>
            {sub?.planExpiresAt && !sub.founder && (
              <div className="text-[10px] text-gray-500 mt-1">Expire le {new Date(sub.planExpiresAt).toLocaleDateString("fr-FR")}</div>
            )}
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-xs text-gray-400">Temps total</div>
            <div className="text-lg font-bold">{fmtTime(sub?.watchSeconds || 0)}</div>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <div className="text-xs text-gray-400">Déjà vu</div>
            <div className="text-lg font-bold">{byStatus("watched").length}</div>
          </div>
        </div>
        {sub?.badges && sub.badges.length > 0 && (
          <div className="mt-4">
            <div className="text-xs text-gray-400 mb-2">Badges</div>
            <div className="flex flex-wrap gap-2">
              {sub.badges.map((b) => (
                <span key={b} className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1 text-xs font-semibold">{b}</span>
              ))}
            </div>
          </div>
        )}
        {!sub?.hasAccess && !sub?.founder && (
          <Link href="/payer" className="mt-4 inline-block rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-5 py-2.5 text-sm font-semibold">
            Passer Premium
          </Link>
        )}
      </div>

      {/* Library */}
      {SECTIONS.map((sec) => {
        const list = byStatus(sec.status);
        return (
          <div key={sec.status} className="rounded-2xl border border-white/10 bg-gray-900/50 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">{sec.label}</h2>
            {list.length === 0 ? (
              <p className="text-sm text-gray-500">Rien pour l&apos;instant.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {list.map((it) => (
                  <Link key={it.id} href={`/${it.mediaType === "film" ? "films" : "series"}/${it.mediaId}`} className="group">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-800 ring-1 ring-white/10 group-hover:ring-purple-500/50">
                      {it.posterUrl && <Image src={it.posterUrl} alt={it.title} fill className="object-cover" sizes="120px" />}
                    </div>
                    <p className="mt-1 text-xs text-center text-gray-300 line-clamp-2">{it.title}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
