# Testing Streamora IPTV Desktop App

Streamora is a Tkinter-based desktop IPTV application with SQLite backend, VLC media playback, and PIL/Pillow for branding assets.

## Environment Setup

```bash
# System dependencies
sudo apt-get install -y vlc libvlc-dev python3-tk ffmpeg

# Python packages
pip install python-vlc Pillow

# Generate branding assets (required before first launch)
python generate_logo.py

# Create a test video for playback testing
ffmpeg -f lavfi -i testsrc=duration=2:size=320x240:rate=1 -y /tmp/test_film.mp4
```

## Running the App

```bash
DISPLAY=:0 python3 streamora.py
```

The app requires a display server (X11). Use `DISPLAY=:0` when running headless.

## Testing Approach

### Tkinter Widget Automation

Tkinter `Entry` widgets (especially the custom `ModernEntry`) are difficult to automate via xdotool/keyboard. Use **programmatic form filling** instead:

```python
from streamora import ModernEntry

def fill(modern_entry, value):
    """Programmatically fill a ModernEntry widget."""
    modern_entry._has_placeholder = False
    modern_entry.entry.configure(show=modern_entry._show, fg='white')
    modern_entry.entry.delete(0, 'end')
    modern_entry.entry.insert(0, value)
```

**Important:** You MUST set `_has_placeholder = False` before inserting text, otherwise `.get()` returns the placeholder text instead of the actual value.

### Key Entry Points for Testing

- **Auth fields:** `app._login_user`, `app._login_pass`, `app._reg_user`, `app._reg_email`, `app._reg_pass`, `app._reg_pass2`
- **Auth actions:** `app._do_register()`, `app._do_login()`, `app._switch_auth_tab('login'|'register')`
- **Navigation:** `app._navigate_to('home'|'films'|'series'|'profile'|'settings'|'admin')`
- **Logout:** `app.logout()`
- **Admin methods:** `app._admin_add_film()`, `app._admin_add_series()`, `app._admin_add_episodes()`, `app._admin_add_film_folder()`

### Mock Patterns

Some methods trigger OS dialogs that can't be automated:

```python
import unittest.mock

# Suppress success messageboxes
with unittest.mock.patch('tkinter.messagebox.showinfo'):
    app._do_register()

# Mock stream key prompt during login
with unittest.mock.patch.object(app, '_prompt_stream_key', return_value=user_row['stream_key']):
    app._do_login()

# Admin file/folder dialogs use filedialog/simpledialog — test the underlying
# file operations programmatically instead of trying to automate native OS dialogs
```

### Screenshots

Capture screenshots with `import` (ImageMagick):

```bash
import -window root screenshot.png
```

Or from Python:
```python
import subprocess
subprocess.run(['import', '-window', 'root', 'screenshot.png'], timeout=5)
```

## Database

- SQLite file: `iptv_app.db` (created on first run)
- Session file: `.streamora_session.json` (created on login, deleted on logout)
- First registered user automatically becomes admin (`is_admin = 1`)
- Session uses cryptographic token (SHA-256 hashed in DB), not plain user_id

### Fresh Test Database

```bash
rm -f iptv_app.db .streamora_session.json
```

## Common Gotchas

1. **ModernButton `_w` conflict**: The custom `ModernButton` class previously overwrote tkinter's internal `_w` attribute. If you see `TclError` on launch, check that the button uses `_btn_w` / `_btn_h` instead.

2. **pady tuple incompatibility**: `tk.Frame(..., pady=(12, 0))` might fail on some Python/Tk versions. Move tuple padding to `.pack(pady=(12, 0))` instead.

3. **Admin dialogs**: `simpledialog.askstring()` returns `None` on cancel and `''` on empty OK. All admin methods must check `if value is None: return` to abort on cancel.

4. **No audio in headless**: VLC's `audio_get_volume()` returns 0 in environments without PulseAudio. Mute/unmute testing might be inconclusive.

5. **Library structure**: Films go in `streamora_library/films/<category>/<title>/file.mp4`. Series go in `streamora_library/series/<category>/<name>/Season X/episode.mp4`.

## Devin Secrets Needed

No secrets required — this is a fully local desktop application with SQLite backend.
