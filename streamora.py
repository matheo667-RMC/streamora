"""Streamora — Premium IPTV Desktop Application."""

import hashlib
import json
import os
import platform
import random
import re
import secrets
import shutil
import sqlite3
import string
import subprocess
import importlib
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk

# Try to import Pillow for advanced image handling
try:
    from PIL import Image, ImageDraw, ImageOps, ImageTk

    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DB_FILE = "iptv_app.db"
LIBRARY_ROOT = Path("streamora_library")
BRANDING_ROOT = LIBRARY_ROOT / "branding"
BRANDING_CONFIG = BRANDING_ROOT / "theme.json"
PROFILES_ROOT = LIBRARY_ROOT / "profiles"
APP_NAME = "Streamora"
VIDEO_EXTS = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v"}
IMAGE_EXTS = ["poster.png", "cover.png", "poster.gif", "cover.gif"]
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_.-]{3,24}$")
DEFAULT_FILM_CATEGORIES = [
    "Toutes", "Action", "Aventure", "Comédie", "Marvel",
    "Horreur", "Animation", "Sci-Fi",
]
DEFAULT_SERIES_CATEGORIES = [
    "Toutes", "Action", "Aventure", "Comédie", "Marvel",
    "Anime", "Documentaire", "Sci-Fi",
]

# ---------------------------------------------------------------------------
# Color Theme — Dark IPTV
# ---------------------------------------------------------------------------
C = {
    "bg": "#0a0a14",
    "bg_card": "#141422",
    "bg_surface": "#1a1a2e",
    "bg_sidebar": "#0e0e1a",
    "bg_input": "#0d0d1a",
    "bg_hover": "#1e1e3a",
    "accent": "#7c3aed",
    "accent_light": "#a78bfa",
    "accent_dark": "#5b21b6",
    "magenta": "#e91e63",
    "magenta_dark": "#c2185b",
    "text": "#f0f0f8",
    "text_secondary": "#a0a0b8",
    "text_muted": "#6c6c80",
    "border": "#2a2a3e",
    "border_light": "#3a3a50",
    "success": "#00e676",
    "error": "#ff1744",
    "warning": "#ffab00",
    "player_bg": "#0d0d14",
    "btn_primary": "#7c3aed",
    "btn_primary_hover": "#6d28d9",
    "btn_secondary": "#1e1e3a",
    "btn_secondary_hover": "#2a2a4a",
    "twitch": "#9146ff",
    "tiktok": "#ff0050",
    "scrollbar": "#2a2a3e",
    "scrollbar_hover": "#3a3a50",
}

FONT_FAMILY = "Helvetica"
FONT = {
    "h1": (FONT_FAMILY, 28, "bold"),
    "h2": (FONT_FAMILY, 22, "bold"),
    "h3": (FONT_FAMILY, 16, "bold"),
    "body": (FONT_FAMILY, 12),
    "body_bold": (FONT_FAMILY, 12, "bold"),
    "small": (FONT_FAMILY, 10),
    "small_bold": (FONT_FAMILY, 10, "bold"),
    "tiny": (FONT_FAMILY, 9),
    "icon": (FONT_FAMILY, 18),
    "icon_large": (FONT_FAMILY, 24),
    "logo_text": (FONT_FAMILY, 22, "bold"),
    "btn": (FONT_FAMILY, 12, "bold"),
    "btn_small": (FONT_FAMILY, 10, "bold"),
    "player": (FONT_FAMILY, 11),
    "player_icon": (FONT_FAMILY, 16),
}

SEEK_SCALE_MAX = 1000


# ---------------------------------------------------------------------------
# Utility Functions
# ---------------------------------------------------------------------------
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


def _round_corner_mask(size: tuple[int, int], radius: int) -> Image.Image:
    """Create a rounded-corner alpha mask using Pillow."""
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([0, 0, size[0], size[1]], radius=radius, fill=255)
    return mask


def _make_circular(img: Image.Image, size: int) -> Image.Image:
    """Crop image to a circle."""
    img = img.resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([0, 0, size, size], fill=255)
    result = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask)
    return result


# ---------------------------------------------------------------------------
# Custom Widgets
# ---------------------------------------------------------------------------
class GradientCanvas(tk.Canvas):
    """Canvas that draws a vertical gradient background."""

    def __init__(self, parent, color1: str, color2: str, **kwargs):
        kwargs.setdefault("highlightthickness", 0)
        kwargs.setdefault("bd", 0)
        super().__init__(parent, **kwargs)
        self._c1 = color1
        self._c2 = color2
        self.bind("<Configure>", self._draw_gradient)

    def _draw_gradient(self, event=None):
        self.delete("gradient")
        w = self.winfo_width()
        h = self.winfo_height()
        if w < 1 or h < 1:
            return
        r1, g1, b1 = self.winfo_rgb(self._c1)
        r2, g2, b2 = self.winfo_rgb(self._c2)
        steps = min(h, 256)
        for i in range(steps):
            t = i / max(steps - 1, 1)
            r = int(r1 + (r2 - r1) * t) >> 8
            g = int(g1 + (g2 - g1) * t) >> 8
            b = int(b1 + (b2 - b1) * t) >> 8
            color = f"#{r:02x}{g:02x}{b:02x}"
            y0 = int(i * h / steps)
            y1 = int((i + 1) * h / steps)
            self.create_rectangle(0, y0, w, y1, fill=color, outline=color, tags="gradient")
        self.tag_lower("gradient")


class ModernButton(tk.Canvas):
    """A modern styled button drawn on a Canvas for rounded corners and hover."""

    def __init__(
        self,
        parent,
        text: str = "",
        command=None,
        bg: str = C["btn_primary"],
        fg: str = C["text"],
        hover_bg: str = C["btn_primary_hover"],
        font=None,
        width: int = 200,
        height: int = 42,
        radius: int = 8,
        icon: str = "",
        **kwargs,
    ):
        super().__init__(
            parent, width=width, height=height,
            highlightthickness=0, bd=0, bg=parent.cget("bg") if hasattr(parent, "cget") else C["bg"],
            **kwargs,
        )
        self._text = text
        self._command = command
        self._bg = bg
        self._fg = fg
        self._hover_bg = hover_bg
        self._font = font or FONT["btn"]
        self._w = width
        self._h = height
        self._r = radius
        self._icon = icon
        self._draw(bg)
        self.bind("<Enter>", lambda _: self._draw(self._hover_bg))
        self.bind("<Leave>", lambda _: self._draw(self._bg))
        self.bind("<ButtonRelease-1>", self._on_click)

    def _draw(self, fill_color: str):
        self.delete("all")
        r = self._r
        w, h = self._w, self._h
        # Rounded rectangle via arcs + rectangles
        self.create_arc(0, 0, 2 * r, 2 * r, start=90, extent=90, fill=fill_color, outline=fill_color)
        self.create_arc(w - 2 * r, 0, w, 2 * r, start=0, extent=90, fill=fill_color, outline=fill_color)
        self.create_arc(0, h - 2 * r, 2 * r, h, start=180, extent=90, fill=fill_color, outline=fill_color)
        self.create_arc(w - 2 * r, h - 2 * r, w, h, start=270, extent=90, fill=fill_color, outline=fill_color)
        self.create_rectangle(r, 0, w - r, h, fill=fill_color, outline=fill_color)
        self.create_rectangle(0, r, w, h - r, fill=fill_color, outline=fill_color)
        display_text = f"{self._icon}  {self._text}" if self._icon else self._text
        self.create_text(
            w // 2, h // 2, text=display_text, fill=self._fg,
            font=self._font, anchor="center",
        )

    def _on_click(self, _event):
        if self._command:
            self._command()

    def configure_text(self, text: str):
        self._text = text
        self._draw(self._bg)


class ModernEntry(tk.Frame):
    """Styled entry with icon and placeholder."""

    def __init__(
        self,
        parent,
        placeholder: str = "",
        icon: str = "",
        show: str = "",
        textvariable=None,
        width: int = 320,
        **kwargs,
    ):
        super().__init__(parent, bg=C["bg_input"], highlightbackground=C["border"],
                         highlightcolor=C["accent"], highlightthickness=1, bd=0, **kwargs)

        if icon:
            lbl = tk.Label(self, text=icon, font=FONT["icon"], bg=C["bg_input"],
                           fg=C["text_muted"], padx=8)
            lbl.pack(side="left")

        self.entry = tk.Entry(
            self,
            font=FONT["body"],
            bg=C["bg_input"],
            fg=C["text"],
            insertbackground=C["accent_light"],
            relief="flat",
            bd=6,
            width=width // 10,
            show=show,
        )
        if textvariable:
            self.entry.configure(textvariable=textvariable)
        self.entry.pack(side="left", fill="x", expand=True, padx=(0, 8), pady=4)

        self._placeholder = placeholder
        self._show = show
        self._has_placeholder = False
        if placeholder and not (textvariable and textvariable.get()):
            self._show_placeholder()
        self.entry.bind("<FocusIn>", self._on_focus_in)
        self.entry.bind("<FocusOut>", self._on_focus_out)

    def _show_placeholder(self):
        self.entry.configure(show="", fg=C["text_muted"])
        self.entry.delete(0, "end")
        self.entry.insert(0, self._placeholder)
        self._has_placeholder = True

    def _on_focus_in(self, _event):
        if self._has_placeholder:
            self.entry.delete(0, "end")
            self.entry.configure(show=self._show, fg=C["text"])
            self._has_placeholder = False

    def _on_focus_out(self, _event):
        if not self.entry.get():
            self._show_placeholder()

    def get(self) -> str:
        if self._has_placeholder:
            return ""
        return self.entry.get()


class SidebarButton(tk.Frame):
    """Sidebar navigation button with icon and hover effect."""

    def __init__(self, parent, text: str, icon: str = "", command=None, active: bool = False, **kwargs):
        bg = C["accent_dark"] if active else C["bg_sidebar"]
        super().__init__(parent, bg=bg, cursor="hand2", **kwargs)

        self._command = command
        self._active = active
        self._normal_bg = bg

        if active:
            accent_bar = tk.Frame(self, bg=C["accent"], width=3)
            accent_bar.pack(side="left", fill="y")

        icon_lbl = tk.Label(
            self, text=icon, font=FONT["icon"], bg=bg,
            fg=C["accent_light"] if active else C["text_secondary"],
            padx=12, pady=10,
        )
        icon_lbl.pack(side="left")

        text_lbl = tk.Label(
            self, text=text, font=FONT["body_bold"] if active else FONT["body"],
            bg=bg, fg=C["text"] if active else C["text_secondary"],
        )
        text_lbl.pack(side="left")

        for widget in [self, icon_lbl, text_lbl]:
            widget.bind("<Enter>", self._on_enter)
            widget.bind("<Leave>", self._on_leave)
            widget.bind("<ButtonRelease-1>", self._on_click)

    def _on_enter(self, _event):
        if not self._active:
            new_bg = C["bg_hover"]
            self.configure(bg=new_bg)
            for child in self.winfo_children():
                try:
                    child.configure(bg=new_bg)
                except tk.TclError:
                    pass

    def _on_leave(self, _event):
        if not self._active:
            self.configure(bg=self._normal_bg)
            for child in self.winfo_children():
                try:
                    child.configure(bg=self._normal_bg)
                except tk.TclError:
                    pass

    def _on_click(self, _event):
        if self._command:
            self._command()


class DarkScrollableGrid(tk.Frame):
    """Scrollable grid with dark theme."""

    def __init__(self, parent):
        super().__init__(parent, bg=C["bg"])
        self.canvas = tk.Canvas(self, highlightthickness=0, bg=C["bg"], bd=0)
        self.scroll = tk.Scrollbar(
            self, orient="vertical", command=self.canvas.yview,
            bg=C["scrollbar"], troughcolor=C["bg"],
            activebackground=C["scrollbar_hover"],
            highlightthickness=0, bd=0, width=10,
        )
        self.inner = tk.Frame(self.canvas, bg=C["bg"])
        self.inner.bind("<Configure>", lambda _e: self.canvas.configure(scrollregion=self.canvas.bbox("all")))
        self._win = self.canvas.create_window((0, 0), window=self.inner, anchor="nw")
        self.canvas.configure(yscrollcommand=self.scroll.set)
        self.canvas.pack(side="left", fill="both", expand=True)
        self.scroll.pack(side="right", fill="y")
        self.canvas.bind("<Configure>", self._on_canvas_resize)
        # Mousewheel scrolling
        self.canvas.bind_all("<MouseWheel>", self._on_mousewheel, add="+")
        self.canvas.bind_all("<Button-4>", lambda _e: self.canvas.yview_scroll(-3, "units"))
        self.canvas.bind_all("<Button-5>", lambda _e: self.canvas.yview_scroll(3, "units"))

    def _on_canvas_resize(self, event):
        self.canvas.itemconfig(self._win, width=event.width)

    def _on_mousewheel(self, event):
        self.canvas.yview_scroll(-1 * int(event.delta / 120), "units")


class MediaCard(tk.Frame):
    """Modern media card with hover effect."""

    def __init__(self, parent, title: str, subtitle: str = "", image=None,
                 command=None, width: int = 185, height: int = 240):
        super().__init__(parent, bg=C["bg_card"], cursor="hand2", padx=2, pady=2)
        self._command = command
        self._normal_bg = C["bg_card"]

        # Poster area
        poster_frame = tk.Frame(self, bg="#111", width=width, height=height - 60)
        poster_frame.pack(fill="x")
        poster_frame.pack_propagate(False)

        if image is not None:
            poster_lbl = tk.Label(poster_frame, image=image, bg="#111")
            poster_lbl.pack(expand=True)
            poster_lbl.bind("<ButtonRelease-1>", self._on_click)
        else:
            placeholder = tk.Label(
                poster_frame, text="🎬", font=(FONT_FAMILY, 36),
                bg="#111", fg=C["text_muted"],
            )
            placeholder.pack(expand=True)
            placeholder.bind("<ButtonRelease-1>", self._on_click)

        # Info area
        info = tk.Frame(self, bg=C["bg_card"], padx=8, pady=6)
        info.pack(fill="x")

        title_lbl = tk.Label(
            info, text=title, font=FONT["small_bold"], bg=C["bg_card"],
            fg=C["text"], anchor="w", wraplength=width - 16,
        )
        title_lbl.pack(anchor="w")

        if subtitle:
            sub_lbl = tk.Label(
                info, text=subtitle, font=FONT["tiny"], bg=C["bg_card"],
                fg=C["text_muted"], anchor="w",
            )
            sub_lbl.pack(anchor="w")

        for widget in [self, poster_frame, info, title_lbl]:
            widget.bind("<Enter>", self._on_enter)
            widget.bind("<Leave>", self._on_leave)
            widget.bind("<ButtonRelease-1>", self._on_click)

    def _on_enter(self, _event):
        self.configure(bg=C["bg_hover"])
        for child in self.winfo_children():
            try:
                child.configure(bg=C["bg_hover"])
                for sub in child.winfo_children():
                    try:
                        sub.configure(bg=C["bg_hover"])
                    except tk.TclError:
                        pass
            except tk.TclError:
                pass

    def _on_leave(self, _event):
        self.configure(bg=self._normal_bg)
        # Restore poster bg
        children = self.winfo_children()
        if children:
            try:
                children[0].configure(bg="#111")
                for sub in children[0].winfo_children():
                    try:
                        sub.configure(bg="#111")
                    except tk.TclError:
                        pass
            except tk.TclError:
                pass
        if len(children) > 1:
            try:
                children[1].configure(bg=C["bg_card"])
                for sub in children[1].winfo_children():
                    try:
                        sub.configure(bg=C["bg_card"])
                    except tk.TclError:
                        pass
            except tk.TclError:
                pass

    def _on_click(self, _event):
        if self._command:
            self._command()


# ---------------------------------------------------------------------------
# Main Application
# ---------------------------------------------------------------------------
class StreamoraApp:
    SIDEBAR_WIDTH = 220

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title(f"{APP_NAME} — Premium IPTV")
        self.root.geometry("1340x800")
        self.root.minsize(1000, 650)
        self.root.configure(bg=C["bg"])

        # DB & library
        self.conn = sqlite3.connect(DB_FILE)
        self.conn.row_factory = sqlite3.Row
        self._init_db()
        self._init_library()

        # State
        self.current_user: dict | None = None
        self.active_view = "home"
        self.search_var = tk.StringVar()
        self.category_var = tk.StringVar(value="Toutes")
        self.poster_cache: dict[str, tk.PhotoImage] = {}
        self.pil_cache: dict[str, ImageTk.PhotoImage] = {} if HAS_PIL else {}
        self.brand_logo: tk.PhotoImage | None = None
        self.logo_photo: tk.PhotoImage | None = None
        self.avatar_photo = None
        self.banner_photo = None

        # VLC
        self.vlc = None
        self.vlc_instance = None
        self.vlc_player = None
        self.is_muted = False
        self.saved_volume = 80
        self.seek_update_id = None
        self.fullscreen_win = None
        self.fs_controls_visible = True
        self.fs_hide_id = None
        self.volume_var = tk.IntVar(value=80)
        self.seek_var = tk.DoubleVar(value=0)

        # Set window icon
        self._set_window_icon()

        # Configure dark styles for ttk widgets
        self._configure_styles()

        # Main container
        self.main_container = tk.Frame(self.root, bg=C["bg"])
        self.main_container.pack(fill="both", expand=True)

        self.show_auth_screen()

    def _set_window_icon(self, custom_path: str | None = None):
        """Set the application window icon."""
        icon_path = custom_path
        if not icon_path:
            # Try branding logo first
            for p in [BRANDING_ROOT / "logo.png", BRANDING_ROOT / "logo_64.png"]:
                if p.exists():
                    icon_path = str(p)
                    break

        if icon_path:
            try:
                icon = tk.PhotoImage(file=icon_path)
                self.root.iconphoto(True, icon)
                self._icon_ref = icon  # Keep reference
            except Exception:
                pass

    def _configure_styles(self):
        style = ttk.Style()
        style.theme_use("clam")

        # General dark theme
        style.configure(".", background=C["bg"], foreground=C["text"], font=FONT["body"])
        style.configure("TFrame", background=C["bg"])
        style.configure("TLabel", background=C["bg"], foreground=C["text"])
        style.configure("TButton", background=C["btn_secondary"], foreground=C["text"],
                         font=FONT["btn"], padding=(12, 6))
        style.map("TButton",
                   background=[("active", C["btn_secondary_hover"]), ("pressed", C["accent_dark"])],
                   foreground=[("active", C["text"])])

        # Combobox
        style.configure("TCombobox", fieldbackground=C["bg_input"], background=C["bg_surface"],
                         foreground=C["text"], arrowcolor=C["text_secondary"],
                         selectbackground=C["accent_dark"], selectforeground=C["text"])
        style.map("TCombobox",
                   fieldbackground=[("readonly", C["bg_input"])],
                   foreground=[("readonly", C["text"])])

        # Scale (slider)
        style.configure("Accent.Horizontal.TScale", background=C["bg"],
                         troughcolor=C["border"], sliderthickness=14)

        # Treeview
        style.configure("Treeview", background=C["bg_surface"], foreground=C["text"],
                         fieldbackground=C["bg_surface"], font=FONT["body"],
                         rowheight=30)
        style.configure("Treeview.Heading", background=C["bg_card"], foreground=C["text"],
                         font=FONT["body_bold"])
        style.map("Treeview", background=[("selected", C["accent_dark"])],
                   foreground=[("selected", C["text"])])

        # Scrollbar
        style.configure("Vertical.TScrollbar", background=C["scrollbar"],
                         troughcolor=C["bg"], arrowcolor=C["text_muted"])

        # LabelFrame
        style.configure("TLabelframe", background=C["bg"], foreground=C["text_secondary"])
        style.configure("TLabelframe.Label", background=C["bg"], foreground=C["accent_light"],
                         font=FONT["body_bold"])

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
                password_hash TEXT NOT NULL,
                profile_picture TEXT DEFAULT '',
                banner_image TEXT DEFAULT '',
                custom_icon TEXT DEFAULT ''
            )
            """
        )
        # Ensure new columns exist on older databases
        existing_cols = {row[1] for row in cur.execute("PRAGMA table_info(users)").fetchall()}
        for col in ["username", "email", "stream_key"]:
            if col not in existing_cols:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT")
        for col in ["profile_picture", "banner_image", "custom_icon"]:
            if col not in existing_cols:
                cur.execute(f"ALTER TABLE users ADD COLUMN {col} TEXT DEFAULT ''")

        # Backfill missing usernames / stream keys
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
        PROFILES_ROOT.mkdir(parents=True, exist_ok=True)

    def _clear(self):
        for child in self.main_container.winfo_children():
            child.destroy()

    # ------------------------------------------------------------------
    # Logo helpers
    # ------------------------------------------------------------------
    def _load_logo_image(self, size: int = 64) -> tk.PhotoImage | None:
        """Load the logo PNG and return a PhotoImage."""
        logo_path = BRANDING_ROOT / "logo.png"
        if not logo_path.exists():
            return None
        if HAS_PIL:
            try:
                img = Image.open(logo_path).resize((size, size), Image.LANCZOS)
                photo = ImageTk.PhotoImage(img)
                self.pil_cache["logo"] = photo
                return photo
            except Exception:
                pass
        try:
            raw = tk.PhotoImage(file=str(logo_path))
            # Subsample to approximate target size
            w, h = raw.width(), raw.height()
            factor = max(1, w // size)
            return raw.subsample(factor, factor)
        except Exception:
            return None

    def _draw_canvas_logo(self, parent, size: int = 72) -> tk.Canvas:
        """Fallback: draw a logo on canvas if PNG not available."""
        c = tk.Canvas(parent, width=size, height=size, highlightthickness=0,
                      bg=parent.cget("bg") if hasattr(parent, "cget") else C["bg"])
        r = size // 2 - 2
        cx, cy = size // 2, size // 2
        # Purple circle
        c.create_oval(cx - r, cy - r, cx + r, cy + r, fill=C["accent"], outline=C["accent_dark"], width=2)
        # Inner dark
        ir = int(r * 0.75)
        c.create_oval(cx - ir, cy - ir, cx + ir, cy + ir, fill=C["bg"], outline="")
        # Play triangle
        ts = int(r * 0.4)
        off = int(ts * 0.15)
        c.create_polygon(
            cx - ts // 2 + off, cy - ts,
            cx - ts // 2 + off, cy + ts,
            cx + ts + off, cy,
            fill="white", outline="",
        )
        return c

    # ------------------------------------------------------------------
    # Avatar / Profile helpers
    # ------------------------------------------------------------------
    def _get_user_profile_dir(self) -> Path:
        if self.current_user:
            d = PROFILES_ROOT / self.current_user["username"]
            d.mkdir(parents=True, exist_ok=True)
            return d
        return PROFILES_ROOT

    def _load_avatar(self, size: int = 48) -> ImageTk.PhotoImage | None:
        """Load user's circular avatar."""
        if not HAS_PIL or not self.current_user:
            return None
        pp = self.current_user.get("profile_picture", "")
        if not pp:
            return None
        path = Path(pp)
        if not path.is_absolute():
            path = self._get_user_profile_dir() / pp
        if not path.exists():
            return None
        try:
            img = Image.open(path).convert("RGBA")
            circular = _make_circular(img, size)
            photo = ImageTk.PhotoImage(circular)
            self.pil_cache["avatar"] = photo
            return photo
        except Exception:
            return None

    def _load_banner(self, width: int = 800, height: int = 200) -> ImageTk.PhotoImage | None:
        """Load user's banner image."""
        if not HAS_PIL or not self.current_user:
            return None
        bp = self.current_user.get("banner_image", "")
        if not bp:
            return None
        path = Path(bp)
        if not path.is_absolute():
            path = self._get_user_profile_dir() / bp
        if not path.exists():
            return None
        try:
            img = Image.open(path).convert("RGB")
            img = ImageOps.fit(img, (width, height), Image.LANCZOS)
            photo = ImageTk.PhotoImage(img)
            self.pil_cache["banner"] = photo
            return photo
        except Exception:
            return None

    def _default_avatar_canvas(self, parent, size: int = 48) -> tk.Canvas:
        """Draw a default circular avatar with user initial."""
        c = tk.Canvas(parent, width=size, height=size, highlightthickness=0,
                      bg=parent.cget("bg"))
        r = size // 2 - 1
        cx, cy = size // 2, size // 2
        c.create_oval(cx - r, cy - r, cx + r, cy + r, fill=C["accent"], outline=C["accent_dark"], width=1)
        initial = "?"
        if self.current_user:
            initial = self.current_user["username"][0].upper()
        font_size = max(10, size // 3)
        c.create_text(cx, cy, text=initial, fill="white", font=(FONT_FAMILY, font_size, "bold"))
        return c

    # ==================================================================
    # AUTH SCREEN
    # ==================================================================
    def show_auth_screen(self):
        self._clear()
        self.root.configure(bg=C["bg"])

        # Background gradient
        bg = GradientCanvas(self.main_container, C["bg"], "#0f0f24")
        bg.pack(fill="both", expand=True)

        # Center card
        card = tk.Frame(bg, bg=C["bg_card"], padx=40, pady=30)
        card.place(relx=0.5, rely=0.5, anchor="center")

        # Logo
        logo_photo = self._load_logo_image(72)
        if logo_photo:
            self.logo_photo = logo_photo
            tk.Label(card, image=logo_photo, bg=C["bg_card"]).pack(pady=(0, 6))
        else:
            canvas_logo = self._draw_canvas_logo(card, 72)
            canvas_logo.pack(pady=(0, 6))

        # App name
        tk.Label(card, text="STREAMORA", font=FONT["h2"], bg=C["bg_card"],
                 fg=C["accent_light"]).pack()
        tk.Label(card, text="Premium IPTV Desktop", font=FONT["small"],
                 bg=C["bg_card"], fg=C["text_muted"]).pack(pady=(0, 20))

        # Tab buttons (Login / Register)
        self._auth_mode = tk.StringVar(value="login")
        tab_frame = tk.Frame(card, bg=C["bg_card"])
        tab_frame.pack(fill="x", pady=(0, 16))

        self._tab_login_btn = tk.Button(
            tab_frame, text="Se connecter", font=FONT["btn"],
            bg=C["accent"], fg="white", bd=0, padx=20, pady=6, cursor="hand2",
            activebackground=C["accent_dark"], activeforeground="white",
            command=lambda: self._switch_auth_tab("login"),
        )
        self._tab_login_btn.pack(side="left", expand=True, fill="x", padx=(0, 2))

        self._tab_register_btn = tk.Button(
            tab_frame, text="S'inscrire", font=FONT["btn"],
            bg=C["btn_secondary"], fg=C["text_secondary"], bd=0, padx=20, pady=6, cursor="hand2",
            activebackground=C["btn_secondary_hover"], activeforeground=C["text"],
            command=lambda: self._switch_auth_tab("register"),
        )
        self._tab_register_btn.pack(side="left", expand=True, fill="x", padx=(2, 0))

        # Form container (swapped based on tab)
        self._auth_form_container = tk.Frame(card, bg=C["bg_card"])
        self._auth_form_container.pack(fill="x")

        self._build_login_form()

        # Divider + Social login
        divider_frame = tk.Frame(card, bg=C["bg_card"])
        divider_frame.pack(fill="x", pady=16)
        tk.Frame(divider_frame, bg=C["border"], height=1).pack(side="left", fill="x", expand=True)
        tk.Label(divider_frame, text="  ou  ", font=FONT["small"], bg=C["bg_card"],
                 fg=C["text_muted"]).pack(side="left")
        tk.Frame(divider_frame, bg=C["border"], height=1).pack(side="left", fill="x", expand=True)

        social_frame = tk.Frame(card, bg=C["bg_card"])
        social_frame.pack(fill="x")

        twitch_btn = ModernButton(
            social_frame, text="Twitch", icon="📺", command=self._social_twitch,
            bg=C["twitch"], hover_bg="#7c3aff", width=160, height=38,
            font=FONT["btn_small"],
        )
        twitch_btn.pack(side="left", padx=(0, 8), expand=True)

        tiktok_btn = ModernButton(
            social_frame, text="TikTok", icon="🎵", command=self._social_tiktok,
            bg=C["tiktok"], hover_bg="#cc0040", width=160, height=38,
            font=FONT["btn_small"],
        )
        tiktok_btn.pack(side="left", expand=True)

        # Footer
        tk.Label(card, text=f"Bibliothèque: {LIBRARY_ROOT}/",
                 font=FONT["tiny"], bg=C["bg_card"], fg=C["text_muted"]).pack(pady=(16, 0))

    def _switch_auth_tab(self, mode: str):
        self._auth_mode.set(mode)
        for child in self._auth_form_container.winfo_children():
            child.destroy()

        if mode == "login":
            self._tab_login_btn.configure(bg=C["accent"], fg="white")
            self._tab_register_btn.configure(bg=C["btn_secondary"], fg=C["text_secondary"])
            self._build_login_form()
        else:
            self._tab_login_btn.configure(bg=C["btn_secondary"], fg=C["text_secondary"])
            self._tab_register_btn.configure(bg=C["accent"], fg="white")
            self._build_register_form()

    def _build_login_form(self):
        f = self._auth_form_container

        tk.Label(f, text="Nom d'utilisateur", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"], anchor="w").pack(fill="x", pady=(0, 4))
        self._login_user = ModernEntry(f, placeholder="Entrez votre nom", icon="👤")
        self._login_user.pack(fill="x", pady=(0, 12))

        tk.Label(f, text="Mot de passe", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"], anchor="w").pack(fill="x", pady=(0, 4))
        self._login_pass = ModernEntry(f, placeholder="Entrez votre mot de passe", icon="🔒", show="•")
        self._login_pass.pack(fill="x", pady=(0, 16))

        login_btn = ModernButton(
            f, text="SE CONNECTER", command=self._do_login,
            bg=C["accent"], hover_bg=C["accent_dark"],
            width=340, height=44, radius=6,
        )
        login_btn.pack(fill="x")

        forgot = tk.Label(f, text="Mot de passe oublié ?", font=FONT["small"],
                          bg=C["bg_card"], fg=C["accent_light"], cursor="hand2")
        forgot.pack(pady=(10, 0))
        forgot.bind("<ButtonRelease-1>", lambda _: self._do_forgot_password())

    def _build_register_form(self):
        f = self._auth_form_container

        tk.Label(f, text="Nom d'utilisateur", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"], anchor="w").pack(fill="x", pady=(0, 4))
        self._reg_user = ModernEntry(f, placeholder="Choisissez un nom unique", icon="👤")
        self._reg_user.pack(fill="x", pady=(0, 10))

        tk.Label(f, text="Email (optionnel)", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"], anchor="w").pack(fill="x", pady=(0, 4))
        self._reg_email = ModernEntry(f, placeholder="votre@email.com", icon="📧")
        self._reg_email.pack(fill="x", pady=(0, 10))

        tk.Label(f, text="Mot de passe", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"], anchor="w").pack(fill="x", pady=(0, 4))
        self._reg_pass = ModernEntry(f, placeholder="6 caractères minimum", icon="🔒", show="•")
        self._reg_pass.pack(fill="x", pady=(0, 10))

        tk.Label(f, text="Confirmer le mot de passe", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"], anchor="w").pack(fill="x", pady=(0, 4))
        self._reg_pass2 = ModernEntry(f, placeholder="Répétez le mot de passe", icon="🔒", show="•")
        self._reg_pass2.pack(fill="x", pady=(0, 16))

        reg_btn = ModernButton(
            f, text="CRÉER MON COMPTE", command=self._do_register,
            bg=C["magenta"], hover_bg=C["magenta_dark"],
            width=340, height=44, radius=6,
        )
        reg_btn.pack(fill="x")

    def _social_twitch(self):
        messagebox.showinfo("Twitch", "Connexion via Twitch — Bientôt disponible ! 🎮")

    def _social_tiktok(self):
        messagebox.showinfo("TikTok", "Connexion via TikTok — Bientôt disponible ! 🎵")

    # ------------------------------------------------------------------
    # Auth logic
    # ------------------------------------------------------------------
    def _validate_credentials(self, username: str, password: str) -> bool:
        username = (username or "").strip()
        if not USERNAME_RE.match(username):
            messagebox.showerror("Erreur", "Nom utilisateur invalide (3-24, lettres/chiffres/_.-).")
            return False
        if not password or len(password) < 6:
            messagebox.showerror("Erreur", "Mot de passe doit faire 6+ caractères.")
            return False
        return True

    def _do_login(self):
        username = self._login_user.get().strip().lower()
        password = self._login_pass.get()
        if not self._validate_credentials(username, password):
            return

        row = self.conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            messagebox.showerror("Erreur", "Compte introuvable.")
            return
        if hash_password(password, row["salt"]) != row["password_hash"]:
            messagebox.showerror("Erreur", "Mot de passe incorrect.")
            return

        # Stream key prompt
        stream_key_input = self._prompt_stream_key(username)
        if not stream_key_input or stream_key_input.strip().upper() != (row["stream_key"] or "").upper():
            messagebox.showerror("Erreur", "Stream Key invalide.")
            return

        self.current_user = dict(row)
        self.root.clipboard_clear()
        self.root.clipboard_append(self.current_user["stream_key"])
        self.active_view = "home"

        # Apply custom icon if set
        if self.current_user.get("custom_icon"):
            self._set_window_icon(self.current_user["custom_icon"])

        self.show_dashboard()

    def _do_register(self):
        username = self._reg_user.get().strip().lower()
        password = self._reg_pass.get()
        password2 = self._reg_pass2.get()
        email = self._reg_email.get().strip()

        if not self._validate_credentials(username, password):
            return
        if password != password2:
            messagebox.showerror("Erreur", "Les mots de passe ne correspondent pas.")
            return

        salt = secrets.token_hex(16)
        key = generate_stream_key()
        while self.conn.execute("SELECT 1 FROM users WHERE stream_key = ?", (key,)).fetchone():
            key = generate_stream_key()

        try:
            self.conn.execute(
                "INSERT INTO users(username, email, stream_key, salt, password_hash) VALUES (?, ?, ?, ?, ?)",
                (username, email, key, salt, hash_password(password, salt)),
            )
            self.conn.commit()
            # Create profile directory
            (PROFILES_ROOT / username).mkdir(parents=True, exist_ok=True)
            self.root.clipboard_clear()
            self.root.clipboard_append(key)
            messagebox.showinfo(
                "Compte créé ✨",
                f"Bienvenue {username} !\n\nStream Key: {key}\n(Clé copiée automatiquement)",
            )
            # Switch to login tab
            self._switch_auth_tab("login")
        except sqlite3.IntegrityError:
            messagebox.showerror("Erreur", "Ce nom d'utilisateur existe déjà.")

    def _do_forgot_password(self):
        username = self._login_user.get().strip().lower()
        if not username:
            messagebox.showerror("Erreur", "Entre ton nom d'utilisateur d'abord.")
            return
        self.reset_password(username)

    def reset_password(self, username: str):
        username = (username or "").strip().lower()
        row = self.conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
        if not row:
            messagebox.showerror("Erreur", "Compte introuvable.")
            return

        code = secrets.token_hex(3).upper()
        messagebox.showinfo("Code", f"Code de réinitialisation: {code}")
        typed = simpledialog.askstring("Code", "Entre le code:", parent=self.root)
        if typed != code:
            messagebox.showerror("Erreur", "Code invalide.")
            return

        new_pw = simpledialog.askstring("Nouveau", "Nouveau mot de passe:", parent=self.root, show="*")
        if not new_pw or len(new_pw) < 6:
            messagebox.showerror("Erreur", "Mot de passe trop court.")
            return

        salt = secrets.token_hex(16)
        self.conn.execute(
            "UPDATE users SET salt = ?, password_hash = ? WHERE id = ?",
            (salt, hash_password(new_pw, salt), row["id"]),
        )
        self.conn.commit()
        messagebox.showinfo("OK", "Mot de passe changé avec succès !")

    def _prompt_stream_key(self, username: str) -> str | None:
        dialog = tk.Toplevel(self.root)
        dialog.title("Stream Key")
        dialog.geometry("460x180")
        dialog.configure(bg=C["bg_card"])
        dialog.transient(self.root)
        dialog.grab_set()

        result = {"value": None}
        key_var = tk.StringVar()

        tk.Label(dialog, text="🔑 Entre ta Stream Key", font=FONT["h3"],
                 bg=C["bg_card"], fg=C["text"]).pack(pady=(16, 8))

        row = tk.Frame(dialog, bg=C["bg_card"])
        row.pack(fill="x", padx=20)
        entry = tk.Entry(
            row, textvariable=key_var, font=FONT["body"], bg=C["bg_input"],
            fg=C["text"], insertbackground=C["accent_light"], relief="flat", bd=6, width=30,
        )
        entry.pack(side="left", fill="x", expand=True)
        entry.focus_set()

        tk.Button(
            row, text="📋", font=FONT["body"], bg=C["btn_secondary"], fg=C["text"],
            bd=0, padx=8, command=lambda: self._copy_key_by_username(username, silent=True),
        ).pack(side="left", padx=4)
        tk.Button(
            row, text="Coller", font=FONT["btn_small"], bg=C["btn_secondary"], fg=C["text"],
            bd=0, padx=8, command=lambda: key_var.set(self.root.clipboard_get()),
        ).pack(side="left")

        btn_row = tk.Frame(dialog, bg=C["bg_card"])
        btn_row.pack(pady=12)

        def on_ok():
            result["value"] = key_var.get().strip()
            dialog.destroy()

        tk.Button(btn_row, text="Valider", font=FONT["btn"], bg=C["accent"], fg="white",
                  bd=0, padx=20, pady=4, command=on_ok).pack(side="left", padx=6)
        tk.Button(btn_row, text="Annuler", font=FONT["btn"], bg=C["btn_secondary"], fg=C["text"],
                  bd=0, padx=20, pady=4, command=dialog.destroy).pack(side="left", padx=6)

        entry.bind("<Return>", lambda _: on_ok())
        dialog.wait_window()
        return result["value"]

    def _copy_key_by_username(self, username: str, silent: bool = False):
        username = (username or "").strip().lower()
        if not username:
            if not silent:
                messagebox.showerror("Erreur", "Entre ton nom d'utilisateur.")
            return
        row = self.conn.execute("SELECT stream_key FROM users WHERE username = ?", (username,)).fetchone()
        if not row or not row["stream_key"]:
            if not silent:
                messagebox.showerror("Erreur", "Aucune Stream Key trouvée.")
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(row["stream_key"])
        if not silent:
            messagebox.showinfo("Copié", "Stream Key copiée !")

    # ==================================================================
    # DASHBOARD (Sidebar + Content)
    # ==================================================================
    def show_dashboard(self):
        self._clear()
        self.root.configure(bg=C["bg"])

        # Main layout: sidebar | content | player bottom
        wrapper = tk.Frame(self.main_container, bg=C["bg"])
        wrapper.pack(fill="both", expand=True)

        # Sidebar
        self.sidebar = tk.Frame(wrapper, bg=C["bg_sidebar"], width=self.SIDEBAR_WIDTH)
        self.sidebar.pack(side="left", fill="y")
        self.sidebar.pack_propagate(False)

        self._build_sidebar()

        # Right side (content + player)
        right = tk.Frame(wrapper, bg=C["bg"])
        right.pack(side="left", fill="both", expand=True)

        # Top bar (search + user info)
        topbar = tk.Frame(right, bg=C["bg_card"], height=56)
        topbar.pack(fill="x")
        topbar.pack_propagate(False)
        self._build_topbar(topbar)

        # Content area
        self.content_area = tk.Frame(right, bg=C["bg"])
        self.content_area.pack(fill="both", expand=True)

        # Bottom player bar
        self.player_bar = tk.Frame(right, bg=C["player_bg"], height=72)
        self.player_bar.pack(fill="x", side="bottom")
        self.player_bar.pack_propagate(False)
        self._build_player_bar()

        # Show content based on active view
        self.refresh_current_view()

    def _build_sidebar(self):
        sb = self.sidebar

        # Logo area
        logo_frame = tk.Frame(sb, bg=C["bg_sidebar"], pady=16)
        logo_frame.pack(fill="x")

        logo_row = tk.Frame(logo_frame, bg=C["bg_sidebar"])
        logo_row.pack()
        logo_photo = self._load_logo_image(40)
        if logo_photo:
            self.logo_photo = logo_photo
            tk.Label(logo_row, image=logo_photo, bg=C["bg_sidebar"]).pack(side="left", padx=(16, 8))
        else:
            canvas = self._draw_canvas_logo(logo_row, 40)
            canvas.pack(side="left", padx=(16, 8))

        tk.Label(logo_row, text="STREAMORA", font=FONT["logo_text"],
                 bg=C["bg_sidebar"], fg=C["accent_light"]).pack(side="left")

        # Separator
        tk.Frame(sb, bg=C["border"], height=1).pack(fill="x", padx=12, pady=(0, 8))

        # Avatar + username
        avatar_frame = tk.Frame(sb, bg=C["bg_sidebar"], padx=16, pady=8)
        avatar_frame.pack(fill="x")

        avatar_photo = self._load_avatar(40)
        if avatar_photo:
            self.avatar_photo = avatar_photo
            tk.Label(avatar_frame, image=avatar_photo, bg=C["bg_sidebar"]).pack(side="left", padx=(0, 10))
        else:
            self._default_avatar_canvas(avatar_frame, 40).pack(side="left", padx=(0, 10))

        user_info = tk.Frame(avatar_frame, bg=C["bg_sidebar"])
        user_info.pack(side="left")
        tk.Label(user_info, text=self.current_user["username"], font=FONT["body_bold"],
                 bg=C["bg_sidebar"], fg=C["text"]).pack(anchor="w")
        tk.Label(user_info, text="Premium", font=FONT["tiny"],
                 bg=C["bg_sidebar"], fg=C["accent_light"]).pack(anchor="w")

        tk.Frame(sb, bg=C["border"], height=1).pack(fill="x", padx=12, pady=8)

        # Navigation
        nav_items = [
            ("🏠", "Accueil", "home"),
            ("🎬", "Films", "films"),
            ("📺", "Séries", "series"),
            ("👤", "Profil", "profile"),
            ("⚙", "Paramètres", "settings"),
        ]
        for icon, text, view in nav_items:
            btn = SidebarButton(
                sb, text=text, icon=icon,
                active=(self.active_view == view),
                command=lambda v=view: self._navigate_to(v),
            )
            btn.pack(fill="x")

        # Spacer
        tk.Frame(sb, bg=C["bg_sidebar"]).pack(fill="both", expand=True)

        # Stream key copy
        key_frame = tk.Frame(sb, bg=C["bg_sidebar"], padx=12, pady=4)
        key_frame.pack(fill="x")
        tk.Label(key_frame, text="🔑 Stream Key", font=FONT["tiny"],
                 bg=C["bg_sidebar"], fg=C["text_muted"]).pack(anchor="w")
        key_text = self.current_user["stream_key"][:8] + "..."
        key_row = tk.Frame(key_frame, bg=C["bg_sidebar"])
        key_row.pack(fill="x")
        tk.Label(key_row, text=key_text, font=FONT["tiny"],
                 bg=C["bg_sidebar"], fg=C["text_secondary"]).pack(side="left")
        tk.Button(
            key_row, text="Copier", font=FONT["tiny"], bg=C["btn_secondary"],
            fg=C["text_muted"], bd=0, padx=6, pady=1, cursor="hand2",
            command=self._copy_stream_key,
        ).pack(side="right")

        tk.Frame(sb, bg=C["border"], height=1).pack(fill="x", padx=12, pady=8)

        # Logout
        SidebarButton(
            sb, text="Déconnexion", icon="🚪",
            command=self.logout,
        ).pack(fill="x", pady=(0, 8))

    def _build_topbar(self, parent):
        # Search bar
        search_frame = tk.Frame(parent, bg=C["bg_card"], padx=16)
        search_frame.pack(side="left", fill="both", expand=True)

        search_inner = tk.Frame(search_frame, bg=C["bg_input"],
                                highlightbackground=C["border"], highlightthickness=1)
        search_inner.pack(side="left", fill="x", expand=True, pady=10)

        tk.Label(search_inner, text="🔍", font=FONT["body"], bg=C["bg_input"],
                 fg=C["text_muted"], padx=8).pack(side="left")
        search_entry = tk.Entry(
            search_inner, textvariable=self.search_var, font=FONT["body"],
            bg=C["bg_input"], fg=C["text"], insertbackground=C["accent_light"],
            relief="flat", bd=4, width=30,
        )
        search_entry.pack(side="left", fill="x", expand=True, padx=(0, 8))
        search_entry.bind("<KeyRelease>", lambda _e: self.refresh_current_view())

        # Category filter (only show for films/series)
        self.category_frame = tk.Frame(parent, bg=C["bg_card"], padx=8)
        self.category_frame.pack(side="left")
        tk.Label(self.category_frame, text="Catégorie", font=FONT["small"],
                 bg=C["bg_card"], fg=C["text_secondary"]).pack(side="left", padx=(0, 4))
        self.category_combo = ttk.Combobox(
            self.category_frame, textvariable=self.category_var,
            values=["Toutes"], width=14, state="readonly",
        )
        self.category_combo.pack(side="left")
        self.category_combo.bind("<<ComboboxSelected>>", lambda _e: self.refresh_current_view())

        # User greeting
        greeting = tk.Frame(parent, bg=C["bg_card"], padx=16)
        greeting.pack(side="right")
        tk.Label(greeting, text=f"Salut, {self.current_user['username']} !",
                 font=FONT["small_bold"], bg=C["bg_card"], fg=C["text_secondary"]).pack()

    def _build_player_bar(self):
        """Build the bottom player controls bar."""
        bar = self.player_bar

        # Now playing info
        info_frame = tk.Frame(bar, bg=C["player_bg"], width=200)
        info_frame.pack(side="left", fill="y", padx=12)
        info_frame.pack_propagate(False)
        self.player_status = tk.Label(
            info_frame, text="Aucune lecture", font=FONT["small"],
            bg=C["player_bg"], fg=C["text_secondary"], anchor="w",
        )
        self.player_status.pack(side="left", fill="x", expand=True, pady=0)

        # Center controls
        controls = tk.Frame(bar, bg=C["player_bg"])
        controls.pack(side="left", fill="both", expand=True)

        # Buttons row
        btn_row = tk.Frame(controls, bg=C["player_bg"])
        btn_row.pack(pady=(8, 2))

        btn_style = dict(font=FONT["player_icon"], bg=C["player_bg"], fg=C["text"],
                         bd=0, padx=8, pady=0, cursor="hand2",
                         activebackground=C["bg_hover"], activeforeground=C["accent_light"])

        self.btn_play_pause = tk.Button(btn_row, text="▶", command=self.toggle_play_pause, **btn_style)
        self.btn_play_pause.pack(side="left", padx=4)

        self.btn_stop = tk.Button(btn_row, text="⏹", command=self.stop_playback, **btn_style)
        self.btn_stop.pack(side="left", padx=4)

        # Seek row
        seek_row = tk.Frame(controls, bg=C["player_bg"])
        seek_row.pack(fill="x", padx=20)

        self.elapsed_label = tk.Label(seek_row, text="00:00", font=FONT["tiny"],
                                       bg=C["player_bg"], fg=C["text_muted"], width=6)
        self.elapsed_label.pack(side="left")

        self.seek_bar = ttk.Scale(
            seek_row, from_=0, to=SEEK_SCALE_MAX, orient="horizontal",
            variable=self.seek_var, style="Accent.Horizontal.TScale",
        )
        self.seek_bar.pack(side="left", fill="x", expand=True, padx=4)
        self.seek_bar.bind("<ButtonRelease-1>", self._on_seek)

        self.duration_label = tk.Label(seek_row, text="00:00", font=FONT["tiny"],
                                        bg=C["player_bg"], fg=C["text_muted"], width=6)
        self.duration_label.pack(side="left")

        # Volume controls (right side)
        vol_frame = tk.Frame(bar, bg=C["player_bg"], padx=12)
        vol_frame.pack(side="right", fill="y")

        self.btn_mute = tk.Button(
            vol_frame, text="🔊", command=self.toggle_mute,
            font=FONT["player"], bg=C["player_bg"], fg=C["text"],
            bd=0, padx=4, cursor="hand2",
            activebackground=C["bg_hover"],
        )
        self.btn_mute.pack(side="left")

        self.volume_slider = ttk.Scale(
            vol_frame, from_=0, to=100, orient="horizontal",
            variable=self.volume_var, command=self._on_volume_change,
            length=90, style="Accent.Horizontal.TScale",
        )
        self.volume_slider.pack(side="left", padx=(2, 0), pady=0)

    # ------------------------------------------------------------------
    # Navigation
    # ------------------------------------------------------------------
    def _navigate_to(self, view: str):
        self.active_view = view
        self.search_var.set("")
        self.category_var.set("Toutes")
        # Rebuild sidebar to update active state
        for child in self.sidebar.winfo_children():
            child.destroy()
        self._build_sidebar()
        self.refresh_current_view()

    def refresh_current_view(self):
        for child in self.content_area.winfo_children():
            child.destroy()

        # Show/hide category filter
        if self.active_view in ("films", "series"):
            self.category_frame.pack(side="left")
        else:
            self.category_frame.pack_forget()

        if self.active_view == "home":
            self._render_home()
        elif self.active_view == "films":
            self._render_film_grid()
        elif self.active_view == "series":
            self._render_series_grid()
        elif self.active_view == "profile":
            self._render_profile()
        elif self.active_view == "settings":
            self._render_settings()
        else:
            self._render_home()

    # ------------------------------------------------------------------
    # HOME
    # ------------------------------------------------------------------
    def _render_home(self):
        page = tk.Frame(self.content_area, bg=C["bg"])
        page.pack(fill="both", expand=True, padx=24, pady=16)

        # Welcome header
        tk.Label(page, text="Bienvenue sur Streamora ✨", font=FONT["h1"],
                 bg=C["bg"], fg=C["text"]).pack(anchor="w", pady=(0, 4))
        tk.Label(page, text="Choisis ce que tu veux regarder", font=FONT["body"],
                 bg=C["bg"], fg=C["text_secondary"]).pack(anchor="w", pady=(0, 24))

        # Big buttons for Films / Series
        cards_frame = tk.Frame(page, bg=C["bg"])
        cards_frame.pack(fill="x")

        # Films card
        film_card = tk.Frame(cards_frame, bg=C["accent_dark"], cursor="hand2", padx=30, pady=30)
        film_card.pack(side="left", fill="both", expand=True, padx=(0, 8))
        tk.Label(film_card, text="🎬", font=(FONT_FAMILY, 48), bg=C["accent_dark"],
                 fg="white").pack()
        tk.Label(film_card, text="FILMS", font=FONT["h2"], bg=C["accent_dark"],
                 fg="white").pack(pady=(8, 4))
        tk.Label(film_card, text="Regarde tes films en plein écran", font=FONT["small"],
                 bg=C["accent_dark"], fg=C["accent_light"]).pack()

        for w in [film_card] + film_card.winfo_children():
            w.bind("<ButtonRelease-1>", lambda _: self._navigate_to("films"))
            w.bind("<Enter>", lambda _, f=film_card: f.configure(bg=C["accent"]) or self._recolor_children(f, C["accent"]))
            w.bind("<Leave>", lambda _, f=film_card: f.configure(bg=C["accent_dark"]) or self._recolor_children(f, C["accent_dark"]))

        # Series card
        series_card = tk.Frame(cards_frame, bg=C["magenta_dark"], cursor="hand2", padx=30, pady=30)
        series_card.pack(side="left", fill="both", expand=True, padx=(8, 0))
        tk.Label(series_card, text="📺", font=(FONT_FAMILY, 48), bg=C["magenta_dark"],
                 fg="white").pack()
        tk.Label(series_card, text="SÉRIES", font=FONT["h2"], bg=C["magenta_dark"],
                 fg="white").pack(pady=(8, 4))
        tk.Label(series_card, text="Regarde tes séries préférées", font=FONT["small"],
                 bg=C["magenta_dark"], fg="#ff8a80").pack()

        for w in [series_card] + series_card.winfo_children():
            w.bind("<ButtonRelease-1>", lambda _: self._navigate_to("series"))
            w.bind("<Enter>", lambda _, f=series_card: f.configure(bg=C["magenta"]) or self._recolor_children(f, C["magenta"]))
            w.bind("<Leave>", lambda _, f=series_card: f.configure(bg=C["magenta_dark"]) or self._recolor_children(f, C["magenta_dark"]))

        # Quick stats
        stats_frame = tk.Frame(page, bg=C["bg"])
        stats_frame.pack(fill="x", pady=(24, 0))

        films = self.scan_films()
        series = self.scan_series()

        for label, value, color in [
            ("Films", str(len(films)), C["accent"]),
            ("Séries", str(len(series)), C["magenta"]),
            ("Épisodes", str(sum(len(s["episodes"]) for s in series)), C["success"]),
        ]:
            stat = tk.Frame(stats_frame, bg=C["bg_card"], padx=20, pady=12)
            stat.pack(side="left", fill="x", expand=True, padx=4)
            tk.Label(stat, text=value, font=FONT["h2"], bg=C["bg_card"], fg=color).pack()
            tk.Label(stat, text=label, font=FONT["small"], bg=C["bg_card"], fg=C["text_secondary"]).pack()

    def _recolor_children(self, widget, color):
        for child in widget.winfo_children():
            try:
                child.configure(bg=color)
            except tk.TclError:
                pass

    # ------------------------------------------------------------------
    # FILMS
    # ------------------------------------------------------------------
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

            results.append({
                "title": meta.get("title") or title,
                "genre": meta.get("genre") or category,
                "category": category,
                "video": video,
                "poster": self._find_image(media_dir),
                "trailer": trailer_path if trailer_path and trailer_path.exists() else None,
            })
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

    def _create_poster_image(self, image_path: Path | None, size: tuple[int, int] = (160, 200)):
        """Load a poster image, return PhotoImage or None."""
        if image_path is None:
            return None
        cache_key = f"{image_path}_{size}"
        if cache_key in self.poster_cache:
            return self.poster_cache[cache_key]

        if HAS_PIL:
            try:
                img = Image.open(image_path).convert("RGB")
                img = ImageOps.fit(img, size, Image.LANCZOS)
                photo = ImageTk.PhotoImage(img)
                self.pil_cache[cache_key] = photo
                return photo
            except Exception:
                pass

        try:
            photo = tk.PhotoImage(file=str(image_path))
            self.poster_cache[str(image_path)] = photo
            return photo
        except Exception:
            return None

    def _render_film_grid(self):
        films = self.scan_films()
        cats = sorted({f["category"] for f in films})
        values = list(dict.fromkeys(DEFAULT_FILM_CATEGORIES + cats))
        self.category_combo.configure(values=values, state="readonly")
        if self.category_var.get() not in values:
            self.category_var.set("Toutes")

        search = self.search_var.get().strip().lower()
        selected = self.category_var.get()
        filtered = [
            f for f in films
            if (selected == "Toutes" or f["category"] == selected)
            and (not search or search in f["title"].lower() or search in f["genre"].lower())
        ]

        # Header
        header = tk.Frame(self.content_area, bg=C["bg"], padx=24, pady=(12, 0))
        header.pack(fill="x")
        tk.Label(header, text="🎬 Films", font=FONT["h2"], bg=C["bg"], fg=C["text"]).pack(side="left")
        tk.Label(header, text=f"{len(filtered)} films", font=FONT["small"],
                 bg=C["bg"], fg=C["text_muted"]).pack(side="right")

        grid = DarkScrollableGrid(self.content_area)
        grid.pack(fill="both", expand=True, padx=16, pady=8)

        if not filtered:
            tk.Label(grid.inner, text="Aucun film trouvé.", font=FONT["body"],
                     bg=C["bg"], fg=C["text_muted"]).grid(row=0, column=0, padx=20, pady=20)
            return

        cols = 5
        for i, film in enumerate(filtered):
            poster = self._create_poster_image(film["poster"])
            card = MediaCard(
                grid.inner, title=film["title"], subtitle=film["genre"],
                image=poster, command=lambda x=film: self._show_film_actions(x),
            )
            card.grid(row=i // cols, column=i % cols, padx=6, pady=6, sticky="n")

    def _show_film_actions(self, film: dict):
        win = tk.Toplevel(self.root)
        win.title(film["title"])
        win.geometry("500x300")
        win.configure(bg=C["bg_card"])
        win.transient(self.root)

        tk.Label(win, text=film["title"], font=FONT["h2"], bg=C["bg_card"],
                 fg=C["text"]).pack(pady=(20, 4))
        tk.Label(win, text=f"Genre: {film['genre']}", font=FONT["body"],
                 bg=C["bg_card"], fg=C["text_secondary"]).pack(pady=4)

        btn_frame = tk.Frame(win, bg=C["bg_card"])
        btn_frame.pack(pady=20)

        ModernButton(
            btn_frame, text="▶  Lire le film", command=lambda: self.play_in_app(film["video"]),
            bg=C["accent"], hover_bg=C["accent_dark"], width=220, height=44,
        ).pack(pady=4)

        if film.get("trailer"):
            ModernButton(
                btn_frame, text="🎞  Bande-annonce",
                command=lambda: self.play_in_app(film["trailer"]),
                bg=C["btn_secondary"], hover_bg=C["btn_secondary_hover"],
                width=220, height=44,
            ).pack(pady=4)

    def _render_series_grid(self):
        series = self.scan_series()
        cats = sorted({s["category"] for s in series})
        values = list(dict.fromkeys(DEFAULT_SERIES_CATEGORIES + cats))
        self.category_combo.configure(values=values, state="readonly")
        if self.category_var.get() not in values:
            self.category_var.set("Toutes")

        search = self.search_var.get().strip().lower()
        selected = self.category_var.get()
        filtered = [
            s for s in series
            if (selected == "Toutes" or s["category"] == selected)
            and (not search or search in s["title"].lower() or search in s["genre"].lower())
        ]

        header = tk.Frame(self.content_area, bg=C["bg"], padx=24, pady=(12, 0))
        header.pack(fill="x")
        tk.Label(header, text="📺 Séries", font=FONT["h2"], bg=C["bg"], fg=C["text"]).pack(side="left")
        tk.Label(header, text=f"{len(filtered)} séries", font=FONT["small"],
                 bg=C["bg"], fg=C["text_muted"]).pack(side="right")

        grid = DarkScrollableGrid(self.content_area)
        grid.pack(fill="both", expand=True, padx=16, pady=8)

        if not filtered:
            tk.Label(grid.inner, text="Aucune série trouvée.", font=FONT["body"],
                     bg=C["bg"], fg=C["text_muted"]).grid(row=0, column=0, padx=20, pady=20)
            return

        cols = 5
        for i, item in enumerate(filtered):
            poster = self._create_poster_image(item["poster"])
            subtitle = f"{item['genre']} • {len(item['episodes'])} épisodes"
            card = MediaCard(
                grid.inner, title=item["title"], subtitle=subtitle,
                image=poster, command=lambda x=item: self._show_series_episodes(x),
            )
            card.grid(row=i // cols, column=i % cols, padx=6, pady=6, sticky="n")

    def _show_series_episodes(self, series_item: dict):
        win = tk.Toplevel(self.root)
        win.title(f"{series_item['title']} — Épisodes")
        win.geometry("800x540")
        win.configure(bg=C["bg_card"])
        win.transient(self.root)

        head = tk.Frame(win, bg=C["bg_card"])
        head.pack(fill="x", padx=16, pady=12)
        tk.Label(head, text=f"{series_item['title']}", font=FONT["h2"],
                 bg=C["bg_card"], fg=C["text"]).pack(side="left")
        tk.Label(head, text=f"{series_item['genre']}", font=FONT["body"],
                 bg=C["bg_card"], fg=C["text_secondary"]).pack(side="left", padx=12)

        if series_item.get("trailer"):
            ModernButton(
                head, text="🎞 Bande-annonce",
                command=lambda: self.play_in_app(series_item["trailer"]),
                bg=C["btn_secondary"], hover_bg=C["btn_secondary_hover"],
                width=160, height=34, font=FONT["btn_small"],
            ).pack(side="right")

        tree_frame = tk.Frame(win, bg=C["bg_card"])
        tree_frame.pack(fill="both", expand=True, padx=16, pady=(0, 8))

        tree = ttk.Treeview(tree_frame, columns=("season", "episode", "file"), show="headings")
        tree.heading("season", text="Saison")
        tree.heading("episode", text="Épisode")
        tree.heading("file", text="Fichier")
        tree.column("season", width=80)
        tree.column("episode", width=80)
        tree.column("file", width=580)
        tree.pack(side="left", fill="both", expand=True)

        scrollbar = ttk.Scrollbar(tree_frame, orient="vertical", command=tree.yview)
        scrollbar.pack(side="right", fill="y")
        tree.configure(yscrollcommand=scrollbar.set)

        for s, e, f in series_item["episodes"]:
            tree.insert("", "end", values=(s, e, str(f)))

        def play_selected(_e=None):
            sel = tree.selection()
            if not sel:
                return
            values = tree.item(sel[0], "values")
            self.play_in_app(Path(values[2]))

        tree.bind("<Double-1>", play_selected)

        ModernButton(
            win, text="▶  Lire l'épisode sélectionné", command=play_selected,
            bg=C["accent"], hover_bg=C["accent_dark"], width=280, height=40,
        ).pack(pady=(0, 12))

    # ------------------------------------------------------------------
    # PROFILE
    # ------------------------------------------------------------------
    def _render_profile(self):
        page = tk.Frame(self.content_area, bg=C["bg"])
        page.pack(fill="both", expand=True)

        # Banner
        banner_frame = tk.Frame(page, bg=C["bg_surface"], height=180)
        banner_frame.pack(fill="x")
        banner_frame.pack_propagate(False)

        banner_photo = self._load_banner(width=1100, height=180)
        if banner_photo:
            self.banner_photo = banner_photo
            tk.Label(banner_frame, image=banner_photo, bg=C["bg_surface"]).pack(fill="both", expand=True)
        else:
            # Default gradient banner
            gradient = GradientCanvas(banner_frame, C["accent_dark"], C["magenta_dark"])
            gradient.pack(fill="both", expand=True)
            tk.Label(gradient, text="", bg=C["accent_dark"]).pack()  # placeholder

        # Change banner button (overlay)
        tk.Button(
            banner_frame, text="📷 Changer la bannière", font=FONT["tiny"],
            bg=C["btn_secondary"], fg=C["text_muted"], bd=0, padx=8, pady=2,
            cursor="hand2", command=self._change_banner,
        ).place(relx=1.0, y=8, anchor="ne", x=-8)

        # Profile info section
        profile_info = tk.Frame(page, bg=C["bg"], padx=24)
        profile_info.pack(fill="x", pady=(0, 16))

        # Avatar (overlapping banner)
        avatar_row = tk.Frame(profile_info, bg=C["bg"])
        avatar_row.pack(fill="x")

        avatar_container = tk.Frame(avatar_row, bg=C["bg"])
        avatar_container.pack(side="left")

        avatar_size = 80
        avatar_photo = self._load_avatar(avatar_size)
        if avatar_photo:
            self.avatar_photo = avatar_photo
            avatar_lbl = tk.Label(avatar_container, image=avatar_photo, bg=C["bg"])
            avatar_lbl.pack()
        else:
            self._default_avatar_canvas(avatar_container, avatar_size).pack()

        tk.Button(
            avatar_container, text="📷", font=FONT["tiny"], bg=C["btn_secondary"],
            fg=C["text_muted"], bd=0, padx=4, cursor="hand2",
            command=self._change_avatar,
        ).pack(pady=(4, 0))

        # User details
        details = tk.Frame(avatar_row, bg=C["bg"], padx=16)
        details.pack(side="left", fill="x", expand=True, pady=8)

        tk.Label(details, text=self.current_user["username"], font=FONT["h2"],
                 bg=C["bg"], fg=C["text"]).pack(anchor="w")
        email = self.current_user.get("email", "") or "Pas d'email"
        tk.Label(details, text=email, font=FONT["body"],
                 bg=C["bg"], fg=C["text_secondary"]).pack(anchor="w")
        tk.Label(details, text=f"Stream Key: {self.current_user['stream_key'][:12]}...",
                 font=FONT["small"], bg=C["bg"], fg=C["accent_light"]).pack(anchor="w", pady=(4, 0))

        # Separator
        tk.Frame(page, bg=C["border"], height=1).pack(fill="x", padx=24)

        # Profile actions
        actions = tk.Frame(page, bg=C["bg"], padx=24, pady=16)
        actions.pack(fill="x")

        tk.Label(actions, text="Gestion du profil", font=FONT["h3"],
                 bg=C["bg"], fg=C["text"]).pack(anchor="w", pady=(0, 12))

        btn_grid = tk.Frame(actions, bg=C["bg"])
        btn_grid.pack(fill="x")

        ModernButton(
            btn_grid, text="📷  Photo de profil", command=self._change_avatar,
            bg=C["btn_secondary"], hover_bg=C["btn_secondary_hover"],
            width=200, height=40, font=FONT["btn_small"],
        ).pack(side="left", padx=(0, 8))

        ModernButton(
            btn_grid, text="🖼  Bannière", command=self._change_banner,
            bg=C["btn_secondary"], hover_bg=C["btn_secondary_hover"],
            width=200, height=40, font=FONT["btn_small"],
        ).pack(side="left", padx=(0, 8))

        ModernButton(
            btn_grid, text="🔑  Copier Stream Key", command=self._copy_stream_key,
            bg=C["btn_secondary"], hover_bg=C["btn_secondary_hover"],
            width=200, height=40, font=FONT["btn_small"],
        ).pack(side="left", padx=(0, 8))

        ModernButton(
            btn_grid, text="🔒  Changer mot de passe",
            command=lambda: self.reset_password(self.current_user["username"]),
            bg=C["btn_secondary"], hover_bg=C["btn_secondary_hover"],
            width=220, height=40, font=FONT["btn_small"],
        ).pack(side="left")

    def _change_avatar(self):
        path = filedialog.askopenfilename(
            title="Choisir une photo de profil",
            filetypes=[("Images", "*.png *.jpg *.jpeg *.gif *.bmp *.webp"), ("Tous", "*.*")],
        )
        if not path:
            return
        try:
            dest_dir = self._get_user_profile_dir()
            dest = dest_dir / "avatar.png"
            if HAS_PIL:
                img = Image.open(path).convert("RGBA")
                img = ImageOps.fit(img, (256, 256), Image.LANCZOS)
                img.save(str(dest), "PNG")
            else:
                shutil.copy2(path, str(dest))

            self.conn.execute(
                "UPDATE users SET profile_picture = ? WHERE id = ?",
                (str(dest), self.current_user["id"]),
            )
            self.conn.commit()
            self.current_user["profile_picture"] = str(dest)
            messagebox.showinfo("OK", "Photo de profil mise à jour !")
            self._navigate_to("profile")
        except Exception as e:
            messagebox.showerror("Erreur", f"Impossible de charger l'image:\n{e}")

    def _change_banner(self):
        path = filedialog.askopenfilename(
            title="Choisir une bannière",
            filetypes=[("Images", "*.png *.jpg *.jpeg *.gif *.bmp *.webp"), ("Tous", "*.*")],
        )
        if not path:
            return
        try:
            dest_dir = self._get_user_profile_dir()
            dest = dest_dir / "banner.png"
            if HAS_PIL:
                img = Image.open(path).convert("RGB")
                img = ImageOps.fit(img, (1200, 300), Image.LANCZOS)
                img.save(str(dest), "PNG")
            else:
                shutil.copy2(path, str(dest))

            self.conn.execute(
                "UPDATE users SET banner_image = ? WHERE id = ?",
                (str(dest), self.current_user["id"]),
            )
            self.conn.commit()
            self.current_user["banner_image"] = str(dest)
            messagebox.showinfo("OK", "Bannière mise à jour !")
            self._navigate_to("profile")
        except Exception as e:
            messagebox.showerror("Erreur", f"Impossible de charger l'image:\n{e}")

    # ------------------------------------------------------------------
    # SETTINGS
    # ------------------------------------------------------------------
    def _render_settings(self):
        page = tk.Frame(self.content_area, bg=C["bg"], padx=24, pady=16)
        page.pack(fill="both", expand=True)

        tk.Label(page, text="⚙ Paramètres", font=FONT["h2"],
                 bg=C["bg"], fg=C["text"]).pack(anchor="w", pady=(0, 20))

        # App icon section
        section1 = tk.Frame(page, bg=C["bg_card"], padx=20, pady=16)
        section1.pack(fill="x", pady=(0, 12))

        tk.Label(section1, text="Icône de l'application", font=FONT["h3"],
                 bg=C["bg_card"], fg=C["text"]).pack(anchor="w", pady=(0, 4))
        tk.Label(section1, text="Choisis une image personnalisée pour l'icône de Streamora sur ton PC",
                 font=FONT["small"], bg=C["bg_card"], fg=C["text_secondary"]).pack(anchor="w", pady=(0, 12))

        ModernButton(
            section1, text="🖼  Choisir une icône", command=self._change_app_icon,
            bg=C["accent"], hover_bg=C["accent_dark"], width=200, height=38,
            font=FONT["btn_small"],
        ).pack(anchor="w")

        # Branding section
        section2 = tk.Frame(page, bg=C["bg_card"], padx=20, pady=16)
        section2.pack(fill="x", pady=(0, 12))

        tk.Label(section2, text="Personnalisation", font=FONT["h3"],
                 bg=C["bg_card"], fg=C["text"]).pack(anchor="w", pady=(0, 4))
        tk.Label(section2, text="Personnalise le nom et le sous-titre de l'app",
                 font=FONT["small"], bg=C["bg_card"], fg=C["text_secondary"]).pack(anchor="w", pady=(0, 12))

        branding_row = tk.Frame(section2, bg=C["bg_card"])
        branding_row.pack(fill="x")

        ModernButton(
            branding_row, text="✏  Modifier le branding", command=self._edit_branding,
            bg=C["btn_secondary"], hover_bg=C["btn_secondary_hover"], width=200, height=38,
            font=FONT["btn_small"],
        ).pack(side="left")

        # About section
        section3 = tk.Frame(page, bg=C["bg_card"], padx=20, pady=16)
        section3.pack(fill="x", pady=(0, 12))

        tk.Label(section3, text="À propos", font=FONT["h3"],
                 bg=C["bg_card"], fg=C["text"]).pack(anchor="w", pady=(0, 4))
        tk.Label(section3, text=f"{APP_NAME} — Premium IPTV Desktop",
                 font=FONT["body"], bg=C["bg_card"], fg=C["text_secondary"]).pack(anchor="w")
        tk.Label(section3, text="Version 2.0 • Dark Theme Edition",
                 font=FONT["small"], bg=C["bg_card"], fg=C["text_muted"]).pack(anchor="w")

    def _change_app_icon(self):
        path = filedialog.askopenfilename(
            title="Choisir une icône",
            filetypes=[("Images", "*.png *.gif"), ("Tous", "*.*")],
        )
        if not path:
            return
        try:
            dest_dir = self._get_user_profile_dir()
            dest = dest_dir / "app_icon.png"
            if HAS_PIL:
                img = Image.open(path).convert("RGBA")
                img = img.resize((64, 64), Image.LANCZOS)
                img.save(str(dest), "PNG")
            else:
                shutil.copy2(path, str(dest))

            self._set_window_icon(str(dest))
            self.conn.execute(
                "UPDATE users SET custom_icon = ? WHERE id = ?",
                (str(dest), self.current_user["id"]),
            )
            self.conn.commit()
            self.current_user["custom_icon"] = str(dest)
            messagebox.showinfo("OK", "Icône de l'app mise à jour !")
        except Exception as e:
            messagebox.showerror("Erreur", f"Impossible de changer l'icône:\n{e}")

    def _edit_branding(self):
        win = tk.Toplevel(self.root)
        win.title("Personnalisation")
        win.geometry("450x250")
        win.configure(bg=C["bg_card"])
        win.transient(self.root)
        win.grab_set()

        current_name = APP_NAME
        current_sub = "Premium IPTV Desktop"
        if BRANDING_CONFIG.exists():
            try:
                data = json.loads(BRANDING_CONFIG.read_text(encoding="utf-8"))
                current_name = data.get("app_name", current_name)
                current_sub = data.get("subtitle", current_sub)
            except Exception:
                pass

        tk.Label(win, text="Nom de l'application", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"]).pack(anchor="w", padx=20, pady=(16, 4))
        name_var = tk.StringVar(value=current_name)
        tk.Entry(win, textvariable=name_var, font=FONT["body"], bg=C["bg_input"],
                 fg=C["text"], insertbackground=C["accent_light"], relief="flat", bd=6).pack(fill="x", padx=20)

        tk.Label(win, text="Sous-titre", font=FONT["small_bold"],
                 bg=C["bg_card"], fg=C["text_secondary"]).pack(anchor="w", padx=20, pady=(12, 4))
        sub_var = tk.StringVar(value=current_sub)
        tk.Entry(win, textvariable=sub_var, font=FONT["body"], bg=C["bg_input"],
                 fg=C["text"], insertbackground=C["accent_light"], relief="flat", bd=6).pack(fill="x", padx=20)

        def save():
            BRANDING_CONFIG.parent.mkdir(parents=True, exist_ok=True)
            BRANDING_CONFIG.write_text(json.dumps({
                "app_name": name_var.get(),
                "subtitle": sub_var.get(),
            }, ensure_ascii=False, indent=2), encoding="utf-8")
            messagebox.showinfo("OK", "Branding mis à jour ! Relance l'app pour voir les changements.")
            win.destroy()

        ModernButton(
            win, text="💾  Sauvegarder", command=save,
            bg=C["accent"], hover_bg=C["accent_dark"], width=180, height=38,
        ).pack(pady=16)

    # ------------------------------------------------------------------
    # VLC Player
    # ------------------------------------------------------------------
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

        # Video surface
        self.fs_video_surface = tk.Frame(self.fullscreen_win, bg="black")
        self.fs_video_surface.pack(fill="both", expand=True)

        # Close button (X) top-left — styled
        self.fs_close_btn = tk.Button(
            self.fullscreen_win, text="✕", font=(FONT_FAMILY, 18, "bold"),
            fg="white", bg="#333333", activebackground=C["magenta"],
            activeforeground="white", bd=0, padx=10, pady=2,
            command=self._close_fullscreen, cursor="hand2",
        )
        self.fs_close_btn.place(x=12, y=12)

        # Bottom controls overlay — dark glass effect
        self.fs_controls = tk.Frame(self.fullscreen_win, bg=C["player_bg"])
        self.fs_controls.place(relx=0, rely=1.0, relwidth=1.0, anchor="sw", height=56)

        ctrl_style = dict(
            font=FONT["player_icon"], fg="white", bg=C["player_bg"],
            bd=0, padx=8, cursor="hand2", activebackground=C["bg_hover"],
        )

        self.fs_btn_play_pause = tk.Button(
            self.fs_controls, text="⏸", command=self.toggle_play_pause, **ctrl_style,
        )
        self.fs_btn_play_pause.pack(side="left", padx=6, pady=8)

        self.fs_btn_stop = tk.Button(
            self.fs_controls, text="⏹", command=self._close_fullscreen, **ctrl_style,
        )
        self.fs_btn_stop.pack(side="left", padx=4, pady=8)

        self.fs_btn_mute = tk.Button(
            self.fs_controls, text="🔊", command=self.toggle_mute, **ctrl_style,
        )
        self.fs_btn_mute.pack(side="left", padx=4, pady=8)

        self.fs_volume = ttk.Scale(
            self.fs_controls, from_=0, to=100, orient="horizontal",
            variable=self.volume_var, command=self._on_volume_change, length=90,
        )
        self.fs_volume.pack(side="left", padx=(4, 8), pady=8)

        self.fs_elapsed = tk.Label(
            self.fs_controls, text="00:00", fg=C["text_muted"],
            bg=C["player_bg"], font=FONT["tiny"],
        )
        self.fs_elapsed.pack(side="left", padx=2)

        self.fs_seek = ttk.Scale(
            self.fs_controls, from_=0, to=SEEK_SCALE_MAX, orient="horizontal",
            variable=self.seek_var, length=500,
        )
        self.fs_seek.pack(side="left", fill="x", expand=True, padx=4, pady=8)
        self.fs_seek.bind("<ButtonRelease-1>", self._on_seek)

        self.fs_duration = tk.Label(
            self.fs_controls, text="00:00", fg=C["text_muted"],
            bg=C["player_bg"], font=FONT["tiny"],
        )
        self.fs_duration.pack(side="left", padx=2)

        # Escape / close
        self.fullscreen_win.bind("<Escape>", lambda _e: self._close_fullscreen())
        self.fullscreen_win.protocol("WM_DELETE_WINDOW", self._close_fullscreen)

        self.fullscreen_win.update_idletasks()

        # VLC player setup
        if self.vlc_player is None:
            self.vlc_player = self.vlc_instance.media_player_new()
        self._bind_vlc_to_surface(self.fs_video_surface)

        media = self.vlc_instance.media_new(str(path))
        self.vlc_player.set_media(media)
        self.vlc_player.audio_set_volume(self.volume_var.get())
        self.vlc_player.play()

        self.player_status.config(text=f"▶ {path.name}")
        self.btn_play_pause.config(text="⏸")
        self._start_seek_update()

    def _close_fullscreen(self):
        if self.fullscreen_win is None:
            return
        self.stop_playback()
        self.fullscreen_win.destroy()
        self.fullscreen_win = None
        self.fs_video_surface = None

    # ------------------------------------------------------------------
    # Playback controls
    # ------------------------------------------------------------------
    def toggle_play_pause(self):
        if self.vlc_player is None:
            return
        state = self.vlc_player.get_state()
        playing_state = self.vlc.State.Playing  # type: ignore[attr-defined]
        if state == playing_state:
            self.vlc_player.pause()
            self.btn_play_pause.config(text="▶")
            self.player_status.config(text="⏸ En pause")
            if self.fullscreen_win is not None:
                self.fs_btn_play_pause.config(text="▶")
        else:
            self.vlc_player.play()
            self.btn_play_pause.config(text="⏸")
            self.player_status.config(text="▶ Lecture reprise")
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
        self.player_status.config(text="Aucune lecture")
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
                self.seek_var.set(SEEK_SCALE_MAX)
                self.player_status.config(text="Lecture terminée")
                if self.fullscreen_win is not None:
                    self._close_fullscreen()
                self._stop_seek_update()
                return

            pos = self.vlc_player.get_position()
            length = self.vlc_player.get_length()
            current_time = self.vlc_player.get_time()
            if pos >= 0:
                self.seek_var.set(pos * SEEK_SCALE_MAX)
            self.elapsed_label.config(text=self._format_ms(current_time))
            self.duration_label.config(text=self._format_ms(length))
            if self.fullscreen_win is not None:
                self.fs_elapsed.config(text=self._format_ms(current_time))
                self.fs_duration.config(text=self._format_ms(length))

        self.seek_update_id = self.root.after(500, self._poll_seek)

    def _copy_stream_key(self):
        if not self.current_user:
            return
        self.root.clipboard_clear()
        self.root.clipboard_append(self.current_user["stream_key"])
        messagebox.showinfo("Copié", "Stream Key copiée !")

    def logout(self):
        self.current_user = None
        self.active_view = "home"
        self.search_var.set("")
        self.category_var.set("Toutes")
        self.poster_cache.clear()
        if HAS_PIL:
            self.pil_cache.clear()
        self.avatar_photo = None
        self.banner_photo = None
        self._set_window_icon()  # Reset to default icon
        self.show_auth_screen()


# ---------------------------------------------------------------------------
# Entry Point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    root = tk.Tk()
    app = StreamoraApp(root)
    root.mainloop()
