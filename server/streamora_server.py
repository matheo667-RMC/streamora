#!/usr/bin/env python3
"""
Streamora Media Server
Sert tes fichiers video depuis ton PC (et tes cles USB) pour le site Streamora.
Fonctionne sur Windows, macOS et Linux.

Usage:
  python streamora_server.py

Au premier lancement, tu indiques un ou plusieurs dossiers/lecteurs
(par exemple tes 2 cles USB : E:\\  et  F:\\).
Ensuite, ouvre l'URL du serveur dans ton navigateur : tu vois la liste de
tes films avec un bouton "Copier le lien" a coller sur Streamora.
"""

import os
import json
import string
import mimetypes
import re
import html
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
DEFAULT_PORT = 8090

ALLOWED_EXTENSIONS = {
    ".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".flv", ".wmv",
    ".mp3", ".aac", ".flac", ".wav", ".ogg",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
    ".srt", ".vtt", ".ass",
}
VIDEO_EXTENSIONS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".flv", ".wmv"}

mimetypes.add_type("video/mp4", ".mp4")
mimetypes.add_type("video/x-matroska", ".mkv")
mimetypes.add_type("video/webm", ".webm")
mimetypes.add_type("video/quicktime", ".mov")
mimetypes.add_type("video/x-msvideo", ".avi")
mimetypes.add_type("video/x-m4v", ".m4v")
mimetypes.add_type("application/x-subrip", ".srt")
mimetypes.add_type("text/vtt", ".vtt")


def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except (ValueError, OSError):
            return {}
    return {}


def save_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def detect_windows_drives():
    """Auto-detect every drive except C: (USB keys, external hard drives...)."""
    found = []
    for letter in string.ascii_uppercase:
        if letter == "C":
            continue  # skip the system drive (too big / slow to scan)
        path = f"{letter}:\\"
        if os.path.isdir(path):
            found.append({"label": f"Disque {letter}", "path": path})
    return found


def get_media_dirs(config):
    """Return a list of {label, path}.

    On Windows we AUTO-DETECT every plugged-in drive (USB keys + external hard
    drives) at each launch, so a newly plugged disk is picked up automatically
    without any manual step. Extra folders in config.json ("media_dirs") are
    also honoured. Non-Windows keeps the manual/config behaviour.
    """
    result = []
    seen = set()

    # 1) Windows: automatically add every drive (except C:).
    if os.name == "nt":
        for d in detect_windows_drives():
            key = os.path.normcase(d["path"])
            if key not in seen:
                seen.add(key)
                result.append(d)

    # 2) Any explicit folders from config (works on every OS).
    dirs = config.get("media_dirs")
    if isinstance(dirs, list):
        for d in dirs:
            p = d.get("path", "")
            if p and os.path.isdir(p):
                key = os.path.normcase(p)
                if key not in seen:
                    seen.add(key)
                    result.append({"label": d.get("label", os.path.basename(p) or p), "path": p})

    single = config.get("media_dir", "")
    if single and os.path.isdir(single) and os.path.normcase(single) not in seen:
        result.append({"label": "Disque 1", "path": single})

    if result:
        return result

    # Nothing found. On first non-Windows launch, ask; otherwise use default folder.
    if os.name != "nt":
        print("\n=== Configuration du serveur Streamora ===")
        print("Indique le(s) dossier(s) ou tes films sont rangés.")
        print("Appuie sur Entree (sans rien taper) pour terminer la liste.\n")
        i = 1
        while True:
            path = input(f"Dossier n°{i} (Entree pour finir): ").strip().strip('"')
            if not path:
                break
            if os.path.isdir(path):
                result.append({"label": f"Disque {i}", "path": path})
                i += 1
            else:
                print(f"  ⚠ Le dossier '{path}' n'existe pas, ignore.")
        if result:
            config["media_dirs"] = result
            save_config(config)
            return result

    default = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media")
    os.makedirs(default, exist_ok=True)
    print(f"Aucun disque trouvé. Utilisation du dossier par defaut : {default}")
    return [{"label": "Disque 1", "path": default}]


def parse_range(range_header, file_size):
    match = re.match(r"bytes=(\d*)-(\d*)", range_header)
    if not match:
        return 0, file_size - 1
    start_str, end_str = match.group(1), match.group(2)
    if start_str:
        start = int(start_str)
        end = int(end_str) if end_str else file_size - 1
    elif end_str:
        start = file_size - int(end_str)
        end = file_size - 1
    else:
        start = 0
        end = file_size - 1
    start = max(0, start)
    end = min(end, file_size - 1)
    return start, end


class MediaHandler(BaseHTTPRequestHandler):
    media_dirs = []  # list of {label, path}
    allowed_origins = "*"

    def log_message(self, fmt, *args):
        print(f"[{self.log_date_time_string()}] {args[0]}")

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", self.allowed_origins)
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type")
        self.send_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        try:
            self._serve_file(head_only=True)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass

    def do_GET(self):
        try:
            if self.path == "/" or self.path.startswith("/?"):
                self._index_page()
                return
            if self.path == "/api/files" or self.path.startswith("/api/files?"):
                self._list_files_json()
                return
            self._serve_file()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            # Le navigateur a coupe la connexion (avance rapide, pause...). Sans gravite.
            pass

    def _all_files(self):
        """Yield (drive_index, rel_path, full_path, size) for every media file."""
        for idx, d in enumerate(self.media_dirs):
            base = d["path"]
            for root, _dirs, filenames in os.walk(base):
                for name in sorted(filenames):
                    ext = os.path.splitext(name)[1].lower()
                    if ext in ALLOWED_EXTENSIONS:
                        full = os.path.join(root, name)
                        rel = os.path.relpath(full, base).replace("\\", "/")
                        yield idx, rel, full, os.path.getsize(full)

    def _resolve_path(self):
        """Resolve /media/<index>/<relpath> to a safe absolute path."""
        parsed = urllib.parse.urlparse(self.path)
        decoded = urllib.parse.unquote(parsed.path.lstrip("/"))
        parts = decoded.split("/", 2)
        if len(parts) < 3 or parts[0] != "media":
            return None
        try:
            idx = int(parts[1])
        except ValueError:
            return None
        if idx < 0 or idx >= len(self.media_dirs):
            return None
        base = self.media_dirs[idx]["path"]
        safe = os.path.normpath(parts[2])
        if safe.startswith("..") or os.path.isabs(safe):
            return None
        full_path = os.path.join(base, safe)
        real_base = os.path.realpath(base)
        real_path = os.path.realpath(full_path)
        if not real_path.startswith(real_base):
            return None
        return full_path

    def _serve_file(self, head_only=False):
        file_path = self._resolve_path()
        if not file_path or not os.path.isfile(file_path):
            self.send_response(404)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            if not head_only:
                self.wfile.write(b'{"error": "File not found"}')
            return

        ext = os.path.splitext(file_path)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            self.send_response(403)
            self.send_cors_headers()
            self.end_headers()
            return

        file_size = os.path.getsize(file_path)
        content_type = mimetypes.guess_type(file_path)[0] or "application/octet-stream"
        range_header = self.headers.get("Range")

        if range_header:
            start, end = parse_range(range_header, file_size)
            content_length = end - start + 1
            self.send_response(206)
            self.send_cors_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(content_length))
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            if not head_only:
                self._stream(file_path, start, content_length)
        else:
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            if not head_only:
                self._stream(file_path, 0, file_size)

    def _stream(self, file_path, start, length):
        chunk_size = 256 * 1024
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = length
            while remaining > 0:
                data = f.read(min(chunk_size, remaining))
                if not data:
                    break
                try:
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionResetError):
                    break
                remaining -= len(data)

    def _list_files_json(self):
        files = []
        for idx, rel, _full, size in self._all_files():
            files.append({
                "url": f"/media/{idx}/{urllib.parse.quote(rel)}",
                "name": os.path.basename(rel),
                "path": rel,
                "size_mb": round(size / (1024 * 1024), 1),
            })
        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"files": files, "count": len(files)}, ensure_ascii=False).encode())

    def _index_page(self):
        rows = []
        for idx, rel, _full, size in self._all_files():
            ext = os.path.splitext(rel)[1].lower()
            if ext not in VIDEO_EXTENSIONS:
                continue
            url_path = f"/media/{idx}/{urllib.parse.quote(rel)}"
            name = html.escape(os.path.basename(rel))
            rows.append(
                f'<tr><td>{name}</td><td class="s">{round(size/(1024*1024),1)} Mo</td>'
                f'<td><button class="c" data-u="{html.escape(url_path)}">Copier le lien</button></td></tr>'
            )
        body = "\n".join(rows) or '<tr><td colspan="3">Aucun film trouvé. Ajoute des .mp4 dans tes dossiers puis rafraîchis.</td></tr>'
        page = """<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Streamora — Mes fichiers</title>
<style>
body{font-family:system-ui,Arial,sans-serif;background:#0f0f23;color:#eee;margin:0;padding:24px}
h1{color:#10b981}p{color:#aaa}
table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{padding:10px;border-bottom:1px solid #ffffff14;text-align:left;font-size:14px}
.s{color:#888;white-space:nowrap}
button.c{background:#10b981;color:#fff;border:0;border-radius:8px;padding:8px 12px;cursor:pointer;font-weight:600}
button.c:hover{background:#059669}
.ok{background:#16a34a!important}
</style></head><body>
<h1>Streamora — Mes fichiers</h1>
<p>1) Dans Streamora : Admin → Serveur → colle l'adresse publique de ton serveur (elle s'affiche dans la fenêtre du lanceur).<br>
2) Ici : clique « Copier le lien », puis colle-le dans Admin → Ajouter un film/épisode → URL vidéo.</p>
<table><thead><tr><th>Fichier</th><th>Taille</th><th>Lien</th></tr></thead>
<tbody>__ROWS__</tbody></table>
<script>
document.querySelectorAll('button.c').forEach(function(b){
  b.addEventListener('click',function(){
    var url=b.dataset.u;
    navigator.clipboard.writeText(url).then(function(){
      var t=b.textContent;b.textContent='Copié !';b.classList.add('ok');
      setTimeout(function(){b.textContent=t;b.classList.remove('ok');},1500);
    });
  });
});
</script></body></html>""".replace("__ROWS__", body)
        data = page.encode("utf-8")
        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def main():
    config = load_config()
    media_dirs = get_media_dirs(config)
    port = config.get("port", DEFAULT_PORT)

    MediaHandler.media_dirs = media_dirs
    MediaHandler.allowed_origins = config.get("allowed_origins", "*")

    server = ThreadingHTTPServer(("0.0.0.0", port), MediaHandler)

    print("\n==========================================")
    print("        Streamora Media Server")
    print("==========================================")
    for i, d in enumerate(media_dirs):
        print(f"  Disque {i}: {d['path']}")
    print(f"  Port   : {port}")
    print(f"  Ouvre dans ton navigateur : http://localhost:{port}")
    print("  (liste de tes films + bouton 'Copier le lien')")
    print("  Ctrl+C pour arreter")
    print("==========================================\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServeur arrete.")
        server.server_close()


if __name__ == "__main__":
    main()
