# Stroke Increment

Nudge the stroke weight of the current selection up or down from the keyboard in
Adobe Illustrator, the way `[` and `]` resize a brush in Photoshop.

Illustrator has no such shortcut. The nearest native option is to click into the
stroke weight field and press the arrow keys, which costs you the selection tool
and a trip to the panel.

```
selection at 1pt  →  press up  →  1.5pt  →  2pt  →  3pt  →  4pt
selection at 1pt  →  press down →  0.75pt →  0.5pt →  0.25pt
```

Steps follow a **snap ladder** of designer-friendly weights rather than a blind
fixed increment, so you never end up on 3.75pt. The ladder, the units and the
step mode are all editable from a settings dialog.

Built as ExtendScript, the layer Illustrator loads from its Scripts folder, so
installing is a file copy and there is nothing to compile.

## Install

```bash
./scripts/install.sh
```

Restart Illustrator. Then bind the keys — Illustrator makes that harder than it
should be, so it has its own document: **[docs/SHORTCUTS.md](docs/SHORTCUTS.md)**.

The short version:

```bash
brew install --cask hammerspoon
./scripts/install-hammerspoon.sh
```

Grant Hammerspoon Accessibility, restart it, and you have `⌃]` / `⌃[` to step
and `⌃⇧]` / `⌃⇧[` to jump. No Hammerspoon? The Actions panel works with no
dependencies, on function keys only.

## What you get

| Script | Does |
| --- | --- |
| `Stroke Weight Up` | Up one rung |
| `Stroke Weight Down` | Down one rung |
| `Stroke Weight Up Large` | Up three rungs |
| `Stroke Weight Down Large` | Down three rungs |
| `Stroke Increment Settings` | Edit the ladder, units, mode and limits |

## Behaviour

- **Every selected object steps from its own weight.** A 1pt and a 2pt line
  selected together become 1.5pt and 3pt, not a shared value.
- **Recurses** into groups, nested groups and compound paths.
- **Type** is stepped through its character attributes.
- **Objects with no stroke are left alone** by default, so pressing the key over
  a photo or a fill-only shape does nothing rather than outlining it.
- **Silent.** No dialogs, no beeps, nothing to dismiss when you press it with
  nothing selected. It runs on a hotkey; it has to stay out of the way.
- Objects with no scriptable stroke — placed images, meshes, symbols, blends —
  are skipped rather than guessed at.

## Settings

`Stroke Increment Settings` writes to
`~/Library/Application Support/StrokeIncrement/settings.jsxon`, which every
command reads at run time. No rebuild, no restart.

Three step modes:

| Mode | 1pt up becomes | Good for |
| --- | --- | --- |
| `ladder` (default) | 1.5 | Normal work — snaps to clean weights |
| `fixed` | 1.25 | Fine, predictable trimming |
| `multiply` | 1.25 | Proportional moves over a wide range |

Past the top of the ladder it keeps climbing by the final gap (50 → 60 → 70).
Below the bottom rung it halves, so hairlines stay reachable. Both ends clamp to
the configured min and max.

## Layout

```
src/lib/StrokeIncrement.jsxinc   engine — step maths and selection traversal
src/commands/*.jsx               thin entry points, one per menu command
scripts/build.sh                 inlines the engine into standalone dist/ files
scripts/install.sh               copies dist/ into Illustrator's Scripts folder
scripts/install-hammerspoon.sh   installs the optional Hammerspoon hotkeys
integrations/hammerspoon/        Illustrator-scoped hotkey module
tests/es3-lint.js                catches ES3 violations Node would happily run
tests/engine.test.js             runs the engine under Node against a fake DOM
tests/run.sh                     both of the above
dist/                            built, self-contained scripts (committed)
```

`dist/` is committed so the repo can be cloned and installed without a build
step.

## Tests

```bash
./tests/run.sh
```

Two passes, both without Illustrator:

**`es3-lint.js`** — ExtendScript is ES3 and Node is not, so Node will run code
Illustrator refuses to parse. This catches reserved words used as unquoted
object keys (`in:`, `class:`), trailing commas, `const`/`let`, arrows, template
literals and ES5 builtins like `JSON` and `forEach`. Each is a parse-time
failure in Illustrator, which fires before any assertion could reach it.

**`engine.test.js`** — the engine only touches Illustrator globals from inside
functions, so it evaluates under Node with `app`, `File` and `Folder` stubbed.
Covers the step maths, ladder edges, clamping, selection traversal, type, unit
conversion and the guards.

## Licence

MIT.
