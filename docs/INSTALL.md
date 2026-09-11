# Install and bind to a key

## 1. Install the scripts

```bash
./scripts/install.sh
```

This builds `dist/` and copies the five `.jsx` files into the Scripts folder of
every Illustrator install it finds — on this machine:

```
/Applications/Adobe Illustrator 2026/Presets.localized/en_US/Scripts
/Applications/Adobe Illustrator (Beta)/Presets.localized/en_US/Scripts
```

That path is inside the application bundle and is root-owned, so the installer
asks for your admin password once.

**Restart Illustrator.** It only scans the Scripts folder at launch.

They then appear under **File → Scripts**.

> Illustrator has no per-user scripts folder — unlike Photoshop and InDesign,
> everything must go inside the app bundle. Reinstalling or updating Illustrator
> wipes them, so re-run `install.sh` after a version update.

## 2. Bind them to keys

Illustrator does not list scripts in its own Keyboard Shortcuts dialog, so the
binding comes from outside. It has its own document:

**→ [SHORTCUTS.md](SHORTCUTS.md)**

The short version: Hammerspoon gives you `⌃]` / `⌃[` and any other combination.
The Actions panel is the no-dependency alternative, on function keys only.

## 3. Tune the steps

**File → Scripts → Stroke Increment Settings.** Changes take effect on the next
keypress; no restart, no rebuild.

## Uninstall

Delete the five `.jsx` files from the Scripts folder and restart Illustrator.
Settings live at `~/Library/Application Support/StrokeIncrement/`.
