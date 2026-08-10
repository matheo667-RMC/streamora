"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

/** The PC server opens this page itself with its public address, so the site
 *  learns where to reach it without anyone copying a key or a link. */
function Connect() {
  const url = (useSearchParams().get("u") || "").trim();
  const [state, setState] = useState<"loading" | "ok" | "denied" | "error">("loading");

  useEffect(() => {
    if (!url) {
      setState("error");
      return;
    }
    fetch("/api/server-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverBaseUrl: url }),
    })
      .then(async (r) => {
        if (!r.ok) {
          setState(r.status === 403 ? "denied" : "error");
          return;
        }
        setState("ok");
        // Hand the sync key to the server so it can republish its address by
        // itself when the public link changes, without reopening this page.
        try {
          const key = (await (await fetch("/api/server-url", { cache: "no-store" })).json()).serverSyncKey;
          if (key) {
            await fetch(`${url.replace(/\/+$/, "")}/sync-key`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key }),
            });
          }
        } catch {
          /* le serveur rouvrira cette page au prochain lien */
        }
      })
      .catch(() => setState("error"));
  }, [url]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        {state === "loading" && <p className="text-gray-300">Connexion de ton serveur…</p>}

        {state === "ok" && (
          <>
            <div className="mb-3 text-4xl">&#x2714;</div>
            <h1 className="mb-2 text-xl font-bold text-emerald-400">Ton serveur est connecté</h1>
            <p className="text-sm text-gray-400">
              Tes vidéos sont accessibles. Tu peux fermer cette page — mais garde la fenêtre du serveur ouverte.
            </p>
            <Link href="/admin" className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500">
              Aller dans l&apos;Admin
            </Link>
          </>
        )}

        {state === "denied" && (
          <>
            <h1 className="mb-2 text-xl font-bold">Connecte-toi d&apos;abord</h1>
            <p className="text-sm text-gray-400">Ouvre ce lien avec ton compte administrateur, puis recharge la page.</p>
            <Link href="/login" className="mt-6 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500">
              Se connecter
            </Link>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="mb-2 text-xl font-bold text-red-400">Connexion impossible</h1>
            <p className="text-sm text-gray-400">Relance le serveur sur ton PC : il rouvrira cette page tout seul.</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ConnectPage() {
  return (
    <Suspense fallback={null}>
      <Connect />
    </Suspense>
  );
}
