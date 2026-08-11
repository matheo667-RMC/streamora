# Testing Streamora — Tkinter IPTV Desktop App

## Overview
Streamora is a Tkinter-based IPTV desktop application with VLC integration, SQLite auth, and a custom widget system. Testing requires a programmatic approach because standard GUI automation tools (xdotool) cannot interact with Tkinter Entry widgets.

## Environment Requirements

### System Dependencies
```bash
sudo apt-get install -y libvlc-dev vlc
pip install python-vlc Pillow
```

### Python Version
- **Must use system Python 3.10** (`/usr/bin/python3`) — pyenv-installed Python typically lacks the `_tkinter` C extension module
- Verify: `/usr/bin/python3 -c "import tkinter; print('OK')"`

### Display
- Requires `DISPLAY=:0` to be set
- The X server must be running (it is by default on Devin VMs)

## Devin Secrets Needed
- None — Streamora uses local SQLite database, no external services

## Testing Approach

### Why Programmatic Testing?
- **xdotool cannot type into Tkinter Entry widgets** — Tkinter processes keyboard events differently from GTK/Qt apps
- Instead, import the app module and call methods directly on the `StreamoraApp` instance
- Use `app.root.update()` / `app.root.update_idletasks()` after each action to process the event loop

### Launching the App for Testing
```python
import sys, os
os.environ['DISPLAY'] = ':0'
sys.path.insert(0, '/home/ubuntu/repos/streamora')

from streamora import StreamoraApp
import tkinter as tk

root = tk.Tk()
app = StreamoraApp(root)
root.update()
```

### Taking Screenshots
```python
import subprocess
root.update_idletasks()
subprocess.run(['import', '-window', 'root', 'screenshot.png'])  # ImageMagick
# Or capture entire screen:
subprocess.run(['import', '-window', 'root', '-pause', '1', 'screenshot.png'])
```

### Handling ModernEntry Widgets (Custom Placeholder System)
ModernEntry has a placeholder text system where `.get()` returns empty string if `_has_placeholder` is True. When filling forms programmatically, you must clear the placeholder state first:

```python
def fill_modern_entry(modern_entry, value):
    """Properly fill a ModernEntry by clearing placeholder state first."""
    modern_entry._has_placeholder = False
    modern_entry.entry.configure(show=modern_entry._show, fg=C["text"])
    modern_entry.entry.delete(0, "end")
    modern_entry.entry.insert(0, value)
```

Without this, the entry's `.get()` will return `""` even after inserting text.

### Navigation
```python
# Switch between dashboard views
app._navigate_to('home')     # Home page
app._navigate_to('films')    # Films grid
app._navigate_to('series')   # Series grid  
app._navigate_to('profile')  # Profile page
app._navigate_to('settings') # Settings page
root.update()
```

### Auth Screen Tab Switching
```python
app._switch_auth_tab('register')  # Show register form
app._switch_auth_tab('login')     # Show login form
root.update()
```

## Common Pitfalls

1. **ModernButton `_w` collision** — If creating custom Canvas subclasses, never use `self._w` or `self._h` as attribute names. Tkinter's Canvas internally uses `_w` to store the Tcl widget path. Overwriting it causes `_tkinter.TclError: invalid command name "<number>"` when calling `self.delete("all")`. Use `self._btn_w` or similar instead.

2. **`pady`/`padx` tuples in Frame constructors** — Python 3.10's `tk.Frame()` constructor does NOT accept tuple values for `pady`/`padx` (e.g., `pady=(12, 0)`). Tuples only work in layout methods (`.pack()`, `.grid()`, `.place()`). The error will be `bad screen distance "12 0"`.

3. **SQLite database** — The app creates `iptv_app.db` in the working directory. For clean testing, delete it first: `os.remove('iptv_app.db')` (if it exists).

4. **Logo assets** — Run `python3 generate_logo.py` if logo PNGs are missing from `streamora_library/branding/`.

5. **Sourcery CI** — The repo may have Sourcery configured. Its "failed" status is a code review bot posting suggestions, NOT a real CI failure.

## Test Script Location
- Programmatic test: `test_programmatic.py` — runs all screens end-to-end with 28 assertions
- Run: `DISPLAY=:0 /usr/bin/python3 test_programmatic.py`
- Screenshots output to: `test_screenshots/`

## Key Color Constants
```python
C = {
    "bg": "#0a0a14",        # Main dark background
    "accent": "#7c3aed",    # Purple accent
    "magenta": "#e91e63",   # Magenta/pink
    "text": "#f0f0f8",      # Light text
    "bg_sidebar": "#0e0e1a" # Sidebar background
}
```
