"""Streamora Media Server - serveur video personnel.

Double-clique ce fichier. Il fait TOUT tout seul :

  1. il detecte tous tes disques branches (disques durs + cles USB) ;
  2. il partage tes videos en streaming (avance/recul, gros fichiers OK) ;
  3. il ouvre un LIEN PUBLIC (via le ssh integre a Windows, rien a installer) ;
  4. il verifie que le lien marche vraiment et te l'affiche ;
  5. il accepte l'envoi de nouvelles videos depuis Streamora (Admin > Uploader).

Garde la fenetre ouverte pendant que tu regardes. Ctrl+C pour arreter.
"""

import html
import json
import mimetypes
import os
import re
import shutil
import socket
import string
import subprocess
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(HERE, "config.json")
DEFAULT_PORT = 8090
UPLOAD_DIRNAME = "Streamora-Uploads"
CHUNK = 256 * 1024

VIDEO_EXT = {".mp4", ".m4v", ".webm", ".ogv", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".ts", ".m2ts", ".mpg", ".mpeg"}
OTHER_EXT = {".mp3", ".m4a", ".aac", ".flac", ".wav", ".ogg", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".srt", ".vtt", ".ass"}
ALLOWED_EXT = VIDEO_EXT | OTHER_EXT

SKIP_DIRS = {
    "$recycle.bin", "system volume information", "windows", "program files",
    "program files (x86)", "programdata", "$windows.~ws", "$windows.~bt",
    "recovery", "msocache", "appdata", "node_modules",
}


# --------------------------------------------------------------------------
# Configuration / disques
# --------------------------------------------------------------------------
def load_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (OSError, ValueError):
        return {}


def detect_drives():
    """Tous les disques branches, sauf C: (systeme). Detecte a chaque lancement,
    donc un disque/cle branche juste avant est pris en compte automatiquement."""
    drives = []
    if os.name == "nt":
        for letter in string.ascii_uppercase:
            if letter == "C":
                continue
            path = f"{letter}:\\"
            if os.path.isdir(path):
                drives.append({"label": f"Disque {letter}", "path": path})
    return drives


def get_media_dirs(config):
    dirs, seen = [], set()

    def add(label, path):
        if not path or not os.path.isdir(path):
            return
        key = os.path.normcase(os.path.abspath(path))
        if key in seen:
            return
        seen.add(key)
        dirs.append({"label": label, "path": path})

    for d in detect_drives():
        add(d["label"], d["path"])

    for d in config.get("media_dirs") or []:
        if isinstance(d, dict):
            add(d.get("label") or os.path.basename(d.get("path", "")) or "Dossier", d.get("path", ""))

    add("Dossier", config.get("media_dir", ""))

    if not dirs:
        print("Aucun disque detecte automatiquement.")
        print("Indique un dossier a partager (ex: D:\\Films), puis Entree :")
        while True:
            raw = input("  Dossier (vide pour terminer) : ").strip().strip('"')
            if not raw:
                break
            if os.path.isdir(raw):
                add(os.path.basename(raw.rstrip("\\/")) or raw, raw)
            else:
                print("  -> introuvable, reessaie.")
    return dirs


# --------------------------------------------------------------------------
# Utilitaires fichiers
# --------------------------------------------------------------------------
def human_size(num):
    for unit in ("o", "Ko", "Mo", "Go", "To"):
        if num < 1024:
            return f"{num:.0f} {unit}" if unit == "o" else f"{num:.1f} {unit}"
        num /= 1024
    return f"{num:.1f} Po"


def safe_filename(raw):
    name = re.sub(r"[^A-Za-z0-9._()\[\]-]", "_", os.path.basename(raw)).strip()
    return name or "video.mp4"


def parse_range(header, size):
    """'bytes=start-end' -> (start, end) inclusifs, ou None."""
    if not header:
        return None
    m = re.match(r"bytes=(\d*)-(\d*)$", header.strip())
    if not m:
        return None
    first, last = m.group(1), m.group(2)
    if first == "":
        if last == "":
            return None
        length = min(int(last), size)
        return max(size - length, 0), size - 1
    start = int(first)
    end = int(last) if last else size - 1
    if start >= size:
        return None
    return start, min(end, size - 1)


# --------------------------------------------------------------------------
# Serveur HTTP
# --------------------------------------------------------------------------
class MediaHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    media_dirs = []
    server_version = "Streamora"
    sys_version = ""

    def log_message(self, fmt, *args):
        print(f"  [{time.strftime('%H:%M:%S')}] {args[0]}")

    # ---- helpers ---------------------------------------------------------
    def cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, HEAD, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Range, Content-Type, X-Filename, X-Upload-Id, X-Chunk-Index, X-Last")
        self.send_header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges")

    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, code, markup):
        body = markup.encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_text(self, code, message):
        body = message.encode("utf-8")
        self.send_response(code)
        self.cors()
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    # ---- routes ----------------------------------------------------------
    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_HEAD(self):
        self._guard(lambda: self._route(head_only=True))

    def do_GET(self):
        self._guard(lambda: self._route(head_only=False))

    def do_POST(self):
        def run():
            if urllib.parse.urlparse(self.path).path == "/upload":
                self._upload()
            else:
                self.send_json(404, {"error": "Route inconnue"})
        self._guard(run)

    def _guard(self, fn):
        """Le navigateur coupe souvent la connexion (avance rapide, pause).
        On ignore ces erreurs pour que le serveur ne s'arrete jamais."""
        try:
            fn()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass
        except Exception as exc:  # noqa: BLE001
            print(f"  [!] Erreur: {exc}")
            try:
                self.send_text(500, f"Erreur serveur: {exc}")
            except OSError:
                pass

    def _route(self, head_only):
        path = urllib.parse.urlparse(self.path).path
        if path == "/":
            self.send_html(200, self._index_html())
        elif path == "/api/files":
            self.send_json(200, {"files": self._file_list(), "drives": [d["label"] for d in self.media_dirs]})
        elif path == "/api/ping":
            self.send_json(200, {"ok": True})
        elif path.startswith("/media/"):
            self._serve_media(path, head_only)
        else:
            self.send_text(404, "Introuvable")

    # ---- listing ---------------------------------------------------------
    def _walk(self):
        for idx, drive in enumerate(self.media_dirs):
            base = drive["path"]
            for root, subdirs, files in os.walk(base):
                subdirs[:] = [d for d in subdirs if d.lower() not in SKIP_DIRS and not d.startswith("$")]
                for fname in sorted(files):
                    if os.path.splitext(fname)[1].lower() not in ALLOWED_EXT:
                        continue
                    full = os.path.join(root, fname)
                    try:
                        size = os.path.getsize(full)
                    except OSError:
                        continue
                    rel = os.path.relpath(full, base).replace("\\", "/")
                    yield idx, rel, fname, size

    def _file_list(self):
        out = []
        for idx, rel, fname, size in self._walk():
            out.append({
                "name": fname,
                "drive": self.media_dirs[idx]["label"],
                "size": human_size(size),
                "url": f"/media/{idx}/" + urllib.parse.quote(rel),
            })
        return out

    def _index_html(self):
        rows = []
        for f in self._file_list():
            rows.append(
                "<tr><td class='n'>{n}</td><td class='d'>{d}</td><td class='s'>{s}</td>"
                "<td><button class='c' data-u=\"{u}\">Copier le lien</button></td></tr>".format(
                    n=html.escape(f["name"]), d=html.escape(f["drive"]),
                    s=html.escape(f["size"]), u=html.escape(f["url"], quote=True),
                )
            )
        body = "".join(rows) or "<tr><td colspan='4' class='empty'>Aucune video trouvee sur tes disques.</td></tr>"
        drives = " &middot; ".join(html.escape(d["label"]) for d in self.media_dirs) or "aucun"
        return TEMPLATE.replace("__ROWS__", body).replace("__DRIVES__", drives)

    # ---- streaming -------------------------------------------------------
    def _resolve(self, path):
        parts = path.split("/", 3)  # ['', 'media', idx, rel]
        if len(parts) < 4:
            return None
        try:
            idx = int(parts[2])
        except ValueError:
            return None
        if not 0 <= idx < len(self.media_dirs):
            return None
        rel = urllib.parse.unquote(parts[3])
        base = self.media_dirs[idx]["path"]
        full = os.path.realpath(os.path.join(base, rel))
        # Empeche de sortir du disque partage.
        if os.path.commonpath([os.path.realpath(base), full]) != os.path.realpath(base):
            return None
        return full if os.path.isfile(full) else None

    def _serve_media(self, path, head_only):
        full = self._resolve(path)
        if not full:
            self.send_text(404, "Fichier introuvable")
            return
        if os.path.splitext(full)[1].lower() not in ALLOWED_EXT:
            self.send_text(403, "Type de fichier non autorise")
            return

        size = os.path.getsize(full)
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        if full.lower().endswith(".mkv"):
            ctype = "video/x-matroska"

        rng = parse_range(self.headers.get("Range"), size)
        if rng:
            start, end = rng
            self.send_response(206)
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        else:
            start, end = 0, size - 1
            self.send_response(200)

        length = end - start + 1
        self.cors()
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Length", str(length))
        self.end_headers()
        if head_only:
            return

        with open(full, "rb") as f:
            f.seek(start)
            left = length
            while left > 0:
                data = f.read(min(CHUNK, left))
                if not data:
                    break
                self.wfile.write(data)
                left -= len(data)

    # ---- upload ----------------------------------------------------------
    def _upload(self):
        """Recoit UN morceau de video et l'ajoute au fichier sur le disque.
        Les liens publics limitent la taille d'une requete : le navigateur
        envoie donc la video en petits morceaux."""
        if not self.media_dirs:
            self.send_json(500, {"error": "Aucun disque disponible"})
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0

        name = safe_filename(urllib.parse.unquote(self.headers.get("X-Filename", "video.mp4")))
        if os.path.splitext(name)[1].lower() not in VIDEO_EXT:
            name += ".mp4"
        upload_id = re.sub(r"[^A-Za-z0-9._-]", "_", self.headers.get("X-Upload-Id", name))[:80] or "upload"
        try:
            index = int(self.headers.get("X-Chunk-Index", "0"))
        except ValueError:
            index = 0
        is_last = self.headers.get("X-Last", "0") == "1"

        updir = os.path.join(self.media_dirs[0]["path"], UPLOAD_DIRNAME)
        os.makedirs(updir, exist_ok=True)
        part = os.path.join(updir, f".part-{upload_id}")

        left = length
        with open(part, "wb" if index == 0 else "ab") as f:
            while left > 0:
                data = self.rfile.read(min(1024 * 1024, left))
                if not data:
                    break
                f.write(data)
                left -= len(data)

        if not is_last:
            self.send_json(200, {"ok": True})
            return

        dest = os.path.join(updir, name)
        stem, ext = os.path.splitext(name)
        n = 1
        while os.path.exists(dest):
            name = f"{stem}-{n}{ext}"
            dest = os.path.join(updir, name)
            n += 1
        os.replace(part, dest)
        print(f"  [+] Video enregistree sur ton disque : {dest}")
        self.send_json(200, {
            "url": f"/media/0/{urllib.parse.quote(UPLOAD_DIRNAME + '/' + name)}",
            "name": name,
        })


TEMPLATE = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Streamora - Mes videos</title>
<style>
*{box-sizing:border-box}
body{margin:0;padding:32px 16px;background:#07100c;color:#e8fff5;
     font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif}
.wrap{max-width:1000px;margin:0 auto}
h1{margin:0 0 4px;font-size:26px;color:#10b981}
.sub{color:#8ba79b;font-size:13px;margin-bottom:20px}
.help{background:#0d1a14;border:1px solid #10b98133;border-radius:12px;padding:14px 16px;
      font-size:13px;color:#b7d6c8;margin-bottom:20px;line-height:1.6}
input.search{width:100%;padding:11px 14px;border-radius:10px;border:1px solid #1d3b2e;
     background:#0b1712;color:#e8fff5;font-size:14px;margin-bottom:16px}
input.search:focus{outline:none;border-color:#10b981}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;color:#7fa694;font-weight:600;font-size:12px;text-transform:uppercase;
   padding:8px 10px;border-bottom:1px solid #1d3b2e}
td{padding:10px;border-bottom:1px solid #12241c;vertical-align:middle}
td.n{word-break:break-all}
td.d,td.s{color:#8ba79b;white-space:nowrap;font-size:13px}
td.empty{text-align:center;color:#8ba79b;padding:28px}
button.c{background:#10b981;color:#04120c;border:0;border-radius:8px;padding:8px 14px;
     font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap}
button.c:hover{background:#0ea371}
button.c.ok{background:#22c55e}
.count{color:#8ba79b;font-size:13px;margin-bottom:8px}
</style></head><body><div class="wrap">
<h1>Streamora &mdash; Mes videos</h1>
<div class="sub">Disques partages : __DRIVES__</div>
<div class="help">
  <b>Comment faire :</b> clique <b>Copier le lien</b> a cote d'une video, puis colle-le
  dans Streamora &rarr; <b>Admin</b> &rarr; le film ou l'episode &rarr; champ <b>URL Video</b>.
  Garde la fenetre noire du serveur ouverte pendant que vous regardez.
</div>
<input class="search" id="q" placeholder="Rechercher une video...">
<div class="count" id="count"></div>
<table><thead><tr><th>Fichier</th><th>Disque</th><th>Taille</th><th></th></tr></thead>
<tbody id="tb">__ROWS__</tbody></table>
</div>
<script>
document.querySelectorAll('button.c').forEach(function(b){
  b.addEventListener('click',function(){
    var url=location.origin+b.dataset.u;
    function done(){var t=b.textContent;b.textContent='Copie !';b.classList.add('ok');
      setTimeout(function(){b.textContent=t;b.classList.remove('ok');},1500);}
    if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(url).then(done);}
    else{var i=document.createElement('textarea');i.value=url;document.body.appendChild(i);
      i.select();document.execCommand('copy');document.body.removeChild(i);done();}
  });
});
var rows=[].slice.call(document.querySelectorAll('#tb tr'));
var q=document.getElementById('q'),count=document.getElementById('count');
function refresh(){
  var v=q.value.toLowerCase(),n=0;
  rows.forEach(function(r){
    var cell=r.querySelector('td.n');
    var show=!cell||cell.textContent.toLowerCase().indexOf(v)>-1;
    r.style.display=show?'':'none';if(show&&cell)n++;
  });
  count.textContent=n+' video(s)';
}
q.addEventListener('input',refresh);refresh();
</script></body></html>"""


# --------------------------------------------------------------------------
# Lien public (ssh integre a Windows -> serveo). Aucun telechargement.
# --------------------------------------------------------------------------
class Tunnel:
    def __init__(self, port):
        self.port = port
        self.url = None

    def start(self):
        ssh = shutil.which("ssh")
        if not ssh:
            print("\n[!] Pas de lien public : le client OpenSSH de Windows est absent.")
            print("    Parametres > Applications > Fonctionnalites facultatives")
            print("    > Ajouter une fonctionnalite > 'Client OpenSSH' > Installer, puis relance.\n")
            return
        threading.Thread(target=self._loop, args=(ssh,), daemon=True).start()

    def _loop(self, ssh):
        while True:
            print("[*] Ouverture du lien public...")
            try:
                proc = subprocess.Popen(
                    [ssh,
                     "-o", "StrictHostKeyChecking=no",
                     "-o", "UserKnownHostsFile=" + os.devnull,
                     "-o", "ServerAliveInterval=30",
                     "-o", "ExitOnForwardFailure=yes",
                     # 127.0.0.1 (et pas localhost) : sur Windows localhost peut
                     # partir en IPv6 alors que le serveur ecoute en IPv4 -> 502.
                     "-R", f"80:127.0.0.1:{self.port}",
                     "serveo.net"],
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, bufsize=1,
                )
            except OSError as exc:
                print(f"[!] Lien public impossible : {exc}")
                return

            for line in proc.stdout:
                line = re.sub(r"\x1b\[[0-9;]*m", "", line).strip()
                if "Forwarding" in line:
                    m = re.search(r"https://[A-Za-z0-9.-]+", line)
                    if m and m.group(0) != self.url:
                        self.url = m.group(0)
                        self._announce()
                elif line and "Tip" not in line and "Warning: Permanently added" not in line:
                    print(f"  [lien] {line}")
            proc.wait()
            self.url = None
            print("[*] Lien coupe. Nouvelle tentative dans 5 secondes...")
            time.sleep(5)

    def _announce(self):
        url = self.url
        print("\n" + "=" * 62)
        print("   TON LIEN PUBLIC :")
        print("   " + url)
        print("")
        print("   1. Ouvre ce lien dans ton navigateur -> liste de tes videos")
        print("   2. 'Copier le lien' -> colle dans Streamora (Admin > URL Video)")
        print("   3. Garde CETTE fenetre ouverte pendant que vous regardez")
        print("=" * 62 + "\n")
        threading.Thread(target=self._selftest, args=(url,), daemon=True).start()

    def _selftest(self, url):
        """Verifie vraiment que le lien public atteint le serveur."""
        time.sleep(2)
        try:
            req = urllib.request.Request(url + "/api/ping", headers={"Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=20) as resp:
                ok = resp.status == 200 and b'"ok"' in resp.read(200)
            print("[OK] Lien public verifie : il fonctionne.\n" if ok
                  else "[!] Le lien repond mais pas comme prevu.\n")
        except Exception as exc:  # noqa: BLE001
            print(f"[!] Le lien public ne repond pas encore ({exc}).")
            print("    Verifie ta connexion internet, puis relance ce fichier.\n")


# --------------------------------------------------------------------------
def main():
    config = load_config()
    port = int(config.get("port", DEFAULT_PORT))
    media_dirs = get_media_dirs(config)
    MediaHandler.media_dirs = media_dirs

    try:
        httpd = ThreadingHTTPServer(("0.0.0.0", port), MediaHandler)
    except OSError as exc:
        print(f"\n[!] Impossible de demarrer sur le port {port} : {exc}")
        print("    Une autre fenetre du serveur est peut-etre deja ouverte.")
        input("\nAppuie sur Entree pour fermer...")
        return
    httpd.daemon_threads = True

    print("\n" + "=" * 62)
    print("            Streamora Media Server")
    print("=" * 62)
    for i, d in enumerate(media_dirs):
        print(f"   Disque {i} : {d['path']}")
    print(f"   Sur ce PC : http://localhost:{port}")
    print("   Ctrl+C pour arreter")
    print("=" * 62 + "\n")

    if config.get("public_tunnel", True):
        Tunnel(port).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServeur arrete.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    socket.setdefaulttimeout(None)
    main()
