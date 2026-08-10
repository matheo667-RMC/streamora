"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Steps = { title: string; steps: string[] };

/** Sans l'evenement d'installation (iPhone, Firefox, Safari Mac...), le bouton
 *  doit quand meme expliquer quoi faire au lieu de ne rien faire du tout. */
function manualSteps(): Steps {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const firefox = /Firefox/i.test(ua);
  const safari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua);

  if (iOS) {
    return {
      title: "Installer sur iPhone / iPad",
      steps: [
        "Ouvre Streamora dans Safari (pas Chrome).",
        "Appuie sur le bouton Partager (le carré avec une flèche vers le haut).",
        "Descends et choisis « Sur l'écran d'accueil ».",
        "Appuie sur « Ajouter » : l'icône Streamora apparaît sur ton écran.",
      ],
    };
  }
  if (android) {
    return {
      title: "Installer sur Android",
      steps: [
        firefox
          ? "Ouvre le menu ⋮ en haut à droite."
          : "Ouvre le menu ⋮ en haut à droite de Chrome.",
        "Choisis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).",
        "Confirme avec « Installer ».",
      ],
    };
  }
  if (safari) {
    return {
      title: "Installer sur Mac",
      steps: [
        "Dans Safari, menu « Fichier ».",
        "Choisis « Ajouter au Dock ».",
      ],
    };
  }
  return {
    title: "Installer sur PC",
    steps: [
      "Utilise Chrome, Edge ou Brave.",
      "Clique sur l'icône d'installation (un écran avec une flèche) tout à droite de la barre d'adresse.",
      "Sinon : menu ⋮ → « Installer Streamora… ».",
    ],
  };
}

export function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  const [help, setHelp] = useState<Steps | null>(null);

  useEffect(() => {
    // Register service worker + watch for new versions.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        // A version is already waiting to activate.
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
        }
        // A new version is being installed.
        reg.addEventListener("updatefound", () => {
          const nw = reg.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              setWaitingWorker(nw);
            }
          });
        });
        // Check for updates on load and every 60s.
        reg.update().catch(() => {});
        setInterval(() => reg.update().catch(() => {}), 60000);
      }).catch(() => {});

      // When the new worker takes control, reload once to load fresh assets.
      let refreshed = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshed) return;
        refreshed = true;
        window.location.reload();
      });
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (standalone) setIsInstalled(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleUpdate() {
    if (!waitingWorker) return;
    setUpdating(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }

  async function handleInstall() {
    if (!deferredPrompt) {
      setHelp(manualSteps());
      return;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") setIsInstalled(true);
      setDeferredPrompt(null);
    } catch {
      setHelp(manualSteps());
    }
  }

  const updateButton = waitingWorker ? (
    <button
      onClick={handleUpdate}
      disabled={updating}
      className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-green-500 px-5 py-3 sm:py-2.5 text-sm font-semibold text-black hover:bg-green-400 transition-colors shadow-lg shadow-green-900/30 disabled:opacity-60 animate-pulse"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {updating ? "Mise à jour…" : "Mettre à jour"}
    </button>
  ) : null;

  const helpModal = help ? (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 p-4"
      onClick={() => setHelp(null)}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950 p-5 text-left"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-3 text-base font-semibold text-white">{help.title}</h3>
        <ol className="space-y-2 text-sm text-gray-300">
          {help.steps.map((s, i) => (
            <li key={i} className="flex gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {i + 1}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
        <button
          onClick={() => setHelp(null)}
          className="mt-5 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
        >
          J&apos;ai compris
        </button>
      </div>
    </div>
  ) : null;

  if (isInstalled) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {updateButton}
        <div className="flex items-center gap-2 text-sm text-green-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Application installée
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col sm:w-auto sm:flex-row items-center gap-3">
      {updateButton}
      <button
        onClick={handleInstall}
        className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 sm:py-2.5 text-sm font-medium text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/30"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Installer l&apos;application
      </button>
      <span className="text-xs text-gray-500">Disponible sur PC et téléphone</span>
      {helpModal}
    </div>
  );
}
