# Testing Streamora Desktop App

Streamora is a Tkinter-based IPTV desktop application with VLC integration for video playback.

## Environment Setup

### Required Packages
```bash
sudo apt-get install -y libvlc-dev vlc wmctrl
pip install python-vlc
```

### Display
Requires X display (`:0`). Set `DISPLAY=:0` when launching the app.

### Test Video
Create a test video if none exists:
```bash
mkdir -p streamora_library/films/Action/TestMovie
ffmpeg -f lavfi -i testsrc=duration=60:size=640x480:rate=30 \
  -f lavfi -i sine=frequency=440:duration=60 \
  -c:v libx264 -c:a aac -shortest \
  streamora_library/films/Action/TestMovie/movie.mp4
```

## Login Bypass (Test Harness)

xdotool **cannot** type into Tkinter Entry widgets — this is a known limitation. Use a programmatic test harness instead:

```python
import tkinter as tk
from streamora import StreamoraApp, hash_password

root = tk.Tk()
app = StreamoraApp(root)

# Create test user after app init (DB tables created in __init__)
username = "testuser"
salt = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4"
pw_hash = hash_password("testpass123", salt)
stream_key = "TEST-STREAM-KEY-12345"

row = app.conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
if not row:
    app.conn.execute(
        "INSERT INTO users(username, stream_key, salt, password_hash) VALUES (?, ?, ?, ?)",
        (username, stream_key, salt, pw_hash),
    )
    app.conn.commit()
    row = app.conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

app.current_user = dict(row)
app.show_dashboard()
root.mainloop()
```

**Important**: Create the test user AFTER `StreamoraApp(root)` — the constructor runs `_init_db()` which creates the `users` table.

## GUI Interaction Strategies

### What Works
- **xdotool**: Can click Tkinter Buttons (not Entry widgets). Use for navigating between views.
- **Programmatic method calls**: Most reliable. Call `app._navigate_to("films")`, `app.play_in_app(path)`, `app._close_fullscreen()` directly.
- **event_generate**: Can simulate key events like `app.fullscreen_win.event_generate("<Escape>")`.

### What Doesn't Work
- xdotool `type` command into Tkinter Entry/Text widgets
- Automated screenshot via `import -window root` may capture the desktop wallpaper if the Tkinter window is behind another window

### Taking Screenshots
```bash
DISPLAY=:0 import -window root /path/to/screenshot.png
```
Or from Python:
```python
import subprocess
subprocess.run(["import", "-window", "root", "/path/to/screenshot.png"],
               env={**os.environ, "DISPLAY": ":0"})
```

## Window Management
```bash
# List windows
DISPLAY=:0 wmctrl -l

# Maximize Streamora
DISPLAY=:0 wmctrl -r "Streamora" -b add,maximized_vert,maximized_horz

# Bring to front
DISPLAY=:0 xdotool search --name "Streamora" windowactivate --sync
```

## Known Limitations
- **No audio device**: Test VM has no ALSA/PulseAudio. VLC will log audio errors but video playback works fine. Mute/volume changes are programmatically verifiable but audio output cannot be heard.
- **Login flow**: Requires username + password + stream key dialog. Always use the test harness to bypass.
- **Fullscreen testing**: Use `root.attributes("-zoomed", True)` to maximize before testing fullscreen. The fullscreen Toplevel covers the entire screen.

## Key App Navigation Paths
- Dashboard → Films: `app._navigate_to("films")`
- Dashboard → Series: `app._navigate_to("series")`
- Play film: `app.play_in_app(Path("streamora_library/films/Action/TestMovie/movie.mp4"))`
- Close fullscreen: `app._close_fullscreen()` or Escape key
- Film dialog: `app.show_film_actions(film_dict)` where film_dict comes from `app.scan_films()`

## Devin Secrets Needed
No secrets required — this is a local desktop app with SQLite auth.
