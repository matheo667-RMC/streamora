# Testing Streamora IPTV Desktop App

## Overview
Streamora is a Tkinter-based IPTV desktop application. Testing requires system Python (`/usr/bin/python3`) because pyenv Python 3.12 lacks the tkinter module.

## Quick Start
```bash
# Clean start
rm -f iptv_app.db .streamora_session.json

# Generate logo assets
/usr/bin/python3 generate_logo.py

# Launch app
DISPLAY=:0 /usr/bin/python3 streamora.py
```

## Test User Setup (Programmatic)
Creating users programmatically is faster than GUI registration:
```python
import sqlite3, hashlib, secrets, json

conn = sqlite3.connect('iptv_app.db')
salt = secrets.token_hex(16)
pw_hash = hashlib.sha256((salt + 'password').encode()).hexdigest()
sk = secrets.token_hex(16)
conn.execute(
    'INSERT INTO users (username, email, salt, password_hash, stream_key, is_admin) VALUES (?, ?, ?, ?, ?, 1)',
    ('admin', 'admin@test.com', salt, pw_hash, sk)
)
conn.commit()

# Auto-login session token
token = secrets.token_hex(32)
token_hash = hashlib.sha256(token.encode()).hexdigest()
conn.execute('UPDATE users SET session_token = ? WHERE username = ?', (token_hash, 'admin'))
conn.commit()
conn.close()

with open('.streamora_session.json', 'w') as f:
    json.dump({'session_token': token}, f)
```

## Programmatic Testing Pattern
Direct app manipulation is more reliable than GUI automation (xdotool/event_generate) for Tkinter:
```python
import tkinter as tk
from streamora import StreamoraApp

root = tk.Tk()
root.withdraw()
app = StreamoraApp(root)

# Set current user directly
app.current_user = {'id':1, 'username':'admin', ...}
app.active_view = 'home'
app.show_dashboard()
root.update_idletasks()

# Navigate using internal methods
app._navigate_to('films')
root.update_idletasks()
```

## Key Testing Patterns

### Widget Visibility Detection
- **Use `winfo_manager()`** — returns `"pack"`, `"grid"`, or `""` (empty = hidden)
- **Do NOT use `winfo_ismapped()`** — returns 0 for ALL widgets in withdrawn windows (`root.withdraw()`)
- Example: `assert app.player_bar.winfo_manager() == ""  # hidden`

### Navigation Testing
- **Use `app._navigate_to('view_name')`** directly — reliable
- **Do NOT use `event_generate('<ButtonRelease-1>')`** — unreliable in withdrawn windows
- Valid views: `'home'`, `'films'`, `'series'`, `'profile'`, `'settings'`, `'admin'`

### Player Bar Testing
- The player bar is hidden by default (`_playback_active = False`)
- It shows when `_playback_active = True` and `player_bar.pack()` is called (in `_open_fullscreen_player`)
- It hides when `stop_playback()` sets `_playback_active = False` and calls `player_bar.pack_forget()`
- `show_dashboard()` rebuilds the UI — only packs player_bar if `_playback_active` is True
- To test the playback lifecycle programmatically:
  ```python
  # Simulate playback start
  app._playback_active = True
  app.player_bar.pack(fill='x', side='bottom')
  assert app.player_bar.winfo_manager() == 'pack'
  
  # Simulate playback stop
  app._playback_active = False
  app.player_bar.pack_forget()
  assert app.player_bar.winfo_manager() == ''
  ```

### Visual Testing (Screenshots)
```bash
# Capture screenshot
DISPLAY=:0 import -window root screenshot.png

# Maximize window first
DISPLAY=:0 wmctrl -r "Streamora" -b add,maximized_vert,maximized_horz
```

### Test Video Creation
```bash
# Create a short test video for playback testing
mkdir -p streamora_library/films
ffmpeg -y -f lavfi -i testsrc=duration=5:size=320x240:rate=15 \
  -f lavfi -i sine=frequency=440:duration=5 \
  -c:v libx264 -c:a aac -shortest \
  "streamora_library/films/Test_Movie.mp4"
```

## Known Limitations
- xdotool cannot reliably click buttons inside Tkinter Toplevel dialog windows
- VLC fullscreen playback testing should be done programmatically rather than through GUI automation
- The environment has no PulseAudio, so VLC `audio_get_volume()` may return 0 — unmute verification might be inconclusive
- Sort bar ("Trier par ajouté") and category sidebar search are cosmetic-only (not functional yet)

## Database Schema
- Users table has columns: `username`, `email`, `salt`, `password_hash`, `stream_key`, `is_admin`, `session_token`, `profile_picture`, `banner_image`, `custom_icon`
- First registered user becomes admin automatically (`is_admin=1`)
- Session uses cryptographic token with SHA-256 hash stored in DB

## Devin Secrets Needed
No external secrets are required. The app uses a local SQLite database (`iptv_app.db`) and local file storage.
