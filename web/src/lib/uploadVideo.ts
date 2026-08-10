// Un lien public plafonne la taille d'une requete, mais en local on peut
// envoyer de gros morceaux : bien plus rapide.
const CHUNK = 6 * 1024 * 1024;
const LOCAL_CHUNK = 48 * 1024 * 1024;
const LOCAL_BASES = ["http://127.0.0.1:8090", "http://localhost:8090"];
export const PENDING_KEY = "streamora-upload-pending";

export type Pending = { id: string; name: string; size: number; lastModified: number };

export function readPending(): Pending | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    return null;
  }
}

export function clearPending() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {
    /* ignore */
  }
}

export async function serverBase(): Promise<string> {
  try {
    const res = await fetch("/api/server-url", { cache: "no-store" });
    return ((await res.json()).serverBaseUrl || "").replace(/\/+$/, "");
  } catch {
    return "";
  }
}

/** Sur le PC qui heberge le serveur, passer par 127.0.0.1 evite l'aller-retour
 *  par Internet : l'envoi se fait a la vitesse du disque au lieu du debit
 *  montant de la box (des heures de gagnees sur un film). */
export async function fastBase(fallback: string): Promise<string> {
  for (const base of LOCAL_BASES) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 1500);
      const res = await fetch(`${base}/api/ping`, { cache: "no-store", signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) return base;
    } catch {
      /* pas sur le meme PC : on garde l'adresse publique */
    }
  }
  return fallback;
}

export const NO_SERVER =
  "Ton serveur n'est pas lancé. Ouvre streamora_server.py sur ton PC (il enregistre son adresse tout seul), puis réessaie.";

function sendChunk(
  base: string,
  filename: string,
  uploadId: string,
  offset: number,
  isLast: boolean,
  blob: Blob,
  onProg: (loaded: number) => void
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/upload`);
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.setRequestHeader("X-Filename", encodeURIComponent(filename));
    xhr.setRequestHeader("X-Upload-Id", uploadId);
    xhr.setRequestHeader("X-Offset", String(offset));
    xhr.setRequestHeader("X-Last", isLast ? "1" : "0");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProg(e.loaded);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Réponse du serveur invalide"));
        }
      } else {
        reject(new Error(`Le serveur a répondu ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Impossible de joindre ton serveur (est-il bien lancé ?)"));
    xhr.send(blob);
  });
}

/** Sends a video to the user's own hard drive through their PC server.
 *  Public tunnels cap request size, so the file goes in chunks — and an
 *  interrupted upload resumes where it stopped instead of restarting. */
export async function uploadVideo(file: File, onProgress: (percent: number) => void): Promise<string> {
  const base = await serverBase();
  if (!base) throw new Error(NO_SERVER);
  // On envoie au plus vite, mais l'URL gardee reste l'adresse publique pour que
  // les autres appareils puissent lire la video.
  const sendBase = await fastBase(base);

  const saved = readPending();
  const resumable =
    !!saved && saved.name === file.name && saved.size === file.size && saved.lastModified === file.lastModified;
  const uploadId = resumable ? saved!.id : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  let offset = 0;
  if (resumable) {
    try {
      const res = await fetch(`${sendBase}/upload/status?id=${encodeURIComponent(uploadId)}`, { cache: "no-store" });
      offset = Math.min(Number((await res.json()).received) || 0, file.size);
    } catch {
      offset = 0;
    }
  }

  try {
    localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ id: uploadId, name: file.name, size: file.size, lastModified: file.lastModified })
    );
  } catch {
    /* ignore */
  }

  const chunk = LOCAL_BASES.includes(sendBase) ? LOCAL_CHUNK : CHUNK;
  onProgress(Math.round((offset / file.size) * 100));
  for (;;) {
    const slice = file.slice(offset, offset + chunk);
    const isLast = offset + chunk >= file.size;
    const sent = offset;
    const res = await sendChunk(sendBase, file.name, uploadId, sent, isLast, slice, (loaded) =>
      onProgress(Math.min(100, Math.round(((sent + loaded) / file.size) * 100)))
    );
    offset += slice.size;
    if (isLast) {
      clearPending();
      onProgress(100);
      return res.url.startsWith("http") ? res.url : `${base}${res.url}`;
    }
  }
}
