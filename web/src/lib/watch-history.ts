const STORAGE_KEY = "streamora_watch_history";
const MAX_ITEMS = 50;

export interface WatchHistoryItem {
  id: string;
  type: "film" | "episode";
  title: string;
  posterUrl?: string;
  filmId?: string;
  seriesId?: string;
  seriesTitle?: string;
  season?: number;
  episodeNumber?: number;
  videoUrl: string;
  timestamp: number;
  progress?: number;
}

function getHistory(): WatchHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: WatchHistoryItem[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // localStorage full or unavailable
  }
}

export function addToHistory(item: Omit<WatchHistoryItem, "timestamp">) {
  const history = getHistory();
  const existing = history.findIndex(h => h.id === item.id && h.type === item.type);
  if (existing !== -1) {
    history.splice(existing, 1);
  }
  history.unshift({ ...item, timestamp: Date.now() });
  saveHistory(history);
}

export function getWatchHistory(): WatchHistoryItem[] {
  return getHistory();
}

export function getLastWatched(id: string, type: "film" | "episode"): WatchHistoryItem | null {
  const history = getHistory();
  return history.find(h => h.id === id && h.type === type) || null;
}

export function getLastWatchedForSeries(seriesId: string): WatchHistoryItem | null {
  const history = getHistory();
  return history.find(h => h.seriesId === seriesId && h.type === "episode") || null;
}

export function removeFromHistory(id: string, type: "film" | "episode") {
  saveHistory(getHistory().filter((h) => !(h.id === id && h.type === type)));
}

export function clearHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
