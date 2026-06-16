#!/usr/bin/env python3
"""
Streamora Admin - Desktop application for managing films and series.
Connects directly to the Neon PostgreSQL database.
Uploads files to the Streamora website via API.
"""

import os
import sys
import json
import uuid
import tkinter as tk
from tkinter import filedialog, messagebox
from datetime import datetime
import threading
import requests

try:
    import customtkinter as ctk
    ctk.set_appearance_mode("dark")
    ctk.set_default_color_theme("dark-blue")
    USE_CTK = True
except ImportError:
    USE_CTK = False

try:
    import psycopg2
    import psycopg2.extras
except ImportError:
    print("psycopg2 not installed. Run: pip install psycopg2-binary")
    sys.exit(1)

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "config.json")

VIDEO_EXTENSIONS = (".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".flv", ".wmv")
IMAGE_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp")


def generate_cuid():
    return "cl" + uuid.uuid4().hex[:23]


def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return {}


def save_config(config):
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


class DatabaseConnection:
    def __init__(self, connection_string):
        self.conn_str = connection_string
        self.conn = None

    def connect(self):
        self.conn = psycopg2.connect(self.conn_str)
        self.conn.autocommit = True

    def close(self):
        if self.conn:
            self.conn.close()

    def execute(self, query, params=None):
        cur = self.conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute(query, params)
        return cur

    def fetchall(self, query, params=None):
        cur = self.execute(query, params)
        return cur.fetchall()

    def fetchone(self, query, params=None):
        cur = self.execute(query, params)
        return cur.fetchone()


class FileUploader:
    """Uploads files directly to Vercel Blob storage (no size limit)."""

    def __init__(self, blob_token):
        self.blob_token = blob_token

    def upload(self, filepath, callback=None):
        """Upload a file directly to Vercel Blob and return the URL."""
        filename = os.path.basename(filepath)
        filesize = os.path.getsize(filepath)
        size_mb = filesize // (1024 * 1024)

        if callback:
            callback(f"Upload de {filename} ({size_mb} MB)...")

        try:
            # Clean filename for URL
            safe_name = f"{int(datetime.now().timestamp())}-{filename}"

            with open(filepath, "rb") as f:
                resp = requests.put(
                    f"https://blob.vercel-storage.com/{safe_name}",
                    headers={
                        "Authorization": f"Bearer {self.blob_token}",
                        "x-api-version": "7",
                        "content-type": "application/octet-stream",
                    },
                    data=f,
                    timeout=1800,
                )

            if resp.status_code == 200:
                data = resp.json()
                url = data.get("url", "")
                if callback:
                    callback(f"Upload terminé : {filename}")
                return url
            else:
                if callback:
                    callback(f"Erreur upload : {resp.status_code} - {resp.text[:200]}")
                return ""
        except Exception as e:
            if callback:
                callback(f"Erreur : {str(e)}")
            return ""


class StreamoraAdmin:
    def __init__(self):
        self.db = None
        self.uploader = None
        self.config = load_config()

        if USE_CTK:
            self.root = ctk.CTk()
        else:
            self.root = tk.Tk()

        self.root.title("Streamora Admin")
        self.root.geometry("1100x750")
        self.root.minsize(900, 600)

        self.setup_connection_screen()
        self.root.mainloop()

    def setup_connection_screen(self):
        for w in self.root.winfo_children():
            w.destroy()

        if USE_CTK:
            frame = ctk.CTkFrame(self.root)
            frame.place(relx=0.5, rely=0.5, anchor="center")

            ctk.CTkLabel(frame, text="🎬 Streamora Admin", font=("", 28, "bold")).pack(pady=(20, 5))
            ctk.CTkLabel(frame, text="Connectez-vous à votre base de données", font=("", 14), text_color="gray").pack(pady=(0, 20))

            ctk.CTkLabel(frame, text="URL de connexion PostgreSQL :").pack(anchor="w", padx=20)
            self.conn_entry = ctk.CTkEntry(frame, width=500, placeholder_text="postgresql://user:pass@host/db?sslmode=require")
            self.conn_entry.pack(padx=20, pady=(5, 10))

            ctk.CTkLabel(frame, text="Token Vercel Blob (BLOB_READ_WRITE_TOKEN) :").pack(anchor="w", padx=20)
            self.blob_entry = ctk.CTkEntry(frame, width=500, placeholder_text="vercel_blob_rw_xxxxx", show="*")
            self.blob_entry.pack(padx=20, pady=(5, 10))

            ctk.CTkLabel(frame, text="Trouve-le dans Vercel → Settings → Environment Variables",
                        font=("", 11), text_color="gray").pack(padx=20)

            saved_db = self.config.get("database_url", "")
            saved_blob = self.config.get("blob_token", "")
            if saved_db:
                self.conn_entry.insert(0, saved_db)
            if saved_blob:
                self.blob_entry.insert(0, saved_blob)

            ctk.CTkButton(frame, text="Se connecter", command=self.connect_db,
                         fg_color="#9333ea", hover_color="#7e22ce", width=200).pack(pady=(10, 20))
        else:
            frame = tk.Frame(self.root, bg="#1a1a2e")
            frame.place(relx=0.5, rely=0.5, anchor="center")

            tk.Label(frame, text="🎬 Streamora Admin", font=("", 24, "bold"), bg="#1a1a2e", fg="white").pack(pady=(20, 5))

            tk.Label(frame, text="URL PostgreSQL :", bg="#1a1a2e", fg="white").pack(anchor="w", padx=20)
            self.conn_entry = tk.Entry(frame, width=60, bg="#2d2d44", fg="white", insertbackground="white")
            self.conn_entry.pack(padx=20, pady=(5, 10))

            tk.Label(frame, text="Token Vercel Blob :", bg="#1a1a2e", fg="white").pack(anchor="w", padx=20)
            self.blob_entry = tk.Entry(frame, width=60, bg="#2d2d44", fg="white", insertbackground="white", show="*")
            self.blob_entry.pack(padx=20, pady=(5, 15))

            saved_db = self.config.get("database_url", "")
            saved_blob = self.config.get("blob_token", "")
            if saved_db:
                self.conn_entry.insert(0, saved_db)
            if saved_blob:
                self.blob_entry.insert(0, saved_blob)

            tk.Button(frame, text="Se connecter", command=self.connect_db,
                     bg="#9333ea", fg="white", relief="flat", padx=20, pady=5).pack(pady=(5, 20))

    def connect_db(self):
        conn_str = self.conn_entry.get().strip()
        blob_token = self.blob_entry.get().strip()

        if not conn_str:
            messagebox.showerror("Erreur", "Veuillez entrer l'URL de connexion PostgreSQL")
            return
        if not blob_token:
            messagebox.showerror("Erreur", "Veuillez entrer le token Vercel Blob")
            return

        try:
            self.db = DatabaseConnection(conn_str)
            self.db.connect()
            self.uploader = FileUploader(blob_token)
            self.config["database_url"] = conn_str
            self.config["blob_token"] = blob_token
            save_config(self.config)
            self.setup_main_screen()
        except Exception as e:
            messagebox.showerror("Erreur de connexion", str(e))

    def setup_main_screen(self):
        for w in self.root.winfo_children():
            w.destroy()

        if USE_CTK:
            sidebar = ctk.CTkFrame(self.root, width=200, corner_radius=0)
            sidebar.pack(side="left", fill="y")
            sidebar.pack_propagate(False)

            ctk.CTkLabel(sidebar, text="🎬 Streamora", font=("", 20, "bold")).pack(pady=20)

            self.content_frame = ctk.CTkFrame(self.root)
            self.content_frame.pack(side="right", fill="both", expand=True, padx=10, pady=10)

            self.status_var = tk.StringVar(value="Prêt")

            buttons = [
                ("📊 Dashboard", self.show_dashboard),
                ("🎬 Films", self.show_films),
                ("📺 Séries", self.show_series),
                ("👥 Profils", self.show_profiles),
            ]

            for text, cmd in buttons:
                ctk.CTkButton(sidebar, text=text, command=cmd,
                             fg_color="transparent", hover_color="#333355",
                             anchor="w", font=("", 14)).pack(fill="x", padx=10, pady=2)

            # Status bar at bottom of sidebar
            self.status_label = ctk.CTkLabel(sidebar, textvariable=self.status_var,
                                            font=("", 11), text_color="gray")
            self.status_label.pack(side="bottom", padx=10, pady=(0, 5))

            ctk.CTkButton(sidebar, text="🚪 Déconnexion", command=self.setup_connection_screen,
                         fg_color="transparent", hover_color="#553333",
                         anchor="w", font=("", 13), text_color="gray").pack(side="bottom", fill="x", padx=10, pady=5)
        else:
            sidebar = tk.Frame(self.root, bg="#16213e", width=200)
            sidebar.pack(side="left", fill="y")
            sidebar.pack_propagate(False)

            tk.Label(sidebar, text="🎬 Streamora", font=("", 18, "bold"), bg="#16213e", fg="white").pack(pady=20)

            self.content_frame = tk.Frame(self.root, bg="#1a1a2e")
            self.content_frame.pack(side="right", fill="both", expand=True)

            self.status_var = tk.StringVar(value="Prêt")

            buttons = [
                ("📊 Dashboard", self.show_dashboard),
                ("🎬 Films", self.show_films),
                ("📺 Séries", self.show_series),
                ("👥 Profils", self.show_profiles),
            ]

            for text, cmd in buttons:
                tk.Button(sidebar, text=text, command=cmd,
                         bg="#16213e", fg="white", relief="flat", anchor="w",
                         font=("", 12), padx=15, pady=8).pack(fill="x")

        self.show_dashboard()

    def set_status(self, msg):
        self.status_var.set(msg)
        self.root.update_idletasks()

    def clear_content(self):
        for w in self.content_frame.winfo_children():
            w.destroy()

    def upload_file(self, filepath, callback=None):
        """Upload a file in the background and call callback with the URL."""
        def _do():
            url = self.uploader.upload(filepath, callback=lambda m: self.root.after(0, self.set_status, m))
            if callback:
                self.root.after(0, callback, url)
        threading.Thread(target=_do, daemon=True).start()

    # ─── DASHBOARD ───

    def show_dashboard(self):
        self.clear_content()
        stats = {}
        try:
            stats["films"] = self.db.fetchone("SELECT COUNT(*) as count FROM \"Film\"")["count"]
            stats["series"] = self.db.fetchone("SELECT COUNT(*) as count FROM \"Series\"")["count"]
            stats["episodes"] = self.db.fetchone("SELECT COUNT(*) as count FROM \"Episode\"")["count"]
            stats["downloads"] = self.db.fetchone("SELECT COUNT(*) as count FROM \"Download\"")["count"]
            stats["profiles"] = self.db.fetchone("SELECT COUNT(*) as count FROM \"Profile\"")["count"]
        except Exception:
            stats = {"films": 0, "series": 0, "episodes": 0, "downloads": 0, "profiles": 0}

        if USE_CTK:
            ctk.CTkLabel(self.content_frame, text="Dashboard", font=("", 24, "bold")).pack(anchor="w", padx=20, pady=(20, 10))

            stats_frame = ctk.CTkFrame(self.content_frame)
            stats_frame.pack(fill="x", padx=20, pady=10)

            cards = [
                ("🎬 Films", stats.get("films", 0), "#9333ea"),
                ("📺 Séries", stats.get("series", 0), "#ec4899"),
                ("📝 Épisodes", stats.get("episodes", 0), "#3b82f6"),
                ("⬇️ Téléchargements", stats.get("downloads", 0), "#10b981"),
                ("👥 Profils", stats.get("profiles", 0), "#f59e0b"),
            ]

            for i, (label, value, color) in enumerate(cards):
                card = ctk.CTkFrame(stats_frame)
                card.grid(row=0, column=i, padx=8, pady=10, sticky="nsew")
                stats_frame.columnconfigure(i, weight=1)
                ctk.CTkLabel(card, text=str(value), font=("", 32, "bold"), text_color=color).pack(pady=(15, 5))
                ctk.CTkLabel(card, text=label, font=("", 12), text_color="gray").pack(pady=(0, 15))

            try:
                recent = self.db.fetchall("""
                    SELECT d."createdAt", f.title
                    FROM "Download" d
                    JOIN "Film" f ON d."filmId" = f.id
                    ORDER BY d."createdAt" DESC LIMIT 10
                """)
                if recent:
                    ctk.CTkLabel(self.content_frame, text="Téléchargements récents", font=("", 18, "bold")).pack(anchor="w", padx=20, pady=(20, 10))
                    for dl in recent:
                        ctk.CTkLabel(self.content_frame,
                                    text=f"  {dl['title']} — {dl['createdAt'].strftime('%d/%m/%Y %H:%M')}",
                                    font=("", 12), text_color="gray").pack(anchor="w", padx=20)
            except Exception:
                pass
        else:
            tk.Label(self.content_frame, text="Dashboard", font=("", 20, "bold"), bg="#1a1a2e", fg="white").pack(anchor="w", padx=20, pady=20)
            for key, val in stats.items():
                tk.Label(self.content_frame, text=f"{key}: {val}", bg="#1a1a2e", fg="white", font=("", 14)).pack(anchor="w", padx=20)

    # ─── FILMS ───

    def show_films(self):
        self.clear_content()

        if USE_CTK:
            header = ctk.CTkFrame(self.content_frame, fg_color="transparent")
            header.pack(fill="x", padx=20, pady=(20, 10))
            ctk.CTkLabel(header, text="Films", font=("", 24, "bold")).pack(side="left")
            ctk.CTkButton(header, text="+ Ajouter un film", command=self.add_film_dialog,
                         fg_color="#9333ea", hover_color="#7e22ce").pack(side="right")
        else:
            tk.Label(self.content_frame, text="Films", font=("", 20, "bold"), bg="#1a1a2e", fg="white").pack(anchor="w", padx=20, pady=10)
            tk.Button(self.content_frame, text="+ Ajouter", command=self.add_film_dialog,
                     bg="#9333ea", fg="white", relief="flat").pack(anchor="e", padx=20)

        try:
            films = self.db.fetchall("""
                SELECT f.*, (SELECT COUNT(*) FROM "Download" d WHERE d."filmId" = f.id) as downloads
                FROM "Film" f ORDER BY f."createdAt" DESC
            """)
        except Exception:
            films = []

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(self.content_frame)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            if not films:
                ctk.CTkLabel(scroll, text="Aucun film. Clique '+ Ajouter un film' pour commencer.",
                            font=("", 14), text_color="gray").pack(pady=40)

            for film in films:
                row = ctk.CTkFrame(scroll)
                row.pack(fill="x", pady=3)

                featured = "⭐ " if film.get("featured") else ""
                has_video = "🎥" if film.get("videoUrl") else "⚠️"
                has_poster = "🖼️" if film.get("posterUrl") else ""
                info = f"{has_video} {has_poster} {featured}{film['title']}  |  {film.get('year', '')}  |  {film.get('category', '')}  |  ⬇️ {film.get('downloads', 0)}"
                ctk.CTkLabel(row, text=info, font=("", 13), anchor="w").pack(side="left", padx=10, pady=8)

                btn_frame = ctk.CTkFrame(row, fg_color="transparent")
                btn_frame.pack(side="right", padx=5)
                ctk.CTkButton(btn_frame, text="✏️", width=35, command=lambda fid=film["id"]: self.edit_film_dialog(fid),
                             fg_color="#333355", hover_color="#444466").pack(side="left", padx=2)
                ctk.CTkButton(btn_frame, text="🗑️", width=35, command=lambda fid=film["id"], t=film["title"]: self.delete_film(fid, t),
                             fg_color="#553333", hover_color="#664444").pack(side="left", padx=2)

    def add_film_dialog(self):
        self._film_dialog("Ajouter un film")

    def edit_film_dialog(self, film_id):
        film = self.db.fetchone('SELECT * FROM "Film" WHERE id = %s', (film_id,))
        if film:
            self._film_dialog("Modifier le film", film)

    def _film_dialog(self, title, film=None):
        if USE_CTK:
            dialog = ctk.CTkToplevel(self.root)
        else:
            dialog = tk.Toplevel(self.root)
        dialog.title(title)
        dialog.geometry("550x700")
        dialog.transient(self.root)
        dialog.grab_set()

        # State for file paths
        video_path = tk.StringVar(value="")
        poster_path = tk.StringVar(value="")
        video_url = tk.StringVar(value=film.get("videoUrl", "") if film else "")
        poster_url = tk.StringVar(value=film.get("posterUrl", "") if film else "")

        fields = {}
        field_defs = [
            ("title", "Titre du film", ""),
            ("description", "Description", ""),
            ("category", "Catégorie", "Autre"),
            ("year", "Année", "2024"),
            ("duration", "Durée (ex: 1h30)", ""),
        ]

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(dialog)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            for key, label, default in field_defs:
                ctk.CTkLabel(scroll, text=label, font=("", 13)).pack(anchor="w", pady=(10, 2))
                entry = ctk.CTkEntry(scroll, width=450)
                entry.pack(fill="x")
                val = str(film.get(key, default)) if film else default
                if val:
                    entry.insert(0, val)
                fields[key] = entry

            # ─── VIDEO FILE ───
            ctk.CTkLabel(scroll, text="Fichier vidéo", font=("", 13, "bold")).pack(anchor="w", pady=(15, 2))

            video_frame = ctk.CTkFrame(scroll, fg_color="transparent")
            video_frame.pack(fill="x")

            video_label = ctk.CTkLabel(video_frame, text=video_url.get() or "Aucun fichier sélectionné",
                                       font=("", 11), text_color="gray", wraplength=350)
            video_label.pack(side="left", padx=(0, 10))

            def pick_video():
                path = filedialog.askopenfilename(
                    title="Sélectionner un fichier vidéo",
                    filetypes=[("Vidéos", " ".join(f"*{e}" for e in VIDEO_EXTENSIONS)), ("Tous", "*.*")]
                )
                if path:
                    video_path.set(path)
                    video_label.configure(text=f"📁 {os.path.basename(path)}")

            ctk.CTkButton(video_frame, text="📂 Choisir", command=pick_video,
                         fg_color="#333355", hover_color="#444466", width=100).pack(side="right")

            # ─── POSTER IMAGE ───
            ctk.CTkLabel(scroll, text="Image / Affiche", font=("", 13, "bold")).pack(anchor="w", pady=(15, 2))

            poster_frame = ctk.CTkFrame(scroll, fg_color="transparent")
            poster_frame.pack(fill="x")

            poster_label = ctk.CTkLabel(poster_frame, text=poster_url.get() or "Aucune image sélectionnée",
                                        font=("", 11), text_color="gray", wraplength=350)
            poster_label.pack(side="left", padx=(0, 10))

            def pick_poster():
                path = filedialog.askopenfilename(
                    title="Sélectionner une image",
                    filetypes=[("Images", " ".join(f"*{e}" for e in IMAGE_EXTENSIONS)), ("Tous", "*.*")]
                )
                if path:
                    poster_path.set(path)
                    poster_label.configure(text=f"🖼️ {os.path.basename(path)}")

            ctk.CTkButton(poster_frame, text="📂 Choisir", command=pick_poster,
                         fg_color="#333355", hover_color="#444466", width=100).pack(side="right")

            # Featured checkbox
            featured_var = tk.BooleanVar(value=bool(film.get("featured")) if film else False)
            ctk.CTkCheckBox(scroll, text="⭐ En vedette (affiché en héro sur le site)", variable=featured_var).pack(anchor="w", pady=(15, 5))

            # Progress label
            progress_label = ctk.CTkLabel(scroll, text="", font=("", 12), text_color="#9333ea")
            progress_label.pack(pady=5)

            def save():
                data = {k: v.get().strip() for k, v in fields.items()}
                if not data["title"]:
                    messagebox.showerror("Erreur", "Le titre est requis")
                    return

                try:
                    year = int(data["year"]) if data["year"] else 2024
                except ValueError:
                    year = 2024

                # Disable save button
                save_btn.configure(state="disabled", text="Enregistrement...")

                def do_save():
                    v_url = video_url.get()
                    p_url = poster_url.get()

                    # Upload video if new file selected
                    if video_path.get():
                        self.root.after(0, progress_label.configure, {"text": "Upload de la vidéo..."})
                        v_url = self.uploader.upload(video_path.get(),
                                                     callback=lambda m: self.root.after(0, self.set_status, m))
                        if not v_url:
                            self.root.after(0, lambda: messagebox.showerror("Erreur", "Échec de l'upload vidéo"))
                            self.root.after(0, save_btn.configure, {"state": "normal", "text": "Enregistrer"})
                            return

                    # Upload poster if new file selected
                    if poster_path.get():
                        self.root.after(0, progress_label.configure, {"text": "Upload de l'image..."})
                        p_url = self.uploader.upload(poster_path.get(),
                                                     callback=lambda m: self.root.after(0, self.set_status, m))
                        if not p_url:
                            self.root.after(0, lambda: messagebox.showerror("Erreur", "Échec de l'upload image"))
                            self.root.after(0, save_btn.configure, {"state": "normal", "text": "Enregistrer"})
                            return

                    try:
                        if film:
                            self.db.execute("""
                                UPDATE "Film" SET title=%s, description=%s, category=%s, year=%s,
                                duration=%s, "videoUrl"=%s, "posterUrl"=%s,
                                featured=%s, "updatedAt"=NOW()
                                WHERE id=%s
                            """, (data["title"], data["description"], data["category"], year,
                                  data["duration"], v_url, p_url,
                                  featured_var.get(), film["id"]))
                        else:
                            self.db.execute("""
                                INSERT INTO "Film" (id, title, description, category, year, duration,
                                "videoUrl", "posterUrl", "trailerUrl", featured, "createdAt", "updatedAt")
                                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """, (generate_cuid(), data["title"], data["description"], data["category"],
                                  year, data["duration"], v_url, p_url, "", featured_var.get()))

                        self.root.after(0, dialog.destroy)
                        self.root.after(0, self.show_films)
                        self.root.after(0, self.set_status, "Film enregistré !")
                    except Exception as e:
                        self.root.after(0, lambda: messagebox.showerror("Erreur", str(e)))
                        self.root.after(0, save_btn.configure, {"state": "normal", "text": "Enregistrer"})

                threading.Thread(target=do_save, daemon=True).start()

            save_btn = ctk.CTkButton(scroll, text="Enregistrer", command=save,
                                    fg_color="#9333ea", hover_color="#7e22ce", height=40, font=("", 14))
            save_btn.pack(pady=15, fill="x")

    def delete_film(self, film_id, title):
        if messagebox.askyesno("Confirmer", f"Supprimer le film \"{title}\" ?"):
            self.db.execute('DELETE FROM "Film" WHERE id = %s', (film_id,))
            self.show_films()

    # ─── SERIES ───

    def show_series(self):
        self.clear_content()

        if USE_CTK:
            header = ctk.CTkFrame(self.content_frame, fg_color="transparent")
            header.pack(fill="x", padx=20, pady=(20, 10))
            ctk.CTkLabel(header, text="Séries", font=("", 24, "bold")).pack(side="left")
            ctk.CTkButton(header, text="+ Ajouter une série", command=self.add_series_dialog,
                         fg_color="#ec4899", hover_color="#db2777").pack(side="right")

            scroll = ctk.CTkScrollableFrame(self.content_frame)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)
        else:
            tk.Label(self.content_frame, text="Séries", font=("", 20, "bold"), bg="#1a1a2e", fg="white").pack(anchor="w", padx=20, pady=10)
            tk.Button(self.content_frame, text="+ Ajouter", command=self.add_series_dialog,
                     bg="#ec4899", fg="white", relief="flat").pack(anchor="e", padx=20)
            scroll = self.content_frame

        try:
            series_list = self.db.fetchall("""
                SELECT s.*, (SELECT COUNT(*) FROM "Episode" e WHERE e."seriesId" = s.id) as episodes
                FROM "Series" s ORDER BY s."createdAt" DESC
            """)
        except Exception:
            series_list = []

        if USE_CTK:
            if not series_list:
                ctk.CTkLabel(scroll, text="Aucune série. Clique '+ Ajouter une série' pour commencer.",
                            font=("", 14), text_color="gray").pack(pady=40)

            for s in series_list:
                row = ctk.CTkFrame(scroll)
                row.pack(fill="x", pady=3)

                featured = "⭐ " if s.get("featured") else ""
                info = f"{featured}{s['title']}  |  {s.get('year', '')}  |  {s.get('category', '')}  |  📝 {s.get('episodes', 0)} épisodes"
                ctk.CTkLabel(row, text=info, font=("", 13), anchor="w").pack(side="left", padx=10, pady=8)

                btn_frame = ctk.CTkFrame(row, fg_color="transparent")
                btn_frame.pack(side="right", padx=5)
                ctk.CTkButton(btn_frame, text="📝 Épisodes", width=100,
                             command=lambda sid=s["id"]: self.manage_episodes_dialog(sid),
                             fg_color="#1e3a5f", hover_color="#2d4a6f").pack(side="left", padx=2)
                ctk.CTkButton(btn_frame, text="✏️", width=35,
                             command=lambda sid=s["id"]: self.edit_series_dialog(sid),
                             fg_color="#333355", hover_color="#444466").pack(side="left", padx=2)
                ctk.CTkButton(btn_frame, text="🗑️", width=35,
                             command=lambda sid=s["id"], t=s["title"]: self.delete_series(sid, t),
                             fg_color="#553333", hover_color="#664444").pack(side="left", padx=2)

    def add_series_dialog(self):
        self._series_dialog("Ajouter une série")

    def edit_series_dialog(self, series_id):
        s = self.db.fetchone('SELECT * FROM "Series" WHERE id = %s', (series_id,))
        if s:
            self._series_dialog("Modifier la série", s)

    def _series_dialog(self, title, series=None):
        if USE_CTK:
            dialog = ctk.CTkToplevel(self.root)
        else:
            dialog = tk.Toplevel(self.root)
        dialog.title(title)
        dialog.geometry("550x550")
        dialog.transient(self.root)
        dialog.grab_set()

        poster_path = tk.StringVar(value="")
        poster_url = tk.StringVar(value=series.get("posterUrl", "") if series else "")

        fields = {}
        field_defs = [
            ("title", "Titre de la série", ""),
            ("description", "Description", ""),
            ("category", "Catégorie", "Autre"),
            ("year", "Année", "2024"),
        ]

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(dialog)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            for key, label, default in field_defs:
                ctk.CTkLabel(scroll, text=label, font=("", 13)).pack(anchor="w", pady=(10, 2))
                entry = ctk.CTkEntry(scroll, width=450)
                entry.pack(fill="x")
                val = str(series.get(key, default)) if series else default
                if val:
                    entry.insert(0, val)
                fields[key] = entry

            # Poster image
            ctk.CTkLabel(scroll, text="Image / Affiche", font=("", 13, "bold")).pack(anchor="w", pady=(15, 2))

            poster_frame = ctk.CTkFrame(scroll, fg_color="transparent")
            poster_frame.pack(fill="x")

            poster_label = ctk.CTkLabel(poster_frame, text=poster_url.get() or "Aucune image",
                                        font=("", 11), text_color="gray", wraplength=350)
            poster_label.pack(side="left", padx=(0, 10))

            def pick_poster():
                path = filedialog.askopenfilename(
                    title="Sélectionner une image",
                    filetypes=[("Images", " ".join(f"*{e}" for e in IMAGE_EXTENSIONS)), ("Tous", "*.*")]
                )
                if path:
                    poster_path.set(path)
                    poster_label.configure(text=f"🖼️ {os.path.basename(path)}")

            ctk.CTkButton(poster_frame, text="📂 Choisir", command=pick_poster,
                         fg_color="#333355", hover_color="#444466", width=100).pack(side="right")

            featured_var = tk.BooleanVar(value=bool(series.get("featured")) if series else False)
            ctk.CTkCheckBox(scroll, text="⭐ En vedette", variable=featured_var).pack(anchor="w", pady=(15, 5))

            progress_label = ctk.CTkLabel(scroll, text="", font=("", 12), text_color="#ec4899")
            progress_label.pack(pady=5)

            def save():
                data = {k: v.get().strip() for k, v in fields.items()}
                if not data["title"]:
                    messagebox.showerror("Erreur", "Le titre est requis")
                    return
                try:
                    year = int(data["year"]) if data["year"] else 2024
                except ValueError:
                    year = 2024

                save_btn.configure(state="disabled", text="Enregistrement...")

                def do_save():
                    p_url = poster_url.get()
                    if poster_path.get():
                        self.root.after(0, progress_label.configure, {"text": "Upload de l'image..."})
                        p_url = self.uploader.upload(poster_path.get(),
                                                     callback=lambda m: self.root.after(0, self.set_status, m))

                    try:
                        if series:
                            self.db.execute("""
                                UPDATE "Series" SET title=%s, description=%s, category=%s, year=%s,
                                "posterUrl"=%s, featured=%s, "updatedAt"=NOW()
                                WHERE id=%s
                            """, (data["title"], data["description"], data["category"], year,
                                  p_url, featured_var.get(), series["id"]))
                        else:
                            self.db.execute("""
                                INSERT INTO "Series" (id, title, description, category, year,
                                "posterUrl", featured, "createdAt", "updatedAt")
                                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            """, (generate_cuid(), data["title"], data["description"], data["category"],
                                  year, p_url, featured_var.get()))

                        self.root.after(0, dialog.destroy)
                        self.root.after(0, self.show_series)
                    except Exception as e:
                        self.root.after(0, lambda: messagebox.showerror("Erreur", str(e)))
                        self.root.after(0, save_btn.configure, {"state": "normal", "text": "Enregistrer"})

                threading.Thread(target=do_save, daemon=True).start()

            save_btn = ctk.CTkButton(scroll, text="Enregistrer", command=save,
                                    fg_color="#ec4899", hover_color="#db2777", height=40, font=("", 14))
            save_btn.pack(pady=15, fill="x")

    def delete_series(self, series_id, title):
        if messagebox.askyesno("Confirmer", f"Supprimer la série \"{title}\" et tous ses épisodes ?"):
            self.db.execute('DELETE FROM "Series" WHERE id = %s', (series_id,))
            self.show_series()

    # ─── EPISODES ───

    def manage_episodes_dialog(self, series_id):
        series = self.db.fetchone('SELECT * FROM "Series" WHERE id = %s', (series_id,))

        if USE_CTK:
            dialog = ctk.CTkToplevel(self.root)
        else:
            dialog = tk.Toplevel(self.root)
        dialog.title(f"Épisodes — {series['title']}")
        dialog.geometry("700x600")
        dialog.transient(self.root)
        dialog.grab_set()

        if USE_CTK:
            ctk.CTkLabel(dialog, text=f"📺 {series['title']}", font=("", 20, "bold")).pack(pady=(15, 5))
            ctk.CTkLabel(dialog, text="Gérer les épisodes par saison", font=("", 13), text_color="gray").pack(pady=(0, 10))

            # Add episode section
            add_frame = ctk.CTkFrame(dialog)
            add_frame.pack(fill="x", padx=20, pady=10)

            ctk.CTkLabel(add_frame, text="Ajouter un épisode", font=("", 14, "bold")).grid(row=0, column=0, columnspan=4, padx=10, pady=(10, 5), sticky="w")

            ctk.CTkLabel(add_frame, text="Saison:").grid(row=1, column=0, padx=5, pady=5)
            season_entry = ctk.CTkEntry(add_frame, width=60)
            season_entry.grid(row=1, column=1, padx=5)
            season_entry.insert(0, "1")

            ctk.CTkLabel(add_frame, text="Épisode:").grid(row=1, column=2, padx=5)
            number_entry = ctk.CTkEntry(add_frame, width=60)
            number_entry.grid(row=1, column=3, padx=5)
            number_entry.insert(0, "1")

            ctk.CTkLabel(add_frame, text="Titre:").grid(row=2, column=0, padx=5, pady=5)
            title_entry = ctk.CTkEntry(add_frame, width=300)
            title_entry.grid(row=2, column=1, columnspan=3, padx=5, sticky="ew")

            # Video file picker for episode
            ctk.CTkLabel(add_frame, text="Vidéo:").grid(row=3, column=0, padx=5, pady=5)
            ep_video_path = tk.StringVar(value="")
            ep_video_label = ctk.CTkLabel(add_frame, text="Aucun fichier", font=("", 11), text_color="gray")
            ep_video_label.grid(row=3, column=1, columnspan=2, padx=5, sticky="w")

            def pick_ep_video():
                path = filedialog.askopenfilename(
                    title="Sélectionner un fichier vidéo",
                    filetypes=[("Vidéos", " ".join(f"*{e}" for e in VIDEO_EXTENSIONS)), ("Tous", "*.*")]
                )
                if path:
                    ep_video_path.set(path)
                    ep_video_label.configure(text=f"📁 {os.path.basename(path)}")

            ctk.CTkButton(add_frame, text="📂", command=pick_ep_video,
                         fg_color="#333355", hover_color="#444466", width=40).grid(row=3, column=3, padx=5)

            progress_label = ctk.CTkLabel(add_frame, text="", font=("", 11), text_color="#9333ea")
            progress_label.grid(row=4, column=0, columnspan=4, padx=5, pady=2)

            ep_list = ctk.CTkScrollableFrame(dialog)
            ep_list.pack(fill="both", expand=True, padx=20, pady=10)

            def refresh_episodes():
                episodes = self.db.fetchall(
                    'SELECT * FROM "Episode" WHERE "seriesId" = %s ORDER BY season, number', (series_id,))
                for w in ep_list.winfo_children():
                    w.destroy()

                current_season = None
                for ep in episodes:
                    if ep["season"] != current_season:
                        current_season = ep["season"]
                        ctk.CTkLabel(ep_list, text=f"── Saison {current_season} ──",
                                    font=("", 13, "bold"), text_color="#ec4899").pack(anchor="w", pady=(10, 3))

                    row = ctk.CTkFrame(ep_list)
                    row.pack(fill="x", pady=2)

                    has_video = "🎥" if ep.get("videoUrl") else "⚠️"
                    text = f"  {has_video}  E{ep['number']:02d} — {ep.get('title', 'Sans titre')}"
                    ctk.CTkLabel(row, text=text, font=("", 12), anchor="w").pack(side="left", padx=10, pady=5)

                    ctk.CTkButton(row, text="🗑️", width=30,
                                 command=lambda eid=ep["id"]: (self.db.execute('DELETE FROM "Episode" WHERE id=%s', (eid,)), refresh_episodes()),
                                 fg_color="#553333", hover_color="#664444").pack(side="right", padx=5)

                if not episodes:
                    ctk.CTkLabel(ep_list, text="Aucun épisode. Ajoutez-en ci-dessus.",
                                font=("", 13), text_color="gray").pack(pady=20)

                # Update episode number suggestion
                if episodes:
                    last = episodes[-1]
                    number_entry.delete(0, "end")
                    number_entry.insert(0, str(last["number"] + 1))
                    season_entry.delete(0, "end")
                    season_entry.insert(0, str(last["season"]))

            def add_episode():
                try:
                    s = int(season_entry.get())
                    n = int(number_entry.get())
                except ValueError:
                    messagebox.showerror("Erreur", "Saison et épisode doivent être des nombres")
                    return

                ep_title = title_entry.get().strip()
                add_btn.configure(state="disabled", text="Upload...")

                def do_add():
                    v_url = ""
                    if ep_video_path.get():
                        self.root.after(0, progress_label.configure, {"text": "Upload de la vidéo..."})
                        v_url = self.uploader.upload(ep_video_path.get(),
                                                     callback=lambda m: self.root.after(0, self.set_status, m))

                    self.db.execute("""
                        INSERT INTO "Episode" (id, "seriesId", season, number, title, "videoUrl", "createdAt")
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    """, (generate_cuid(), series_id, s, n, ep_title, v_url))

                    self.root.after(0, lambda: (
                        title_entry.delete(0, "end"),
                        ep_video_path.set(""),
                        ep_video_label.configure(text="Aucun fichier"),
                        progress_label.configure(text=""),
                        add_btn.configure(state="normal", text="+ Ajouter l'épisode"),
                        refresh_episodes(),
                    ))

                threading.Thread(target=do_add, daemon=True).start()

            add_btn = ctk.CTkButton(add_frame, text="+ Ajouter l'épisode", command=add_episode,
                                   fg_color="#9333ea", hover_color="#7e22ce")
            add_btn.grid(row=5, column=0, columnspan=4, pady=10)

            refresh_episodes()

    # ─── PROFILES ───

    def show_profiles(self):
        self.clear_content()

        if USE_CTK:
            ctk.CTkLabel(self.content_frame, text="Profils", font=("", 24, "bold")).pack(anchor="w", padx=20, pady=(20, 10))

        try:
            profiles = self.db.fetchall('SELECT * FROM "Profile" ORDER BY "createdAt" ASC')
        except Exception:
            profiles = []

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(self.content_frame)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            if not profiles:
                ctk.CTkLabel(scroll, text="Aucun profil. Les profils sont créés depuis le site web.",
                            font=("", 14), text_color="gray").pack(pady=40)

            for p in profiles:
                row = ctk.CTkFrame(scroll)
                row.pack(fill="x", pady=3)
                ctk.CTkLabel(row, text=f"👤 {p['name']}", font=("", 14), anchor="w").pack(side="left", padx=10, pady=8)
                ctk.CTkLabel(row, text=f"Créé le {p['createdAt'].strftime('%d/%m/%Y')}", font=("", 11), text_color="gray").pack(side="left", padx=10)
                ctk.CTkButton(row, text="🗑️", width=35,
                             command=lambda pid=p["id"], n=p["name"]: self.delete_profile(pid, n),
                             fg_color="#553333", hover_color="#664444").pack(side="right", padx=5)

    def delete_profile(self, profile_id, name):
        if messagebox.askyesno("Confirmer", f"Supprimer le profil \"{name}\" ?"):
            self.db.execute('DELETE FROM "Profile" WHERE id = %s', (profile_id,))
            self.show_profiles()


if __name__ == "__main__":
    StreamoraAdmin()
