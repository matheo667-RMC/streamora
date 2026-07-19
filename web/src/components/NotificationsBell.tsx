"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

interface Notif {
  id: string; type: string; title: string; message: string; href: string; posterUrl: string | null; createdAt: string;
}

const SEEN_KEY = "streamora_notifs_seen";

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unseen, setUnseen] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d) => {
        const list: Notif[] = d.notifications || [];
        setNotifs(list);
        const seen = typeof window !== "undefined" ? localStorage.getItem(SEEN_KEY) : null;
        const seenIds = new Set(seen ? JSON.parse(seen) : []);
        setUnseen(list.filter((n) => !seenIds.has(n.id)).length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function toggle() {
    setOpen((o) => !o);
    if (!open) {
      setUnseen(0);
      if (typeof window !== "undefined") {
        localStorage.setItem(SEEN_KEY, JSON.stringify(notifs.map((n) => n.id)));
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} className="relative p-2 rounded-full hover:bg-white/10 transition-colors" aria-label="Notifications">
        <svg className="h-5 w-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unseen > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-pink-600 text-[9px] font-bold flex items-center justify-center">{unseen > 9 ? "9+" : unseen}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl border border-white/10 bg-[#151525] shadow-2xl z-50">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold">Notifications</div>
          {notifs.length === 0 ? (
            <div className="px-4 py-6 text-sm text-gray-500 text-center">Aucune notification.</div>
          ) : (
            notifs.map((n) => (
              <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0">
                <div className="relative h-14 w-10 rounded overflow-hidden bg-gray-800 shrink-0">
                  {n.posterUrl && <Image src={n.posterUrl} alt="" fill className="object-cover" sizes="40px" />}
                </div>
                <div className="min-w-0">
                  <div className={`text-[10px] font-bold uppercase ${n.type === "reminder" ? "text-yellow-400" : "text-purple-400"}`}>{n.title}</div>
                  <div className="text-sm text-gray-200 line-clamp-2">{n.message}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
