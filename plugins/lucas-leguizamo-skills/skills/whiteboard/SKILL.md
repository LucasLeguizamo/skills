---
name: whiteboard
description: Draws flows, diagrams, wireframes and architecture maps in FigJam/Excalidraw style from Python (self-contained SVG + editable .excalidraw file + HTML viewer with pan/zoom) and publishes them to a private site behind nginx with Let's Encrypt TLS, a non-default port and a secret-token URL. Use when the user asks for a diagram, a flow, a wireframe, an architecture map, says "draw it", "make me a board", "publish it on a page", or dibújalo / hazme un diagrama / hazme un tablero / dibuja el flujo / mapa de arquitectura / publícalo en una página.
---

# Whiteboard

Generates boards in **Excalidraw format** (MIT, open JSON) from Python and serves them
as a static site behind nginx with TLS.

Every board produces three files:

| file | what it is for |
|---|---|
| `<slug>.svg` | what you see on the web. Self-contained: the font is embedded as a data URI, nothing is fetched from third parties |
| `<slug>.excalidraw` | drag it into excalidraw.com (or the bundled editor) to keep editing by hand |
| `<slug>.html` | viewer with pan/zoom, fullscreen, light/dark theme and downloads |

In the viewer: **F** toggles fullscreen (Fullscreen API on the canvas), **0** fits the
board, **+ −** zoom, **Esc** exits. In fullscreen the controls fade out after ~2 s and
come back when the cursor moves.

No JS build, no npm, no React on the critical path. Just Python 3 + nginx.

## Files in this skill

```
kit.py        drawing DSL + hand-drawn SVG renderer (roughjs emulated) + Excalidraw export
build.py      reads projects/*/boards.py → generates site/<token>/
publish.sh    copies to /var/www, writes the nginx vhost, issues/renews the cert
assets/       kalam-400.woff2 (the handwriting typeface)
```

The **content** lives in the working repo, not in the skill.

---

## 1. Projects — READ THIS BEFORE DRAWING

Content is organized into **projects**. One project = one work topic (usually whatever
the current session is attacking). **Never drop new boards into another session's
project**; create your own.

```
<repo>/whiteboard/
  projects/
    backend/boards.py          ← PROJECT + BOARDS
    campaigns/boards.py        ← PROJECT + BOARDS
              flows.py         ← optional sibling modules
              wireframes.py
  site/
    .token                     ← the secret path (do not rotate without saying so)
    index.json                 ← INTERNAL index: who owns what and when it was built
    <token>/index.html         ← landing page with one card per project
    <token>/<project>/…
```

**Before you start**, check which projects already exist so you do not step on anyone:

```bash
cd <repo>/whiteboard
ls projects/
python3 -c "import json;[print(f\"{p['slug']:14} {len(p['boards']):2} boards  {p['owner']}\") for p in json.load(open('site/index.json'))['projects']]"
```

If your topic fits an existing project **and that project is yours**, add to it.
Otherwise create `projects/<your-slug>/boards.py`:

```python
from kit import Scene

PROJECT = {
    "name": "Campaigns",
    "description": "One line: what this project is about.",
    "owner": "session: campaigns spec",   # ← who works here. Be specific.
}

def board_example():
    sc = Scene("campaigns-engine", "Board title",
               "One-line subtitle.", group="flow")   # group: "flow" | "wireframe"
    a = sc.node(100, 100, 320, 76, "Step one", color="blue")
    b = sc.node(100, 240, 320, 76, "Decision?", kind="diamond", color="yellow")
    c = sc.node(100, 400, 320, 76, "End", kind="ellipse", color="green")
    sc.connect(a, b)
    sc.connect(b, c, label="yes", label_side="right")
    return sc

BOARDS = [board_example]        # ← build.py reads this list
```

Rules that avoid collisions:

- **Prefix board slugs with the project slug** (`campaigns-engine`, not `engine`).
  `Scene(slug…)` values must be unique within the project; the prefix keeps them
  readable and prevents collisions if a board ever moves.
- **`owner` is mandatory in practice**: it is the only thing that tells the next session
  the project already has an owner. It shows up on the landing page and in
  `site/index.json`.
- If a project grows, split the boards into sibling modules (`flows.py`,
  `wireframes.py`) and gather them in `boards.py` — `build.py` puts the project folder
  on `sys.path`, so `from flows import …` works without hacks.

### Building

```bash
cd <repo>/whiteboard

# only YOUR project — leaves other sessions untouched
python3 ~/.claude/skills/whiteboard/build.py --project campaigns
#   ✓ campaigns: 9 boards (1215 KB)
#   · backend: untouched

# everything (use it when you changed the engine or want to refresh the whole landing)
python3 ~/.claude/skills/whiteboard/build.py
```

`--project` is the default mode when working in parallel: it rebuilds your folder and
the landing page and leaves everyone else's output alone. The landing page always lists
**all** projects, rebuilt or not.

A project you delete from `projects/` disappears from the site on the next full build.

### `kit.Scene` API

```python
Scene(slug, title, subtitle="", group="flow")

sc.node(x, y, w, h, text, kind="rect"|"ellipse"|"diamond", color=…,
        font_size=16, style="solid"|"dashed"|"dotted", radius=14,
        opacity=100, align="center", font_family=FONT_MONO, z=10) -> box
sc.label(x, y, text, font_size=16, color="#1e1e1e", align="left", max_w=0, z=12)
sc.line(pts, color=…, style=…, arrow_end=False)      # pts = [(x,y), …]
sc.arrow(pts, …)                                      # line with an arrowhead
sc.connect(a, b, label=None, label_side="right"|"left"|"top"|"bottom",
           color=…, style=…, bend=None)               # orthogonal connector between boxes
sc.frame(x, y, w, h, title="", tint="#f8f9fa")        # dashed container (lanes, groups)
```

- `node()`/`frame()` return the `(x, y, w, h)` tuple that `connect()` expects.
- Colors: `ink blue green red yellow violet gray white teal pink`.
- `z` sets paint order (higher = on top). Fills go on a low `z`, text on a high one.
- The Y axis grows downward. There is no auto-layout: position by hand, with variables
  and loops.

### Conventions that produce good results

- Vertical flow: boxes 340-380 wide, 76-86 tall, 120 step on Y.
- Swimlanes: one `frame()` with a `tint` per lane and the boxes centered inside.
- Wireframes: `_win()`-style — white rectangle, title-bar line, three circles.
  "Text lines" are gray rectangles at 45% opacity; they read as a wireframe and do not
  compete with the real content.
- Footnotes with `sc.label(..., max_w=…)` under the drawing: that is where the *why*
  goes.
- Always verify with a screenshot before publishing:
  `google-chrome --headless --no-sandbox --screenshot=x.png --window-size=1440,1100 --virtual-time-budget=4000 <url>`

---

## 2. Publishing

```bash
cd <repo>/whiteboard
~/.claude/skills/whiteboard/publish.sh --cert   # first time
~/.claude/skills/whiteboard/publish.sh          # re-deploys
# → https://<YOUR-IP-WITH-DASHES>.sslip.io:<PORT>/<TOKEN>/
```

`publish.sh` copies **all** of `site/` to the webroot, so it also publishes whatever
other sessions have built. That is intended: one site, one index.

`--cert` is only needed the first time; certbot leaves the renewal timer in place.

### How it is wired

- **Hostname without touching DNS:** `sslip.io` resolves `<YOUR-IP-WITH-DASHES>.sslip.io`
  to that IP, so Let's Encrypt can issue a real cert with no DNS panel and no domain of
  your own.
- **Non-default port:** `publish.sh` draws one between 20000-60000 on the first run and
  pins it in `.publish.env`. Port 443 is never left listening.
- **Port 80** only answers `/.well-known/acme-challenge/`; everything else drops.
- **Secret path:** the site hangs off `/<token>/` (24 chars, stored in `site/.token`).
  It survives builds; `--new-token` rotates it.
- **Anything that is not the exact URL drops the connection** instead of returning an
  error:
  - unknown SNI (hitting the raw IP) → `ssl_reject_handshake`
  - path outside `/<token>/`, or a missing file → `return 444` (nginx closes without
    replying)
- `noindex, nofollow` in the meta tag and the header; `server_tokens off`.

Quick check (200 only on the right path, `000` = connection aborted):

```bash
source .publish.env; T=$(cat site/.token)
curl -s -o /dev/null -w "%{http_code}\n" https://$HOST:$PORT/$T/       # 200
curl -s -o /dev/null -w "%{http_code}\n" https://$HOST:$PORT/other/    # 000
```

### Config

`.publish.env` (lives in the project, **do not** commit it):

```
PORT=<RANDOM-PORT>
HOST=<YOUR-IP-WITH-DASHES>.sslip.io
WEBROOT=/var/www/whiteboard
ACMEROOT=/var/www/acme
```

With your own domain: change `HOST`, point the A record at the IP and run
`publish.sh --cert`.

### Operational notes

- The vhost is `/etc/nginx/sites-available/whiteboard`; `publish.sh` rewrites it whole
  every time, so do not edit it by hand — edit the script.
- The webroot is wiped and re-copied on every publish; do not keep loose files there.
- Rotating the URL: `python3 <skill>/build.py --new-token && <skill>/publish.sh`.

---

## Known limits

- The SVG renderer covers what `kit.py` generates (rect, ellipse, diamond, lines,
  arrows, text). If you open the `.excalidraw`, add an exotic shape and re-import it,
  the SVG will not draw it — the flow goes from code to drawing, not the other way
  around.
- Text width is estimated by character count, so wrapping can land a word short or long.
  If a label overflows, widen the box or lower `font_size`.
- `edit.html` loads Excalidraw from esm.sh: the viewer's browser needs internet. If the
  CDN is blocked the rest of the site still works (the SVGs are static) and the
  `.excalidraw` download remains available.
