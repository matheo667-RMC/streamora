#!/usr/bin/env python3
"""
Streamora IPTV Agent
====================
Tourne sur TON PC (a la maison). Comme ton abonnement IPTV n'autorise que ton
IP maison, ce programme lit l'IPTV depuis chez toi, garde uniquement le contenu
FRANCAIS, le convertit en format lisible par navigateur, et l'expose a ton site
Streamora via un lien securise (tunnel Cloudflare).

- Ton lien IPTV est stocke UNIQUEMENT sur ton PC (config.json), jamais en ligne.
- Necessite ffmpeg (pour convertir les flux) et cloudflared (pour le tunnel).
  Le programme les telecharge automatiquement sous Windows s'ils manquent.

Usage: python streamora_iptv_agent.py
"""

import os
import re
import sys
import json
import time
import shutil
import subprocess
import threading
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")
BIN_DIR = os.path.join(BASE_DIR, "bin")
PORT = 8091

FR_RE = re.compile(r"(^|[^A-Z])(FR|VF|VFF|VFQ|FRANCE|FRENCH|FRANCAIS|FRAN\u00c7AIS)([^A-Z]|$)", re.IGNORECASE)
# Markers that indicate NON-French (foreign language) categories to exclude.
FOREIGN_MARKERS = [
    "SUB-AR", "DUB-AR", "-AR ", " AR ", "ARAB", "TURQ", "TURK", "ALGER", "TUNIS",
    "MAROC", "ASIAN", "K-DRAMA", "KDRAMA", "VOST", "ESPA", "LATINO", "PORTUG",
    "BRASIL", "ITALIA", "DEUTSCH", "GERMAN", "ENGLISH", "RUSS", "HINDI", "BOLLY",
    "DUTCH", "POLSK", "ALBAN", "EX-YU", "EXYU", "CARTOON ARABY",
]
# Adult / explicit markers to always exclude.
ADULT_MARKERS = ["XXX", "ADULT", "ADULTE", "PORN", "EROT", "+18", "18+", "\U0001f51e"]

_catalog_cache = {}


# --------------------------- config / IPTV account ---------------------------

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2, ensure_ascii=False)


def parse_iptv_url(url):
    """Extract scheme/host/port/user/pass from a get.php or player_api URL."""
    u = urllib.parse.urlparse(url.strip())
    qs = urllib.parse.parse_qs(u.query)
    host = u.hostname or ""
    port = u.port or (443 if u.scheme == "https" else 80)
    user = (qs.get("username") or [""])[0]
    pwd = (qs.get("password") or [""])[0]
    scheme = u.scheme or "http"
    return {"scheme": scheme, "host": host, "port": port, "user": user, "pass": pwd}


def get_account(cfg):
    url = cfg.get("iptv_url", "").strip()
    if not url:
        print("\n=== Configuration IPTV (une seule fois) ===")
        print("Colle ton lien IPTV complet (celui avec username= et password=) :")
        url = input("> ").strip()
        cfg["iptv_url"] = url
        save_config(cfg)
    acc = parse_iptv_url(url)
    if not acc["host"] or not acc["user"]:
        print("!! Lien IPTV invalide. Supprime config.json et relance.")
        sys.exit(1)
    return acc


def api_base(acc):
    return f"{acc['scheme']}://{acc['host']}:{acc['port']}"


def player_api(acc, action=None, **params):
    q = {"username": acc["user"], "password": acc["pass"]}
    if action:
        q["action"] = action
    q.update(params)
    url = f"{api_base(acc)}/player_api.php?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"User-Agent": "VLC/3.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


# --------------------------- catalog (FR only) ---------------------------

def is_foreign(name):
    up = (name or "").upper()
    return any(m in up for m in FOREIGN_MARKERS) or any(m in up for m in ADULT_MARKERS)


def is_adult(name):
    up = (name or "").upper()
    return any(m in up for m in ADULT_MARKERS)


def is_fr(name):
    """VOD/live: keep only categories with an explicit FR/VF/FRANCE marker."""
    return bool(FR_RE.search(name or "")) and not is_foreign(name)


def is_fr_series(name):
    """Series categories have no FR tag; keep 'Séries ...' minus foreign ones."""
    if is_foreign(name):
        return False
    up = (name or "").upper()
    return up.startswith("SERIES") or up.startswith("SÉRIES") or up.startswith("S\u00c9RIES") or FR_RE.search(name or "")


def build_category_index(acc, kind):
    """kind: live | vod | series -> {category_id: name} for French categories."""
    action = {"live": "get_live_categories", "vod": "get_vod_categories", "series": "get_series_categories"}[kind]
    keep = is_fr_series if kind == "series" else is_fr
    cats = player_api(acc, action)
    return {c["category_id"]: c["category_name"] for c in cats if keep(c.get("category_name", ""))}


def fetch_live(acc):
    cats = build_category_index(acc, "live")
    streams = player_api(acc, "get_live_streams")
    out = []
    for s in streams:
        cid = str(s.get("category_id"))
        if cid in cats and not is_adult(s.get("name")):
            out.append({
                "id": s.get("stream_id"),
                "name": s.get("name"),
                "logo": s.get("stream_icon") or "",
                "category": cats[cid],
            })
    return out


def fetch_vod(acc):
    cats = build_category_index(acc, "vod")
    streams = player_api(acc, "get_vod_streams")
    out = []
    for s in streams:
        cid = str(s.get("category_id"))
        if cid in cats and not is_adult(s.get("name")):
            out.append({
                "id": s.get("stream_id"),
                "name": s.get("name"),
                "logo": s.get("stream_icon") or s.get("cover") or "",
                "category": cats[cid],
                "ext": s.get("container_extension") or "mp4",
                "rating": s.get("rating") or "",
                "added": s.get("added") or "",
            })
    return out


def fetch_series(acc):
    cats = build_category_index(acc, "series")
    streams = player_api(acc, "get_series")
    out = []
    for s in streams:
        cid = str(s.get("category_id"))
        if cid in cats and not is_adult(s.get("name")):
            out.append({
                "id": s.get("series_id"),
                "name": s.get("name"),
                "logo": s.get("cover") or "",
                "category": cats[cid],
                "plot": s.get("plot") or "",
            })
    return out


def cached(acc, kind, ttl=1800):
    now = time.time()
    entry = _catalog_cache.get(kind)
    if entry and now - entry[0] < ttl:
        return entry[1]
    data = {"live": fetch_live, "vod": fetch_vod, "series": fetch_series}[kind](acc)
    _catalog_cache[kind] = (now, data)
    return data


def series_info(acc, series_id):
    info = player_api(acc, "get_series_info", series_id=series_id)
    episodes = []
    eps = info.get("episodes") or {}
    for season_num, ep_list in eps.items():
        for e in ep_list:
            episodes.append({
                "id": e.get("id"),
                "season": int(season_num) if str(season_num).isdigit() else e.get("season", 1),
                "episode": e.get("episode_num"),
                "title": e.get("title") or f"Episode {e.get('episode_num')}",
                "ext": e.get("container_extension") or "mp4",
            })
    episodes.sort(key=lambda x: (x["season"], x["episode"] or 0))
    return episodes


# --------------------------- streaming (ffmpeg) ---------------------------

def ffmpeg_path():
    local = os.path.join(BIN_DIR, "ffmpeg.exe")
    if os.path.exists(local):
        return local
    return shutil.which("ffmpeg") or "ffmpeg"


def source_url(acc, kind, stream_id, ext="ts"):
    b = api_base(acc)
    u, p = acc["user"], acc["pass"]
    if kind == "live":
        return f"{b}/live/{u}/{p}/{stream_id}.ts"
    if kind == "movie":
        return f"{b}/movie/{u}/{p}/{stream_id}.{ext}"
    if kind == "series":
        return f"{b}/series/{u}/{p}/{stream_id}.{ext}"
    return None


def stream_ffmpeg(handler, src, transcode=False):
    """Remux/transcode source into fragmented MP4 and pipe to the HTTP client."""
    ff = ffmpeg_path()
    vcodec = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "23"] if transcode else ["-c:v", "copy"]
    cmd = [
        ff, "-hide_banner", "-loglevel", "error",
        "-user_agent", "VLC/3.0",
        "-i", src,
        *vcodec,
        "-c:a", "aac", "-b:a", "128k", "-ac", "2",
        "-movflags", "frag_keyframe+empty_moov+default_base_moof",
        "-f", "mp4", "pipe:1",
    ]
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    try:
        handler.send_response(200)
        handler.send_cors_headers()
        handler.send_header("Content-Type", "video/mp4")
        handler.send_header("Cache-Control", "no-cache")
        handler.end_headers()
        while True:
            chunk = proc.stdout.read(64 * 1024)
            if not chunk:
                break
            try:
                handler.wfile.write(chunk)
            except (BrokenPipeError, ConnectionResetError):
                break
    finally:
        try:
            proc.kill()
        except Exception:
            pass


# --------------------------- HTTP handler ---------------------------

class Handler(BaseHTTPRequestHandler):
    acc = None

    def log_message(self, *a):
        pass

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        path = u.path
        qs = urllib.parse.parse_qs(u.query)
        try:
            if path == "/api/health":
                info = player_api(self.acc)
                ui = info.get("user_info", {})
                return self._json({"ok": ui.get("auth") == 1, "status": ui.get("status"),
                                   "exp_date": ui.get("exp_date"), "max_connections": ui.get("max_connections")})

            if path == "/api/live":
                return self._json({"items": cached(self.acc, "live")})
            if path == "/api/vod":
                return self._json({"items": self._filter(cached(self.acc, "vod"), qs)})
            if path == "/api/series":
                return self._json({"items": self._filter(cached(self.acc, "series"), qs)})

            m = re.match(r"^/api/series/(\d+)$", path)
            if m:
                return self._json({"episodes": series_info(self.acc, m.group(1))})

            m = re.match(r"^/stream/(live|movie|series)/([^/.]+)(?:\.([a-z0-9]+))?$", path)
            if m:
                kind, sid, ext = m.group(1), m.group(2), m.group(3) or "ts"
                src = source_url(self.acc, kind, sid, ext)
                return stream_ffmpeg(self, src, transcode=(qs.get("t", ["0"])[0] == "1"))

            self._json({"error": "not found"}, 404)
        except Exception as e:
            self._json({"error": str(e)}, 500)

    def _filter(self, items, qs):
        q = (qs.get("q", [""])[0] or "").lower()
        cat = qs.get("cat", [""])[0]
        res = items
        if cat:
            res = [i for i in res if i["category"] == cat]
        if q:
            res = [i for i in res if q in (i["name"] or "").lower()]
        return res


# --------------------------- deps (ffmpeg / cloudflared) ---------------------------

def download(url, dest):
    print(f"  telechargement: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
        shutil.copyfileobj(r, f)


def ensure_windows_deps():
    if os.name != "nt":
        return
    os.makedirs(BIN_DIR, exist_ok=True)
    cf = os.path.join(BIN_DIR, "cloudflared.exe")
    if not os.path.exists(cf) and not shutil.which("cloudflared"):
        try:
            download("https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe", cf)
        except Exception as e:
            print(f"  (cloudflared non telecharge: {e})")
    ff = os.path.join(BIN_DIR, "ffmpeg.exe")
    if not os.path.exists(ff) and not shutil.which("ffmpeg"):
        print("  ffmpeg manquant. Telechargement (~80 Mo)...")
        try:
            import zipfile
            zpath = os.path.join(BIN_DIR, "ff.zip")
            download("https://github.com/BtbN/FFmpeg-Builds/releases/latest/download/ffmpeg-master-latest-win64-gpl.zip", zpath)
            with zipfile.ZipFile(zpath) as z:
                for n in z.namelist():
                    if n.endswith("/bin/ffmpeg.exe"):
                        with z.open(n) as srcf, open(ff, "wb") as dstf:
                            shutil.copyfileobj(srcf, dstf)
                        break
            os.remove(zpath)
        except Exception as e:
            print(f"  (ffmpeg non telecharge: {e}. Installe-le manuellement.)")


def cloudflared_bin():
    local = os.path.join(BIN_DIR, "cloudflared.exe")
    return local if os.path.exists(local) else (shutil.which("cloudflared") or "cloudflared")


def start_tunnel():
    cf = cloudflared_bin()
    try:
        proc = subprocess.Popen([cf, "tunnel", "--url", f"http://localhost:{PORT}"],
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    except FileNotFoundError:
        print("!! cloudflared introuvable. Le tunnel ne demarrera pas.")
        return
    url_re = re.compile(r"https://[-a-z0-9]+\.trycloudflare\.com")
    for line in proc.stdout:
        m = url_re.search(line)
        if m:
            url = m.group(0)
            with open(os.path.join(BASE_DIR, "tunnel_url.txt"), "w") as f:
                f.write(url)
            print("\n" + "=" * 62)
            print("  TON LIEN A COLLER DANS STREAMORA (Admin > IPTV) :")
            print("  " + url)
            print("=" * 62 + "\n")


def main():
    cfg = load_config()
    acc = get_account(cfg)
    Handler.acc = acc

    print("\nVerification du compte IPTV...")
    try:
        h = player_api(acc)
        ui = h.get("user_info", {})
        if ui.get("auth") != 1:
            print("!! Identifiants IPTV refuses.")
            sys.exit(1)
        print(f"  OK - statut: {ui.get('status')}, connexions max: {ui.get('max_connections')}")
    except Exception as e:
        print(f"!! Impossible de contacter l'IPTV: {e}")
        sys.exit(1)

    print("Preparation des outils (ffmpeg / cloudflared)...")
    ensure_windows_deps()

    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    print(f"Agent demarre sur http://localhost:{PORT}")

    threading.Thread(target=start_tunnel, daemon=True).start()

    print("\nGarde cette fenetre OUVERTE pendant que tu regardes.")
    print("Ctrl+C pour arreter.\n")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nArret.")


if __name__ == "__main__":
    main()
