import hashlib
import json
import os
import platform
import random
import re
import secrets
import sqlite3
import string
import subprocess
import importlib
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, simpledialog, ttk

DB_FILE = "iptv_app.db"
LIBRARY_ROOT = Path("streamora_library")
BRANDING_ROOT = LIBRARY_ROOT / "branding"
BRANDING_CONFIG = BRANDING_ROOT / "theme.json"
APP_NAME = "Streamora"
VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v"}
IMAGE_EXTS = ["poster.png", "cover.png", "poster.gif", "cover.gif"]
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.-]{3,24}$")
DEFAULT_FILM_CATEGORIES = ["Toutes", "Action", "Aventure", "Comédie", "Marvel", "Horreur", "Animation", "Sci-Fi"]
DEFAULT_SERIES_CATEGORIES = ["Toutes", "Action", "Aventure", "Comédie", "Marvel", "Anime", "Documentaire", "Sci-Fi"]


def hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def generate_stream_key() -> str:
    charset = string.ascii_uppercase + string.digits
    return "FRZ" + "".join(random.choice(charset) for _ in range(12))


def open_media(path: Path):
    system = platform.system().lower()
    try:
        if system == "windows":
            os.startfile(path)  # type: ignore[attr-defined]
        elif system == "darwin":
            subprocess.run(["open", str(path)], check=False)
        else:
            subprocess.run(["xdg-open", str(path)], check=False)
    except Exception as exc:
        messagebox.showerror("Erreur lecture", f"Impossible d'ouvrir:\n{path}\n\n{exc}")


class ScrollableGrid(ttk.Frame):
    def __init__(self, parent):
        super().__init__(parent)
        self.canvas = tk.Canvas(self, highlightthickness=0, bg="white")
        self.scroll = ttk.Scrollbar(self, orient="vertical", command=self.canvas.yview)
        self.inner = ttk.Frame(self.canvas)
        self.inner.bind("<Configure>", lambda _e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scroll.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scroll.pack(side="right", fill="y")


class StreamoraApp:
    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"{APP_NAME} - IPTV Desktop")
        self.root.geometry("1280x760")
        self.root.configure(bg="white")

        self.conn = sqlite3.connect(DB_FILE)
        self.conn.row_factory = sqlite3.Row
        self._init_db()
        self._init_library()

        self.current_user = None
        self.active_view = "chooser"
        self.view_history: list[str] = ["chooser"]
        self.history_index = 0
        self.search_var = tk.StringVar()
        self.category_var = tk.StringVar(value="Toutes")
        self.poster_cache: dict[str, tk.PhotoImage] = {}
        self.brand_logo: tk.PhotoImage | None = None
        self.vlc = None
        self.vlc_instance = None
        self.vlc_player = None
        self.is_muted = False
        self.saved_volume = 80
        self.seek_update_id = None
        self.fullscreen_win = None
        self.fs_controls_visible = True
        self.fs_hide_id = None

        self.main_frame = ttk.Frame(self.root, padding=12)
        self.main_frame.pack(fill="both", expand=True)

        self._configure_styles()
        self.show_auth_screen()

    def _configure_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("Title.TLabel", font=("Arial", 24, "bold"))
        style.configure("Card.TFrame", background="white")
        style.configure("Poster.TButton", padding=6)

    def _init_db(self):
        cur = self.conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                email TEXT,
                stream_key TEXT UNIQUE,
                salt TEXT NOT NULL,
                password_hash TEXT NOT NULL
            )
            """
        )
        existing_cols = {row[1] for row in cur.execute("PRAGMA table_info(users)").fetchall()}
        if "username" not in existing_cols:
            cur.execute("ALTER TABLE users ADD COLUMN username TEXT")
        if "email" not in existing_cols:
            cur.execute("ALTER TABLE users ADD COLUMN email TEXT")
        if "stream_key" not in existing_cols:
            cur.execute("ALTER TABLE users ADD COLUMN stream_key TEXT")

        rows = cur.execute("SELECT id, username, email, stream_key FROM users").fetchall()
        for r in rows:
            if not r[1]:
                base = (r[2] or f"user{r[0]}").split("@")[0].strip() or f"user{r[0]}"
                candidate = re.sub(r"[^a-zA-Z0-9_.-]", "", base)[:24] or f"user{r[0]}"
                idx = 1
                unique = candidate
                while cur.execute("SELECT 1 FROM users WHERE username = ? AND id != ?", (unique, r[0])).fetchone():
                    idx += 1
                    unique = f"{candidate[:20]}{idx}"
                cur.execute("UPDATE users SET username = ? WHERE id = ?", (unique, r[0]))

            if not r[3]:
                key = generate_stream_key()
                while cur.execute("SELECT 1 FROM users WHERE stream_key = ?", (key,)).fetchone():
                    key = generate_stream_key()
                cur.execute("UPDATE users SET stream_key = ? WHERE id = ?", (key, r[0]))

        self.conn.commit()

    def _init_library(self):
        (LIBRARY_ROOT / "films").mkdir(parents=True, exist_ok=True)
        (LIBRARY_ROOT / "series").mkdir(parents=True, exist_ok=True)
        BRANDING_ROOT.mkdir(parents=True, exist_ok=True)

    def _clear(self):
        for child in self.main_frame.winfo_children():
            child.destroy()

    def _brand_header(self, parent):
        header = ttk.Frame(parent)
        header.pack(fill="x", pady=(2, 10))

        app_name = APP_NAME
        subtitle = "Pro local streaming desktop"
        if BRANDING_CONFIG.exists():
            try:
                data = json.loads(BRANDING_CONFIG.read_text(encoding="utf-8"))
                app_name = data.get("app_name", app_name)
                subtitle = data.get("subtitle", subtitle)
            except Exception:
                pass

        custom_logo = None
        for p in sorted(BRANDING_ROOT.iterdir()) if BRANDING_ROOT.exists() else []:
            if p.is_file() and p.suffix.lower() in {".png", ".gif"} and "logo" in p.stem.lower():
                custom_logo = p
                break

        if custom_logo is not None:
            try:
                raw_logo = tk.PhotoImage(file=str(custom_logo))
                self.brand_logo = self._fit_logo(raw_logo, max_w=92, max_h=62)
                ttk.Label(header, image=self.brand_logo).pack(side="left", padx=(0, 12))
            except Exception:
                custom_logo = None

        if custom_logo is None:
            logo = tk.Canvas(header, width=92, height=62, highlightthickness=0, bg="white")
            logo.create_rectangle(5, 10, 87, 50, fill="#dc2626", outline="#7f1d1d", width=3)
            logo.create_polygon(42, 19, 42, 42, 64, 30.5, fill="white", outline="")
            logo.create_line(28, 4, 38, 12, fill="#7f1d1d", width=3)
            logo.create_line(66, 4, 56, 12, fill="#7f1d1d", width=3)
            logo.create_oval(77, 14, 83, 20, fill="#fecaca", outline="")
            logo.pack(side="left", padx=(0, 12))

        title = ttk.Frame(header)
        title.pack(side="left")
        ttk.Label(title, text=app_name, style="Title.TLabel").pack(anchor="w")
        ttk.Label(title, text=subtitle, foreground="#555").pack(anchor="w")

    def _fit_logo(self, img: tk.PhotoImage, max_w: int, max_h: int) -> tk.PhotoImage:
        w, h = img.width(), img.height()
        if w <= max_w and h <= max_h:
            return img
        x = max(1, int((w + max_w - 1) / max_w))
        y = max(1, int((h + max_h - 1) / max_h))
        return img.subsample(x, y)

    def show_auth_screen(self):
        self._clear()
        self.root.configure(bg="white")
        self._brand_header(self.main_frame)

        box = ttk.Frame(self.main_frame)
        box.pack(pady=20)

        ttk.Label(box, text="Nom d'utilisateur").grid(row=0, column=0, sticky="w", pady=4)
        user_entry = ttk.Entry(box, width=45)
        user_entry.grid(row=1, column=0, pady=4)

        ttk.Label(box, text="Mot de passe").grid(row=2, column=0, sticky="w", pady=4)
        pass_entry = ttk.Entry(box, width=45, show="*")
        pass_entry.grid(row=3, column=0, pady=4)

        row = ttk.Frame(box)
        row.grid(row=4, column=0, pady=(10, 0))
        ttk.Button(row, text="Se connecter", command=lambda: self.login(user_entry.get(), pass_entry.get())).pack(side="left", padx=4)
        ttk.Button(row, text="S'inscrire", command=lambda: self.register(user_entry.get(), pass_entry.get())).pack(side="left", padx=4)
        ttk.Button(row, text="Mot de passe oublié", command=lambda: self.reset_password(user_entry.get())).pack(side="left", padx=4)

        ttk.Label(self.main_frame, text=f"Bibliothèque locale: {LIBRARY_ROOT}/films et {LIBRARY_ROOT}/series", foreground="#666").pack(pady=8)
        ttk.Button(
            self.main_frame,
            text="Copier ma Stream Key",
            command=lambda: self.copy_key_by_username(user_entry.get()),
        ).pack(pady=2)

    def copy_key_by_username(self, username: str, silent: bool = False):
        username = (username or "").strip().lower()
        if not username:
            if not silent:
                messagebox.showerror("Erreur", "Entre ton nom d'utilisateur.")
            return
        row = self.conn.execute("SELECT stream_key FROM users WHERE username = ?", (username,)).fetchone()
        if not row or not row["stream_key"]:
            if not silent:
                messagebox.showerror("Erreur", "Aucune Stream Key trouvée pour cet utilisateur.")
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(row["stream_key"])
        if not silent:
            messagebox.showinfo("Copié", "Stream Key copiée dans le presse-papiers.")

    def _validate_credentials(self, username: str, password: str) -> bool:
        username = (username or "").strip()
        if not USERNAME_RE.match(username):
            messagebox.showerror("Erreur", "Nom utilisateur invalide (3-24, lettres/chiffres/_.-).")
            return False
        if not password or len(password) < 6:
            messagebox.showerror("Erreur", "Mot de passe doit faire 6+ caractères.")
            return False
        return True

    def register(self, username: str, password: str):
        username = (username or "").strip().lower()
        if not self._validate_credentials(username, password):
            return
        salt = secrets.token_hex(16)
        key = generate_stream_key()
        while self.conn.execute("SELECT 1 FROM users WHERE stream_key = ?", (key,)).fetchone():
            key = generate_stream_key()

        try:
            self.conn.execute(
                "INSERT INTO users(username, stream_key, salt, password_hash) VALUES (?, ?, ?, ?)",
                (username, key, salt, hash_password(password, salt)),
            )
            self.conn.commit()
            self.root.clipboard_clear()
            self.root.clipboard_append(key)
            messagebox.showinfo("Compte créé", f"Compte OK\nStream Key: {key}\n\n(Clé copiée automatiquement)")
        except sqlite3.IntegrityError:
            messagebox.showerror("Erreur", "Ce nom d'utilisateur existe déjà.")

    def login(self, username: str, password: str):
        username = (username or "").strip().lower()
        if not self._validate_credentials(username, password):
            return

        row = self.conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            messagebox.showerror("Erreur", "Compte introuvable.")
            return
        if hash_password(password, row["salt"]) != row["password_hash"]:
            messagebox.showerror("Erreur", "Mot de passe incorrect.")
            return
        stream_key_input = self.prompt_stream_key(username)
        if not stream_key_input or stream_key_input.strip().upper() != (row["stream_key"] or "").upper():
            messagebox.showerror("Erreur", "Stream Key invalide.")
            return

        self.current_user = dict(row)
        self.root.clipboard_clear()
        self.root.clipboard_append(self.current_user["stream_key"])
        self.active_view = "chooser"
        self.view_history = ["chooser"]
        self.history_index = 0
        self.show_dashboard()

    def reset_password(self, username: str):
        username = (username or "").strip().lower()
        row = self.conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            messagebox.showerror("Erreur", "Compte introuvable.")
            return

        code = secrets.token_hex(3).upper()
        messagebox.showinfo("Code", f"Code reset: {code}")
        typed = simpledialog.askstring("Code", "Entre le code:", parent=self.root)
        if typed != code:
            messagebox.showerror("Erreur", "Code invalide.")
            return

        new_pw = simpledialog.askstring("Nouveau", "Nouveau mot de passe:", parent=self.root, show="*")
        if not new_pw or len(new_pw) < 6:
            messagebox.showerror("Erreur", "Mot de passe trop court.")
            return

        salt = secrets.token_hex(16)
        self.conn.execute("UPDATE users SET salt = ?, password_hash = ? WHERE id = ?", (salt, hash_password(new_pw, salt), row["id"]))
        self.conn.commit()
        messagebox.showinfo("OK", "Mot de passe changé.")

    def prompt_stream_key(self, username: str) -> str | None:
        dialog = tk.Toplevel(self.root)
        dialog.title("Entrer Stream Key")
        dialog.geometry("420x150")
        dialog.transient(self.root)
        dialog.grab_set()

        result = {"value": None}
        key_var = tk.StringVar()

        ttk.Label(dialog, text="Entre ta Stream Key FRZ").pack(pady=(12, 6))
        row = ttk.Frame(dialog)
        row.pack(fill="x", padx=12)
        entry = ttk.Entry(row, textvariable=key_var, width=34)
        entry.pack(side="left")
        entry.focus_set()

        ttk.Button(row, text="📋", width=3, command=lambda: self.copy_key_by_username(username, silent=True)).pack(side="left", padx=4)
        ttk.Button(row, text="Coller", command=lambda: key_var.set(self.root.clipboard_get())).pack(side="left")

        actions = ttk.Frame(dialog)
        actions.pack(pady=12)

        def on_ok():
            result["value"] = key_var.get().strip()
            dialog.destroy()

        ttk.Button(actions, text="Valider", command=on_ok).pack(side="left", padx=6)
        ttk.Button(actions, text="Annuler", command=dialog.destroy).pack(side="left", padx=6)
        dialog.wait_window()
        return result["value"]

    def show_dashboard(self):
        self._clear()
        self._brand_header(self.main_frame)

        info = ttk.Frame(self.main_frame)
        info.pack(fill="x", pady=(0, 4))
        ttk.Label(info, text=f"Utilisateur: {self.current_user['username']}", font=("Arial", 10, "bold")).pack(side="left")
        ttk.Label(info, text=f"Stream Key: {self.current_user['stream_key']}", foreground="#991b1b").pack(side="left", padx=14)
        ttk.Button(info, text="Copier la clé", command=self.copy_stream_key).pack(side="left", padx=4)
        ttk.Button(info, text="Déconnexion", command=self.logout).pack(side="right")

        nav = ttk.Frame(self.main_frame)
        nav.pack(fill="x", pady=(0, 8))
        ttk.Button(nav, text="⬅", width=4, command=self.go_back).pack(side="left", padx=2)
        ttk.Button(nav, text="➡", width=4, command=self.go_forward).pack(side="left", padx=2)
        ttk.Button(nav, text="🔄 Rafraîchir", command=self.refresh_current_view).pack(side="right", padx=2)

        controls = ttk.Frame(self.main_frame)
        controls.pack(fill="x", pady=(0, 8))
        ttk.Label(controls, text="Recherche").pack(side="left")
        search = ttk.Entry(controls, textvariable=self.search_var, width=34)
        search.pack(side="left", padx=6)
        search.bind("<KeyRelease>", lambda _e: self.refresh_current_view())
        ttk.Label(controls, text="Catégorie").pack(side="left", padx=(8, 0))
        self.category_combo = ttk.Combobox(controls, textvariable=self.category_var, values=["Toutes"], width=18, state="readonly")
        self.category_combo.pack(side="left", padx=6)
        self.category_combo.bind("<<ComboboxSelected>>", lambda _e: self.refresh_current_view())

        self.content_holder = ttk.Frame(self.main_frame)
        self.content_holder.pack(fill="both", expand=True)

        self.player_box = ttk.LabelFrame(self.main_frame, text="Lecteur intégré", padding=6)
        self.player_box.pack(fill="x", pady=(6, 0))
        self.video_surface = tk.Frame(self.player_box, bg="black", height=210)
        self.video_surface.pack(fill="x", expand=True)
        self.video_surface.pack_propagate(False)

        # --- Playback controls ---
        controls_bar = ttk.Frame(self.player_box)
        controls_bar.pack(fill="x", pady=(4, 0))

        self.btn_play_pause = ttk.Button(controls_bar, text="▶", width=4, command=self.toggle_play_pause)
        self.btn_play_pause.pack(side="left", padx=2)
        self.btn_stop = ttk.Button(controls_bar, text="⏹", width=4, command=self.stop_playback)
        self.btn_stop.pack(side="left", padx=2)
        self.btn_mute = ttk.Button(controls_bar, text="🔊", width=4, command=self.toggle_mute)
        self.btn_mute.pack(side="left", padx=2)

        self.volume_var = tk.IntVar(value=80)
        self.volume_slider = ttk.Scale(
            controls_bar, from_=0, to=100, orient="horizontal",
            variable=self.volume_var, command=self._on_volume_change, length=100,
        )
        self.volume_slider.pack(side="left", padx=(4, 8))

        self.elapsed_label = ttk.Label(controls_bar, text="00:00", width=6)
        self.elapsed_label.pack(side="left")

        self.seek_var = tk.DoubleVar(value=0)
        self.seek_bar = ttk.Scale(
            controls_bar, from_=0, to=1000, orient="horizontal",
            variable=self.seek_var, length=350,
        )
        self.seek_bar.pack(side="left", fill="x", expand=True, padx=4)
        self.seek_bar.bind("<ButtonRelease-1>", self._on_seek)

        self.duration_label = ttk.Label(controls_bar, text="00:00", width=6)
        self.duration_label.pack(side="left")

        self.player_status = ttk.Label(self.player_box, text="Aucune lecture.")
        self.player_status.pack(anchor="w", pady=(4, 0))

        self.refresh_current_view()

    def _ensure_vlc_instance(self) -> bool:
        if self.vlc_instance is not None:
            return True
        try:
            self.vlc = importlib.import_module("vlc")
            self.vlc_instance = self.vlc.Instance()
            return True
        except Exception:
            messagebox.showwarning(
                "Lecteur non disponible",
                "Lecture intégrée indisponible (module python-vlc / VLC manquant).",
            )
            return False

    def _ensure_vlc_player(self) -> bool:
        if self.vlc_player is not None:
            return True
        if not self._ensure_vlc_instance():
            return False
        try:
            self.vlc_player = self.vlc_instance.media_player_new()
            handle = self.video_surface.winfo_id()
            if platform.system().lower() == "windows":
                self.vlc_player.set_hwnd(handle)
            elif platform.system().lower() == "darwin":
                self.vlc_player.set_nsobject(handle)
            else:
                self.vlc_player.set_xwindow(handle)
            return True
        except Exception:
            return False

    def _bind_vlc_to_surface(self, surface: tk.Frame):
        if self.vlc_player is None:
            return
        handle = surface.winfo_id()
        if platform.system().lower() == "windows":
            self.vlc_player.set_hwnd(handle)
        elif platform.system().lower() == "darwin":
            self.vlc_player.set_nsobject(handle)
        else:
            self.vlc_player.set_xwindow(handle)

    def play_in_app(self, path: Path):
        if not self._ensure_vlc_instance():
            open_media(path)
            return
        self._open_fullscreen_player(path)

    def _open_fullscreen_player(self, path: Path):
        if self.fullscreen_win is not None:
            self._close_fullscreen()

        self.fullscreen_win = tk.Toplevel(self.root)
        self.fullscreen_win.title(path.name)
        self.fullscreen_win.configure(bg="black")
        self.fullscreen_win.attributes("-fullscreen", True)
        self.fullscreen_win.lift()
        self.fullscreen_win.focus_force()

        # Video surface fills the fullscreen window
        self.fs_video_surface = tk.Frame(self.fullscreen_win, bg="black")
        self.fs_video_surface.pack(fill="both", expand=True)

        # Close button (X) top-left
        self.fs_close_btn = tk.Button(
            self.fullscreen_win, text="✕", font=("Arial", 18, "bold"),
            fg="white", bg="#333333", activebackground="#dc2626",
            activeforeground="white", bd=0, padx=10, pady=2,
            command=self._close_fullscreen,
        )
        self.fs_close_btn.place(x=12, y=12)

        # Bottom controls overlay
        self.fs_controls = tk.Frame(self.fullscreen_win, bg="#1a1a1a")
        self.fs_controls.place(relx=0, rely=1.0, relwidth=1.0, anchor="sw", height=52)

        self.fs_btn_play_pause = tk.Button(
            self.fs_controls, text="⏸", font=("Arial", 14), width=3,
            fg="white", bg="#333", bd=0, command=self.toggle_play_pause,
        )
        self.fs_btn_play_pause.pack(side="left", padx=6, pady=6)

        self.fs_btn_stop = tk.Button(
            self.fs_controls, text="⏹", font=("Arial", 14), width=3,
            fg="white", bg="#333", bd=0, command=self._close_fullscreen,
        )
        self.fs_btn_stop.pack(side="left", padx=4, pady=6)

        self.fs_btn_mute = tk.Button(
            self.fs_controls, text="🔊", font=("Arial", 14), width=3,
            fg="white", bg="#333", bd=0, command=self.toggle_mute,
        )
        self.fs_btn_mute.pack(side="left", padx=4, pady=6)

        self.fs_volume = ttk.Scale(
            self.fs_controls, from_=0, to=100, orient="horizontal",
            variable=self.volume_var, command=self._on_volume_change, length=90,
        )
        self.fs_volume.pack(side="left", padx=(4, 8), pady=6)

        self.fs_elapsed = tk.Label(self.fs_controls, text="00:00", fg="white", bg="#1a1a1a", font=("Arial", 10))
        self.fs_elapsed.pack(side="left", padx=2)

        self.fs_seek = ttk.Scale(
            self.fs_controls, from_=0, to=1000, orient="horizontal",
            variable=self.seek_var, length=400,
        )
        self.fs_seek.pack(side="left", fill="x", expand=True, padx=4, pady=6)
        self.fs_seek.bind("<ButtonRelease-1>", self._on_seek)

        self.fs_duration = tk.Label(self.fs_controls, text="00:00", fg="white", bg="#1a1a1a", font=("Arial", 10))
        self.fs_duration.pack(side="left", padx=2)

        # Escape key to close
        self.fullscreen_win.bind("<Escape>", lambda _e: self._close_fullscreen())
        self.fullscreen_win.protocol("WM_DELETE_WINDOW", self._close_fullscreen)

        # Need to wait for window to be drawn before binding VLC
        self.fullscreen_win.update_idletasks()

        # Create or rebind the VLC player to the fullscreen surface
        if self.vlc_player is None:
            self.vlc_player = self.vlc_instance.media_player_new()
        self._bind_vlc_to_surface(self.fs_video_surface)

        media = self.vlc_instance.media_new(str(path))
        self.vlc_player.set_media(media)
        self.vlc_player.audio_set_volume(self.volume_var.get())
        self.vlc_player.play()

        self.player_status.config(text=f"Lecture: {path.name}")
        self.btn_play_pause.config(text="⏸")
        self._start_seek_update()

    def _close_fullscreen(self):
        if self.fullscreen_win is None:
            return
        self.stop_playback()
        # Rebind VLC back to the inline surface
        self._bind_vlc_to_surface(self.video_surface)
        self.fullscreen_win.destroy()
        self.fullscreen_win = None
        self.fs_video_surface = None

    # ── Playback control helpers ──────────────────────────────────────

    def toggle_play_pause(self):
        if self.vlc_player is None:
            return
        state = self.vlc_player.get_state()
        playing_state = self.vlc.State.Playing  # type: ignore[attr-defined]
        paused_state = self.vlc.State.Paused  # type: ignore[attr-defined]
        if state == playing_state:
            self.vlc_player.pause()
            self.btn_play_pause.config(text="▶")
            self.player_status.config(text="En pause")
            if self.fullscreen_win is not None:
                self.fs_btn_play_pause.config(text="▶")
        elif state == paused_state:
            self.vlc_player.play()
            self.btn_play_pause.config(text="⏸")
            self.player_status.config(text="Lecture reprise")
            if self.fullscreen_win is not None:
                self.fs_btn_play_pause.config(text="⏸")

    def stop_playback(self):
        if self.vlc_player is None:
            return
        self.vlc_player.stop()
        self.btn_play_pause.config(text="▶")
        self.seek_var.set(0)
        self.elapsed_label.config(text="00:00")
        self.duration_label.config(text="00:00")
        self.player_status.config(text="Aucune lecture.")
        self._stop_seek_update()

    def toggle_mute(self):
        if self.vlc_player is None:
            return
        if self.is_muted:
            self.vlc_player.audio_set_volume(self.saved_volume)
            self.volume_var.set(self.saved_volume)
            self.btn_mute.config(text="🔊")
            if self.fullscreen_win is not None:
                self.fs_btn_mute.config(text="🔊")
            self.is_muted = False
        else:
            self.saved_volume = self.vlc_player.audio_get_volume()
            self.vlc_player.audio_set_volume(0)
            self.volume_var.set(0)
            self.btn_mute.config(text="🔇")
            if self.fullscreen_win is not None:
                self.fs_btn_mute.config(text="🔇")
            self.is_muted = True

    def _on_volume_change(self, value: str):
        vol = int(float(value))
        if self.vlc_player is not None:
            self.vlc_player.audio_set_volume(vol)
        if vol == 0:
            self.btn_mute.config(text="🔇")
            if self.fullscreen_win is not None:
                self.fs_btn_mute.config(text="🔇")
            self.is_muted = True
        else:
            self.btn_mute.config(text="🔊")
            if self.fullscreen_win is not None:
                self.fs_btn_mute.config(text="🔊")
            self.is_muted = False
            self.saved_volume = vol

    def _on_seek(self, _event):
        if self.vlc_player is None:
            return
        pos = self.seek_var.get() / 1000.0
        self.vlc_player.set_position(pos)

    @staticmethod
    def _format_ms(ms: int) -> str:
        total_secs = max(0, ms // 1000)
        mins, secs = divmod(total_secs, 60)
        hours, mins = divmod(mins, 60)
        if hours > 0:
            return f"{hours}:{mins:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

    def _start_seek_update(self):
        self._stop_seek_update()
        self._poll_seek()

    def _stop_seek_update(self):
        if self.seek_update_id is not None:
            self.root.after_cancel(self.seek_update_id)
            self.seek_update_id = None

    def _poll_seek(self):
        if self.vlc_player is not None:
            state = self.vlc_player.get_state()
            ended_state = self.vlc.State.Ended  # type: ignore[attr-defined]
            if state == ended_state:
                self.btn_play_pause.config(text="▶")
                self.seek_var.set(1000)
                self.player_status.config(text="Lecture terminée.")
                if self.fullscreen_win is not None:
                    self._close_fullscreen()
                self._stop_seek_update()
                return

            pos = self.vlc_player.get_position()
            length = self.vlc_player.get_length()
            current_time = self.vlc_player.get_time()
            if pos >= 0:
                self.seek_var.set(pos * 1000)
            self.elapsed_label.config(text=self._format_ms(current_time))
            self.duration_label.config(text=self._format_ms(length))
            if self.fullscreen_win is not None:
                self.fs_elapsed.config(text=self._format_ms(current_time))
                self.fs_duration.config(text=self._format_ms(length))

        self.seek_update_id = self.root.after(500, self._poll_seek)

    def copy_stream_key(self):
        if not self.current_user:
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(self.current_user["stream_key"])
        messagebox.showinfo("Copié", "Stream Key copiée.")

    def _navigate_to(self, view: str):
        self.active_view = view
        self.search_var.set("")
        self.category_var.set("Toutes")
        if self.history_index < len(self.view_history) - 1:
            self.view_history = self.view_history[: self.history_index + 1]
        self.view_history.append(view)
        self.history_index += 1
        self.refresh_current_view()

    def go_back(self):
        if self.history_index > 0:
            self.history_index -= 1
            self.active_view = self.view_history[self.history_index]
            self.refresh_current_view()

    def go_forward(self):
        if self.history_index < len(self.view_history) - 1:
            self.history_index += 1
            self.active_view = self.view_history[self.history_index]
            self.refresh_current_view()

    def refresh_current_view(self):
        for child in self.content_holder.winfo_children():
            child.destroy()

        if self.active_view == "films":
            self.info_pack(show=True)
            self.render_film_grid()
        elif self.active_view == "series":
            self.info_pack(show=True)
            self.render_series_grid()
        else:
            self.info_pack(show=False)
            self.render_chooser()

    def info_pack(self, show: bool):
        # cache the first 3 frames after header: info, nav, controls
        children = self.main_frame.winfo_children()
        if len(children) < 5:
            return
        for w in children[1:4]:
            if show:
                if not w.winfo_ismapped():
                    w.pack(fill="x", pady=(0, 4) if w == children[1] else (0, 8))
            else:
                if w.winfo_ismapped():
                    w.pack_forget()

    def render_chooser(self):
        self.category_combo.configure(values=["Toutes"], state="disabled")

        page = tk.Frame(self.content_holder, bg="white")
        page.pack(fill="both", expand=True)

        tk.Label(page, text="", bg="white").pack(pady=20)
        tk.Button(
            page,
            text="🎬 FILMS",
            bg="#dc2626",
            fg="white",
            activebackground="#b91c1c",
            relief="flat",
            font=("Arial", 28, "bold"),
            command=lambda: self._navigate_to("films"),
            width=20,
            height=2,
        ).pack(pady=16)

        tk.Button(
            page,
            text="📺 SÉRIES",
            bg="#dc2626",
            fg="white",
            activebackground="#b91c1c",
            relief="flat",
            font=("Arial", 28, "bold"),
            command=lambda: self._navigate_to("series"),
            width=20,
            height=2,
        ).pack(pady=16)

    def _read_optional_metadata(self, folder: Path) -> dict:
        meta_file = folder / "metadata.json"
        if meta_file.exists():
            try:
                return json.loads(meta_file.read_text(encoding="utf-8"))
            except Exception:
                return {}
        return {}

    def _find_image(self, folder: Path) -> Path | None:
        for name in IMAGE_EXTS:
            p = folder / name
            if p.exists():
                return p
        return None

    def _find_trailer(self, folder: Path) -> Path | None:
        for f in folder.iterdir() if folder.exists() else []:
            if f.is_file() and f.suffix.lower() in VIDEO_EXTS and "trailer" in f.stem.lower():
                return f
        return None

    def _create_poster_button(self, parent, image_path: Path | None, text: str, command):
        card = ttk.Frame(parent)
        if image_path is not None:
            try:
                img = tk.PhotoImage(file=str(image_path))
                self.poster_cache[str(image_path)] = img
                ttk.Button(card, image=img, command=command, style="Poster.TButton").pack()
            except Exception:
                ttk.Button(card, text="🎞️", command=command, width=18).pack()
        else:
            ttk.Button(card, text="🎞️", command=command, width=18).pack()

        ttk.Label(card, text=text, wraplength=185, justify="center").pack(pady=(4, 0))
        return card

    def scan_films(self):
        films_root = LIBRARY_ROOT / "films"
        results = []
        if not films_root.exists():
            return results

        for video in films_root.rglob("*"):
            if not video.is_file() or video.suffix.lower() not in VIDEO_EXTS:
                continue
            if "trailer" in video.stem.lower():
                continue

            rel = video.relative_to(films_root)
            parts = rel.parts
            if len(parts) >= 3:
                category, title = parts[0], parts[1]
                media_dir = films_root / parts[0] / parts[1]
            elif len(parts) == 2:
                category, title = parts[0], Path(parts[1]).stem
                media_dir = films_root / parts[0]
            else:
                category, title = "Divers", video.stem
                media_dir = films_root

            meta = self._read_optional_metadata(media_dir)
            trailer = meta.get("trailer")
            trailer_path = Path(trailer) if trailer else self._find_trailer(media_dir)
            if trailer and not trailer_path.is_absolute():
                trailer_path = media_dir / trailer

            results.append(
                {
                    "title": meta.get("title") or title,
                    "genre": meta.get("genre") or category,
                    "category": category,
                    "video": video,
                    "poster": self._find_image(media_dir),
                    "trailer": trailer_path if trailer_path and trailer_path.exists() else None,
                }
            )

        return list({str(x["video"]): x for x in results}.values())

    def scan_series(self):
        series_root = LIBRARY_ROOT / "series"
        results = []
        if not series_root.exists():
            return results

        buckets: dict[tuple[str, str], dict] = {}
        for video in series_root.rglob("*"):
            if not video.is_file() or video.suffix.lower() not in VIDEO_EXTS:
                continue
            if "trailer" in video.stem.lower():
                continue

            rel = video.relative_to(series_root)
            parts = rel.parts
            if len(parts) >= 3:
                category, series_name = parts[0], parts[1]
                series_dir = series_root / parts[0] / parts[1]
            elif len(parts) == 2:
                category, series_name = parts[0], Path(parts[1]).stem
                series_dir = series_root / parts[0]
            else:
                category, series_name = "Divers", video.stem
                series_dir = series_root

            meta = self._read_optional_metadata(series_dir)
            key = (category, meta.get("title") or series_name)
            if key not in buckets:
                trailer = meta.get("trailer")
                trailer_path = Path(trailer) if trailer else self._find_trailer(series_dir)
                if trailer and not trailer_path.is_absolute():
                    trailer_path = series_dir / trailer

                buckets[key] = {
                    "title": meta.get("title") or series_name,
                    "genre": meta.get("genre") or category,
                    "category": category,
                    "episodes": [],
                    "poster": self._find_image(series_dir),
                    "trailer": trailer_path if trailer_path and trailer_path.exists() else None,
                }

            season_match = re.search(r"season\s*(\d+)", str(video.parent).lower())
            ep_match = re.search(r"(?:e|ep|episode)[ ._-]?(\d+)", video.stem.lower())
            season = int(season_match.group(1)) if season_match else 1
            episode = int(ep_match.group(1)) if ep_match else len(buckets[key]["episodes"]) + 1
            buckets[key]["episodes"].append((season, episode, video))

        for item in buckets.values():
            item["episodes"].sort(key=lambda x: (x[0], x[1]))
            results.append(item)
        return results

    def show_film_actions(self, film: dict):
        win = tk.Toplevel(self.root)
        win.title(film["title"])
        win.geometry("430x240")
        ttk.Label(win, text=film["title"], font=("Arial", 14, "bold")).pack(pady=10)
        ttk.Label(win, text=f"Genre: {film['genre']}").pack(pady=4)
        ttk.Button(win, text="▶ Lire le film (dans l'app)", command=lambda: self.play_in_app(film["video"])) .pack(pady=8)
        if film.get("trailer"):
            ttk.Button(win, text="🎞️ Lire la bande-annonce (dans l'app)", command=lambda: self.play_in_app(film["trailer"])) .pack(pady=4)

    def render_film_grid(self):
        films = self.scan_films()
        cats = sorted({f["category"] for f in films})
        values = list(dict.fromkeys(DEFAULT_FILM_CATEGORIES + cats))
        self.category_combo.configure(values=values, state="readonly")
        if self.category_var.get() not in values:
            self.category_var.set("Toutes")

        search = self.search_var.get().strip().lower()
        selected = self.category_var.get()
        filtered = [
            f
            for f in films
            if (selected == "Toutes" or f["category"] == selected)
            and (not search or search in f["title"].lower() or search in f["genre"].lower())
        ]

        grid = ScrollableGrid(self.content_holder)
        grid.pack(fill="both", expand=True)
        if not filtered:
            ttk.Label(grid.inner, text="Aucun film trouvé. Vérifie streamora_library/films.").grid(row=0, column=0, padx=10, pady=10)
            return

        for i, film in enumerate(filtered):
            card = self._create_poster_button(
                grid.inner,
                film["poster"],
                f"{film['title']}\n{film['genre']}",
                command=lambda x=film: self.show_film_actions(x),
            )
            card.grid(row=i // 6, column=i % 6, padx=8, pady=8)

    def show_series_episodes(self, series_item: dict):
        win = tk.Toplevel(self.root)
        win.title(f"{series_item['title']} - Épisodes")
        win.geometry("780x520")

        head = ttk.Frame(win)
        head.pack(fill="x", pady=8)
        ttk.Label(head, text=f"{series_item['title']} ({series_item['genre']})", font=("Arial", 13, "bold")).pack(side="left", padx=8)
        if series_item.get("trailer"):
            ttk.Button(head, text="🎞️ Bande-annonce", command=lambda: self.play_in_app(series_item["trailer"])).pack(side="right", padx=8)

        tree = ttk.Treeview(win, columns=("season", "episode", "file"), show="headings")
        tree.heading("season", text="Saison")
        tree.heading("episode", text="Épisode")
        tree.heading("file", text="Fichier")
        tree.column("season", width=80)
        tree.column("episode", width=80)
        tree.column("file", width=580)
        tree.pack(fill="both", expand=True, padx=10, pady=8)

        for s, e, f in series_item["episodes"]:
            tree.insert("", "end", values=(s, e, str(f)))

        def play_selected(_e=None):
            sel = tree.selection()
            if not sel:
                return
            values = tree.item(sel[0], "values")
            self.play_in_app(Path(values[2]))

        tree.bind("<Double-1>", play_selected)
        ttk.Button(win, text="▶ Lire l'épisode sélectionné", command=play_selected).pack(pady=(0, 8))

    def render_series_grid(self):
        series = self.scan_series()
        cats = sorted({s["category"] for s in series})
        values = list(dict.fromkeys(DEFAULT_SERIES_CATEGORIES + cats))
        self.category_combo.configure(values=values, state="readonly")
        if self.category_var.get() not in values:
            self.category_var.set("Toutes")

        search = self.search_var.get().strip().lower()
        selected = self.category_var.get()
        filtered = [
            s
            for s in series
            if (selected == "Toutes" or s["category"] == selected)
            and (not search or search in s["title"].lower() or search in s["genre"].lower())
        ]

        grid = ScrollableGrid(self.content_holder)
        grid.pack(fill="both", expand=True)
        if not filtered:
            ttk.Label(grid.inner, text="Aucune série trouvée. Vérifie streamora_library/series.").grid(row=0, column=0, padx=10, pady=10)
            return

        for i, item in enumerate(filtered):
            card = self._create_poster_button(
                grid.inner,
                item["poster"],
                f"{item['title']}\n{item['genre']}\n{len(item['episodes'])} épisodes",
                command=lambda x=item: self.show_series_episodes(x),
            )
            card.grid(row=i // 6, column=i % 6, padx=8, pady=8)

    def logout(self):
        self.current_user = None
        self.active_view = "chooser"
        self.view_history = ["chooser"]
        self.history_index = 0
        self.search_var.set("")
        self.category_var.set("Toutes")
        self.poster_cache.clear()
        self.show_auth_screen()


if __name__ == "__main__":
    root = tk.Tk()
    app = StreamoraApp(root)
    root.mainloop()
