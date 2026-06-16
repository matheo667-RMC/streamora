#!/usr/bin/env python3
"""
Streamora Admin - Desktop application for managing films and series.
Connects directly to the Neon PostgreSQL database.
"""

import os
import sys
import json
import uuid
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from datetime import datetime

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


class StreamoraAdmin:
    def __init__(self):
        self.db = None
        self.config = load_config()

        if USE_CTK:
            self.root = ctk.CTk()
        else:
            self.root = tk.Tk()

        self.root.title("Streamora Admin")
        self.root.geometry("1100x700")
        self.root.minsize(900, 600)

        if not USE_CTK:
            self.root.configure(bg="#1a1a2e")

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
            self.conn_entry.pack(padx=20, pady=(5, 15))

            saved = self.config.get("database_url", "")
            if saved:
                self.conn_entry.insert(0, saved)

            ctk.CTkButton(frame, text="Se connecter", command=self.connect_db,
                         fg_color="#9333ea", hover_color="#7e22ce", width=200).pack(pady=(5, 20))
        else:
            frame = tk.Frame(self.root, bg="#1a1a2e")
            frame.place(relx=0.5, rely=0.5, anchor="center")

            tk.Label(frame, text="🎬 Streamora Admin", font=("", 24, "bold"), bg="#1a1a2e", fg="white").pack(pady=(20, 5))
            tk.Label(frame, text="URL PostgreSQL :", bg="#1a1a2e", fg="white").pack(anchor="w", padx=20)
            self.conn_entry = tk.Entry(frame, width=60, bg="#2d2d44", fg="white", insertbackground="white")
            self.conn_entry.pack(padx=20, pady=(5, 15))

            saved = self.config.get("database_url", "")
            if saved:
                self.conn_entry.insert(0, saved)

            tk.Button(frame, text="Se connecter", command=self.connect_db,
                     bg="#9333ea", fg="white", relief="flat", padx=20, pady=5).pack(pady=(5, 20))

    def connect_db(self):
        conn_str = self.conn_entry.get().strip()
        if not conn_str:
            messagebox.showerror("Erreur", "Veuillez entrer l'URL de connexion")
            return

        try:
            self.db = DatabaseConnection(conn_str)
            self.db.connect()
            self.config["database_url"] = conn_str
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

            ctk.CTkButton(sidebar, text="🚪 Déconnexion", command=self.setup_connection_screen,
                         fg_color="transparent", hover_color="#553333",
                         anchor="w", font=("", 13), text_color="gray").pack(side="bottom", fill="x", padx=10, pady=10)
        else:
            sidebar = tk.Frame(self.root, bg="#16213e", width=200)
            sidebar.pack(side="left", fill="y")
            sidebar.pack_propagate(False)

            tk.Label(sidebar, text="🎬 Streamora", font=("", 18, "bold"), bg="#16213e", fg="white").pack(pady=20)

            self.content_frame = tk.Frame(self.root, bg="#1a1a2e")
            self.content_frame.pack(side="right", fill="both", expand=True)

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

    def clear_content(self):
        for w in self.content_frame.winfo_children():
            w.destroy()

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

            # Recent downloads
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

        # Films list
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

            for film in films:
                row = ctk.CTkFrame(scroll)
                row.pack(fill="x", pady=3)

                info = f"{'⭐ ' if film.get('featured') else ''}{film['title']}  |  {film.get('year', '')}  |  {film.get('category', '')}  |  ⬇️ {film.get('downloads', 0)}"
                ctk.CTkLabel(row, text=info, font=("", 13), anchor="w").pack(side="left", padx=10, pady=8)

                btn_frame = ctk.CTkFrame(row, fg_color="transparent")
                btn_frame.pack(side="right", padx=5)
                ctk.CTkButton(btn_frame, text="✏️", width=35, command=lambda fid=film["id"]: self.edit_film_dialog(fid),
                             fg_color="#333355", hover_color="#444466").pack(side="left", padx=2)
                ctk.CTkButton(btn_frame, text="🗑️", width=35, command=lambda fid=film["id"], t=film["title"]: self.delete_film(fid, t),
                             fg_color="#553333", hover_color="#664444").pack(side="left", padx=2)
        else:
            for film in films:
                tk.Label(self.content_frame, text=f"{film['title']} ({film.get('year','')})",
                        bg="#1a1a2e", fg="white").pack(anchor="w", padx=20)

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
        dialog.geometry("500x600")
        dialog.transient(self.root)
        dialog.grab_set()

        fields = {}
        field_defs = [
            ("title", "Titre", ""),
            ("description", "Description", ""),
            ("category", "Catégorie", "Autre"),
            ("year", "Année", "2024"),
            ("duration", "Durée", ""),
            ("videoUrl", "URL de la vidéo", ""),
            ("posterUrl", "URL de l'affiche", ""),
            ("trailerUrl", "URL du trailer", ""),
        ]

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(dialog)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            for key, label, default in field_defs:
                ctk.CTkLabel(scroll, text=label).pack(anchor="w", pady=(8, 2))
                entry = ctk.CTkEntry(scroll, width=400)
                entry.pack(fill="x")
                val = str(film.get(key, default)) if film else default
                if val:
                    entry.insert(0, val)
                fields[key] = entry

            # Featured checkbox
            featured_var = tk.BooleanVar(value=bool(film.get("featured")) if film else False)
            ctk.CTkCheckBox(scroll, text="En vedette (affiché en héro)", variable=featured_var).pack(anchor="w", pady=(10, 5))

            def save():
                data = {k: v.get().strip() for k, v in fields.items()}
                if not data["title"]:
                    messagebox.showerror("Erreur", "Le titre est requis")
                    return

                try:
                    year = int(data["year"]) if data["year"] else 2024
                except ValueError:
                    year = 2024

                if film:
                    self.db.execute("""
                        UPDATE "Film" SET title=%s, description=%s, category=%s, year=%s,
                        duration=%s, "videoUrl"=%s, "posterUrl"=%s, "trailerUrl"=%s,
                        featured=%s, "updatedAt"=NOW()
                        WHERE id=%s
                    """, (data["title"], data["description"], data["category"], year,
                          data["duration"], data["videoUrl"], data["posterUrl"], data["trailerUrl"],
                          featured_var.get(), film["id"]))
                else:
                    self.db.execute("""
                        INSERT INTO "Film" (id, title, description, category, year, duration,
                        "videoUrl", "posterUrl", "trailerUrl", featured, "createdAt", "updatedAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, (generate_cuid(), data["title"], data["description"], data["category"],
                          year, data["duration"], data["videoUrl"], data["posterUrl"],
                          data["trailerUrl"], featured_var.get()))

                dialog.destroy()
                self.show_films()

            ctk.CTkButton(scroll, text="Enregistrer", command=save,
                         fg_color="#9333ea", hover_color="#7e22ce").pack(pady=15)
        else:
            for key, label, default in field_defs:
                tk.Label(dialog, text=label).pack(anchor="w", padx=20)
                entry = tk.Entry(dialog, width=50)
                entry.pack(padx=20)
                val = str(film.get(key, default)) if film else default
                if val:
                    entry.insert(0, val)
                fields[key] = entry

            featured_var = tk.BooleanVar(value=bool(film.get("featured")) if film else False)
            tk.Checkbutton(dialog, text="En vedette", variable=featured_var).pack(anchor="w", padx=20)

            def save():
                data = {k: v.get().strip() for k, v in fields.items()}
                if not data["title"]:
                    messagebox.showerror("Erreur", "Le titre est requis")
                    return
                try:
                    year = int(data["year"]) if data["year"] else 2024
                except ValueError:
                    year = 2024
                if film:
                    self.db.execute("""
                        UPDATE "Film" SET title=%s, description=%s, category=%s, year=%s,
                        duration=%s, "videoUrl"=%s, "posterUrl"=%s, "trailerUrl"=%s,
                        featured=%s, "updatedAt"=NOW()
                        WHERE id=%s
                    """, (data["title"], data["description"], data["category"], year,
                          data["duration"], data["videoUrl"], data["posterUrl"], data["trailerUrl"],
                          featured_var.get(), film["id"]))
                else:
                    self.db.execute("""
                        INSERT INTO "Film" (id, title, description, category, year, duration,
                        "videoUrl", "posterUrl", "trailerUrl", featured, "createdAt", "updatedAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, (generate_cuid(), data["title"], data["description"], data["category"],
                          year, data["duration"], data["videoUrl"], data["posterUrl"],
                          data["trailerUrl"], featured_var.get()))
                dialog.destroy()
                self.show_films()

            tk.Button(dialog, text="Enregistrer", command=save, bg="#9333ea", fg="white").pack(pady=10)

    def delete_film(self, film_id, title):
        if messagebox.askyesno("Confirmer", f"Supprimer le film \"{title}\" ?"):
            self.db.execute('DELETE FROM "Film" WHERE id = %s', (film_id,))
            self.show_films()

    def show_series(self):
        self.clear_content()

        if USE_CTK:
            header = ctk.CTkFrame(self.content_frame, fg_color="transparent")
            header.pack(fill="x", padx=20, pady=(20, 10))
            ctk.CTkLabel(header, text="Séries", font=("", 24, "bold")).pack(side="left")
            ctk.CTkButton(header, text="+ Ajouter une série", command=self.add_series_dialog,
                         fg_color="#ec4899", hover_color="#db2777").pack(side="right")
        else:
            tk.Label(self.content_frame, text="Séries", font=("", 20, "bold"), bg="#1a1a2e", fg="white").pack(anchor="w", padx=20, pady=10)
            tk.Button(self.content_frame, text="+ Ajouter", command=self.add_series_dialog,
                     bg="#ec4899", fg="white", relief="flat").pack(anchor="e", padx=20)

        try:
            series_list = self.db.fetchall("""
                SELECT s.*, (SELECT COUNT(*) FROM "Episode" e WHERE e."seriesId" = s.id) as episodes
                FROM "Series" s ORDER BY s."createdAt" DESC
            """)
        except Exception:
            series_list = []

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(self.content_frame)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            for s in series_list:
                row = ctk.CTkFrame(scroll)
                row.pack(fill="x", pady=3)

                info = f"{'⭐ ' if s.get('featured') else ''}{s['title']}  |  {s.get('year', '')}  |  {s.get('category', '')}  |  📝 {s.get('episodes', 0)} épisodes"
                ctk.CTkLabel(row, text=info, font=("", 13), anchor="w").pack(side="left", padx=10, pady=8)

                btn_frame = ctk.CTkFrame(row, fg_color="transparent")
                btn_frame.pack(side="right", padx=5)
                ctk.CTkButton(btn_frame, text="📝", width=35, command=lambda sid=s["id"]: self.manage_episodes_dialog(sid),
                             fg_color="#1e3a5f", hover_color="#2d4a6f").pack(side="left", padx=2)
                ctk.CTkButton(btn_frame, text="✏️", width=35, command=lambda sid=s["id"]: self.edit_series_dialog(sid),
                             fg_color="#333355", hover_color="#444466").pack(side="left", padx=2)
                ctk.CTkButton(btn_frame, text="🗑️", width=35, command=lambda sid=s["id"], t=s["title"]: self.delete_series(sid, t),
                             fg_color="#553333", hover_color="#664444").pack(side="left", padx=2)
        else:
            for s in series_list:
                tk.Label(self.content_frame, text=f"{s['title']} ({s.get('year','')})",
                        bg="#1a1a2e", fg="white").pack(anchor="w", padx=20)

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
        dialog.geometry("500x450")
        dialog.transient(self.root)
        dialog.grab_set()

        fields = {}
        field_defs = [
            ("title", "Titre", ""),
            ("description", "Description", ""),
            ("category", "Catégorie", "Autre"),
            ("year", "Année", "2024"),
            ("posterUrl", "URL de l'affiche", ""),
        ]

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(dialog)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            for key, label, default in field_defs:
                ctk.CTkLabel(scroll, text=label).pack(anchor="w", pady=(8, 2))
                entry = ctk.CTkEntry(scroll, width=400)
                entry.pack(fill="x")
                val = str(series.get(key, default)) if series else default
                if val:
                    entry.insert(0, val)
                fields[key] = entry

            featured_var = tk.BooleanVar(value=bool(series.get("featured")) if series else False)
            ctk.CTkCheckBox(scroll, text="En vedette", variable=featured_var).pack(anchor="w", pady=(10, 5))

            def save():
                data = {k: v.get().strip() for k, v in fields.items()}
                if not data["title"]:
                    messagebox.showerror("Erreur", "Le titre est requis")
                    return
                try:
                    year = int(data["year"]) if data["year"] else 2024
                except ValueError:
                    year = 2024
                if series:
                    self.db.execute("""
                        UPDATE "Series" SET title=%s, description=%s, category=%s, year=%s,
                        "posterUrl"=%s, featured=%s, "updatedAt"=NOW()
                        WHERE id=%s
                    """, (data["title"], data["description"], data["category"], year,
                          data["posterUrl"], featured_var.get(), series["id"]))
                else:
                    self.db.execute("""
                        INSERT INTO "Series" (id, title, description, category, year,
                        "posterUrl", featured, "createdAt", "updatedAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, (generate_cuid(), data["title"], data["description"], data["category"],
                          year, data["posterUrl"], featured_var.get()))
                dialog.destroy()
                self.show_series()

            ctk.CTkButton(scroll, text="Enregistrer", command=save,
                         fg_color="#ec4899", hover_color="#db2777").pack(pady=15)
        else:
            for key, label, default in field_defs:
                tk.Label(dialog, text=label).pack(anchor="w", padx=20)
                entry = tk.Entry(dialog, width=50)
                entry.pack(padx=20)
                val = str(series.get(key, default)) if series else default
                if val:
                    entry.insert(0, val)
                fields[key] = entry

            featured_var = tk.BooleanVar(value=bool(series.get("featured")) if series else False)
            tk.Checkbutton(dialog, text="En vedette", variable=featured_var).pack(anchor="w", padx=20)

            def save():
                data = {k: v.get().strip() for k, v in fields.items()}
                if not data["title"]:
                    messagebox.showerror("Erreur", "Le titre est requis")
                    return
                try:
                    year = int(data["year"]) if data["year"] else 2024
                except ValueError:
                    year = 2024
                if series:
                    self.db.execute("""
                        UPDATE "Series" SET title=%s, description=%s, category=%s, year=%s,
                        "posterUrl"=%s, featured=%s, "updatedAt"=NOW()
                        WHERE id=%s
                    """, (data["title"], data["description"], data["category"], year,
                          data["posterUrl"], featured_var.get(), series["id"]))
                else:
                    self.db.execute("""
                        INSERT INTO "Series" (id, title, description, category, year,
                        "posterUrl", featured, "createdAt", "updatedAt")
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, (generate_cuid(), data["title"], data["description"], data["category"],
                          year, data["posterUrl"], featured_var.get()))
                dialog.destroy()
                self.show_series()

            tk.Button(dialog, text="Enregistrer", command=save, bg="#ec4899", fg="white").pack(pady=10)

    def delete_series(self, series_id, title):
        if messagebox.askyesno("Confirmer", f"Supprimer la série \"{title}\" et tous ses épisodes ?"):
            self.db.execute('DELETE FROM "Series" WHERE id = %s', (series_id,))
            self.show_series()

    def manage_episodes_dialog(self, series_id):
        series = self.db.fetchone('SELECT * FROM "Series" WHERE id = %s', (series_id,))
        episodes = self.db.fetchall(
            'SELECT * FROM "Episode" WHERE "seriesId" = %s ORDER BY season, number', (series_id,))

        if USE_CTK:
            dialog = ctk.CTkToplevel(self.root)
        else:
            dialog = tk.Toplevel(self.root)
        dialog.title(f"Épisodes — {series['title']}")
        dialog.geometry("600x500")
        dialog.transient(self.root)
        dialog.grab_set()

        def refresh_episodes():
            nonlocal episodes
            episodes = self.db.fetchall(
                'SELECT * FROM "Episode" WHERE "seriesId" = %s ORDER BY season, number', (series_id,))
            for w in ep_list.winfo_children():
                w.destroy()

            for ep in episodes:
                if USE_CTK:
                    row = ctk.CTkFrame(ep_list)
                    row.pack(fill="x", pady=2)
                    text = f"S{ep['season']:02d}E{ep['number']:02d} — {ep.get('title', '')}"
                    ctk.CTkLabel(row, text=text, font=("", 12), anchor="w").pack(side="left", padx=10, pady=5)
                    ctk.CTkButton(row, text="🗑️", width=30,
                                 command=lambda eid=ep["id"]: (self.db.execute('DELETE FROM "Episode" WHERE id=%s', (eid,)), refresh_episodes()),
                                 fg_color="#553333", hover_color="#664444").pack(side="right", padx=5)
                else:
                    tk.Label(ep_list, text=f"S{ep['season']:02d}E{ep['number']:02d} — {ep.get('title', '')}",
                            bg="#1a1a2e", fg="white").pack(anchor="w")

        if USE_CTK:
            ctk.CTkLabel(dialog, text=f"Épisodes de {series['title']}", font=("", 18, "bold")).pack(pady=(15, 5))

            add_frame = ctk.CTkFrame(dialog)
            add_frame.pack(fill="x", padx=20, pady=10)

            ctk.CTkLabel(add_frame, text="Saison:").grid(row=0, column=0, padx=5, pady=5)
            season_entry = ctk.CTkEntry(add_frame, width=60)
            season_entry.grid(row=0, column=1, padx=5)
            season_entry.insert(0, "1")

            ctk.CTkLabel(add_frame, text="Épisode:").grid(row=0, column=2, padx=5)
            number_entry = ctk.CTkEntry(add_frame, width=60)
            number_entry.grid(row=0, column=3, padx=5)
            number_entry.insert(0, str(len(episodes) + 1))

            ctk.CTkLabel(add_frame, text="Titre:").grid(row=1, column=0, padx=5, pady=5)
            title_entry = ctk.CTkEntry(add_frame, width=200)
            title_entry.grid(row=1, column=1, columnspan=3, padx=5, sticky="ew")

            ctk.CTkLabel(add_frame, text="URL vidéo:").grid(row=2, column=0, padx=5, pady=5)
            video_entry = ctk.CTkEntry(add_frame, width=200)
            video_entry.grid(row=2, column=1, columnspan=3, padx=5, sticky="ew")

            def add_episode():
                try:
                    s = int(season_entry.get())
                    n = int(number_entry.get())
                except ValueError:
                    messagebox.showerror("Erreur", "Saison et épisode doivent être des nombres")
                    return
                self.db.execute("""
                    INSERT INTO "Episode" (id, "seriesId", season, number, title, "videoUrl", "createdAt")
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                """, (generate_cuid(), series_id, s, n, title_entry.get().strip(), video_entry.get().strip()))
                number_entry.delete(0, "end")
                number_entry.insert(0, str(n + 1))
                title_entry.delete(0, "end")
                video_entry.delete(0, "end")
                refresh_episodes()

            ctk.CTkButton(add_frame, text="Ajouter", command=add_episode,
                         fg_color="#9333ea", hover_color="#7e22ce").grid(row=3, column=0, columnspan=4, pady=10)

            ep_list = ctk.CTkScrollableFrame(dialog)
            ep_list.pack(fill="both", expand=True, padx=20, pady=10)
        else:
            ep_list = tk.Frame(dialog, bg="#1a1a2e")
            ep_list.pack(fill="both", expand=True)

        refresh_episodes()

    def show_profiles(self):
        self.clear_content()

        if USE_CTK:
            ctk.CTkLabel(self.content_frame, text="Profils", font=("", 24, "bold")).pack(anchor="w", padx=20, pady=(20, 10))
        else:
            tk.Label(self.content_frame, text="Profils", font=("", 20, "bold"), bg="#1a1a2e", fg="white").pack(anchor="w", padx=20, pady=10)

        try:
            profiles = self.db.fetchall('SELECT * FROM "Profile" ORDER BY "createdAt" ASC')
        except Exception:
            profiles = []

        if USE_CTK:
            scroll = ctk.CTkScrollableFrame(self.content_frame)
            scroll.pack(fill="both", expand=True, padx=20, pady=10)

            for p in profiles:
                row = ctk.CTkFrame(scroll)
                row.pack(fill="x", pady=3)
                ctk.CTkLabel(row, text=f"👤 {p['name']}", font=("", 14), anchor="w").pack(side="left", padx=10, pady=8)
                ctk.CTkLabel(row, text=f"Créé le {p['createdAt'].strftime('%d/%m/%Y')}", font=("", 11), text_color="gray").pack(side="left", padx=10)
                ctk.CTkButton(row, text="🗑️", width=35,
                             command=lambda pid=p["id"], n=p["name"]: self.delete_profile(pid, n),
                             fg_color="#553333", hover_color="#664444").pack(side="right", padx=5)
        else:
            for p in profiles:
                tk.Label(self.content_frame, text=f"👤 {p['name']}", bg="#1a1a2e", fg="white").pack(anchor="w", padx=20)

    def delete_profile(self, profile_id, name):
        if messagebox.askyesno("Confirmer", f"Supprimer le profil \"{name}\" ?"):
            self.db.execute('DELETE FROM "Profile" WHERE id = %s', (profile_id,))
            self.show_profiles()


if __name__ == "__main__":
    StreamoraAdmin()
