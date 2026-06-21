#!/usr/bin/env python3
"""
Streamora Media Server
Sert les fichiers video depuis ton PC pour le site Streamora.
Fonctionne sur Windows, macOS et Linux.

Usage:
  python streamora_server.py

Par defaut, il sert les fichiers du dossier "media" a cote du script.
Tu peux changer le dossier dans config.json ou au premier lancement.
"""

import os
import sys
import json
import mimetypes
import re
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")
DEFAULT_PORT = 8090

ALLOWED_EXTENSIONS = {
    ".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".flv", ".wmv",
    ".mp3", ".aac", ".flac", ".wav", ".ogg",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp",
    ".srt", ".vtt", ".ass",
}

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
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_config(config):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2, ensure_ascii=False)


def get_media_dir(config):
    media_dir = config.get("media_dir", "")
    if media_dir and os.path.isdir(media_dir):
        return media_dir

    # Default: "media" folder next to script
    default = os.path.join(os.path.dirname(os.path.abspath(__file__)), "media")
    if not os.path.isdir(default):
        os.makedirs(default, exist_ok=True)

    print("\n=== Configuration du serveur Streamora ===")
    print(f"Dossier par defaut: {default}")
    user_input = input("Dossier des films/series (appuie Entree pour le defaut): ").strip()

    if user_input and os.path.isdir(user_input):
        media_dir = user_input
    elif user_input:
        print(f"Le dossier '{user_input}' n'existe pas. Utilisation du dossier par defaut.")
        media_dir = default
    else:
        media_dir = default

    config["media_dir"] = media_dir
    save_config(config)
    return media_dir


def parse_range(range_header, file_size):
    """Parse Range header and return (start, end)."""
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
    media_dir = ""
    allowed_origins = "*"

    def log_message(self, format, *args):
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
        self._serve_file(head_only=True)

    def do_GET(self):
        # API: list files
        if self.path == "/api/files" or self.path.startswith("/api/files?"):
            self._list_files()
            return

        # API: server info
        if self.path == "/api/info":
            self._server_info()
            return

        # Serve file
        self._serve_file()

    def _resolve_path(self):
        """Resolve URL path to a safe file path."""
        parsed = urllib.parse.urlparse(self.path)
        decoded = urllib.parse.unquote(parsed.path.lstrip("/"))
        # Prevent directory traversal
        safe = os.path.normpath(decoded)
        if safe.startswith("..") or os.path.isabs(safe):
            return None
        full_path = os.path.join(self.media_dir, safe)
        # Ensure it's within media_dir
        real_media = os.path.realpath(self.media_dir)
        real_path = os.path.realpath(full_path)
        if not real_path.startswith(real_media):
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

        # Range request support (essential for video streaming)
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
                chunk_size = 256 * 1024  # 256 KB chunks
                with open(file_path, "rb") as f:
                    f.seek(start)
                    remaining = content_length
                    while remaining > 0:
                        read_size = min(chunk_size, remaining)
                        data = f.read(read_size)
                        if not data:
                            break
                        try:
                            self.wfile.write(data)
                        except (BrokenPipeError, ConnectionResetError):
                            break
                        remaining -= len(data)
        else:
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()

            if not head_only:
                chunk_size = 256 * 1024
                with open(file_path, "rb") as f:
                    while True:
                        data = f.read(chunk_size)
                        if not data:
                            break
                        try:
                            self.wfile.write(data)
                        except (BrokenPipeError, ConnectionResetError):
                            break

    def _list_files(self):
        """List all media files in the directory."""
        files = []
        for root, _dirs, filenames in os.walk(self.media_dir):
            for name in sorted(filenames):
                ext = os.path.splitext(name)[1].lower()
                if ext in ALLOWED_EXTENSIONS:
                    full = os.path.join(root, name)
                    rel = os.path.relpath(full, self.media_dir).replace("\\", "/")
                    size = os.path.getsize(full)
                    files.append({
                        "path": rel,
                        "name": name,
                        "size": size,
                        "size_mb": round(size / (1024 * 1024), 1),
                        "type": mimetypes.guess_type(name)[0] or "unknown",
                    })

        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"files": files, "count": len(files)}, ensure_ascii=False).encode())

    def _server_info(self):
        """Return server info."""
        total_size = 0
        file_count = 0
        for root, _dirs, filenames in os.walk(self.media_dir):
            for name in filenames:
                ext = os.path.splitext(name)[1].lower()
                if ext in ALLOWED_EXTENSIONS:
                    total_size += os.path.getsize(os.path.join(root, name))
                    file_count += 1

        info = {
            "name": "Streamora Media Server",
            "version": "1.0.0",
            "media_dir": self.media_dir,
            "files": file_count,
            "total_size_gb": round(total_size / (1024 ** 3), 2),
        }
        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(info, ensure_ascii=False).encode())


def main():
    config = load_config()
    media_dir = get_media_dir(config)
    port = config.get("port", DEFAULT_PORT)

    MediaHandler.media_dir = media_dir
    MediaHandler.allowed_origins = config.get("allowed_origins", "*")

    server = HTTPServer(("0.0.0.0", port), MediaHandler)

    print(f"""
╔══════════════════════════════════════════════════════╗
║          Streamora Media Server                      ║
╠══════════════════════════════════════════════════════╣
║  Dossier : {media_dir:<41s}║
║  Port    : {port:<41d}║
║  URL     : http://localhost:{port:<24d}║
╠══════════════════════════════════════════════════════╣
║  API:                                                ║
║    /api/files  - Liste tous les fichiers             ║
║    /api/info   - Info du serveur                     ║
║                                                      ║
║  Pour acceder a un fichier:                          ║
║    http://localhost:{port}/Films/MonFilm.mp4{' ' * (10 - len(str(port)))}║
║                                                      ║
║  Ctrl+C pour arreter                                 ║
╚══════════════════════════════════════════════════════╝
""")
    print(f"Organisation de ton dossier suggeree:")
    print(f"  {media_dir}/")
    print(f"    Films/")
    print(f"      Inception.mp4")
    print(f"      Avatar.mp4")
    print(f"    Series/")
    print(f"      Breaking Bad/")
    print(f"        S01E01.mp4")
    print(f"        S01E02.mp4")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServeur arrete.")
        server.server_close()


if __name__ == "__main__":
    main()
