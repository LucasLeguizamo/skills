#!/usr/bin/env python3
"""Build the whiteboard site.

  python3 <skill>/build.py [--project SLUG] [--outdir site] [--new-token]

Run it from the whiteboard directory. Content is organised in PROJECTS:

  projects/<slug>/boards.py    ->  PROJECT = {...}  +  BOARDS = [...]

Emits, under <outdir>/<token>/ :
  index.html                     home: one card per project
  <project>/index.html           that project's gallery
  <project>/<slug>.html          single board (pan/zoom, fullscreen, downloads)
  <project>/<slug>.svg           self-contained SVG (font embedded as data URI)
  <project>/<slug>.excalidraw    open Excalidraw JSON
  <project>/edit.html            in-browser Excalidraw editor

`--project SLUG` rebuilds ONLY that project (plus the home page), so two sessions
working on different projects never clobber each other's output.

The random token is persisted in <outdir>/.token so rebuilds keep the same URL.
<outdir>/index.json is the internal index (who owns what, when it was built).
Serving is nginx's job; see SKILL.md / publish.sh.
"""

import argparse
import base64
import datetime
import importlib.util
import json
import os
import re
import secrets
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)  # so boards.py can `from kit import ...`

PROJECTS_DIR = "projects"


def load_project(slug, path):
    """Import projects/<slug>/boards.py, returning (meta, board builders)."""
    pdir = os.path.dirname(os.path.abspath(path))
    sys.path.insert(0, pdir)          # sibling modules (flows.py, wireframes.py)
    try:
        spec = importlib.util.spec_from_file_location(f"boards_{slug}", os.path.abspath(path))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
    finally:
        sys.path.remove(pdir)
    meta = dict(getattr(mod, "PROJECT", {}))
    meta.setdefault("name", slug.replace("-", " ").title())
    meta.setdefault("description", "")
    meta.setdefault("owner", "")
    meta["slug"] = slug
    return meta, mod.BOARDS


def discover_projects(only=None):
    root = PROJECTS_DIR
    if not os.path.isdir(root):
        sys.exit(f"no existe ./{root}/ — cada proyecto va en {root}/<slug>/boards.py")
    found = []
    for slug in sorted(os.listdir(root)):
        bp = os.path.join(root, slug, "boards.py")
        if slug.startswith((".", "_")) or not os.path.isfile(bp):
            continue
        if only and slug != only:
            continue
        found.append((slug, bp))
    if only and not found:
        sys.exit(f"no encontré {root}/{only}/boards.py")
    if not found:
        sys.exit(f"ningún proyecto en ./{root}/")
    return found


EXCALIDRAW_VER = "0.18.1"


def font_css(inline=True):
    p = os.path.join(HERE, "assets", "kalam-400.woff2")
    with open(p, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    src = (f"url(data:font/woff2;base64,{b64}) format('woff2')"
           if inline else "url(assets/kalam-400.woff2) format('woff2')")
    return (
        "@font-face{font-family:'Excalifont';src:%s;font-weight:400;font-display:block}"
        "@font-face{font-family:'ExcaliSans';src:local('Segoe UI'),local('Helvetica Neue'),"
        "local('DejaVu Sans');font-display:swap}" % src
    )


SVG_STYLE_MONO = (
    "text{dominant-baseline:auto}"
    ".board-svg{font-kerning:none}"
)


def wrap_svg(scene, css):
    """Inject a <style> with the embedded font right after the opening <svg ...>."""
    svg = scene.svg()
    i = svg.index(">") + 1
    style = f"<style>{css}{SVG_STYLE_MONO}</style>"
    defs = ('<rect x="-100000" y="-100000" width="200000" height="200000" fill="#ffffff"/>')
    return svg[:i] + style + defs + svg[i:]


# --------------------------------------------------------------------- CSS

PAGE_CSS = """
*{box-sizing:border-box}
:root{
  --bg:#f4f1ea; --panel:#fffdf8; --ink:#1e1e1e; --mut:#7a7168; --line:#e0d9cd;
  --accent:#1971c2; --shadow:0 1px 2px rgba(30,30,30,.06),0 8px 24px rgba(30,30,30,.07);
}
:root[data-theme="dark"]{
  --bg:#16151a; --panel:#1e1d24; --ink:#e9e6e1; --mut:#9c948b; --line:#302e38;
  --accent:#74c0fc; --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --bg:#16151a; --panel:#1e1d24; --ink:#e9e6e1; --mut:#9c948b; --line:#302e38;
    --accent:#74c0fc; --shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.35);
  }
}
body{margin:0;background:var(--bg);color:var(--ink);
  font-family:'Excalifont',ui-sans-serif,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:inherit;text-decoration:none}
.wrap{max-width:1240px;margin:0 auto;padding:0 24px}
header.top{padding:56px 0 8px}
h1{font-size:clamp(30px,5vw,46px);margin:0 0 10px;letter-spacing:-.01em}
.sub{color:var(--mut);font-size:17px;margin:0;max-width:70ch;line-height:1.5}
.bar{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:28px 0 8px}
.btn{border:1.5px solid var(--line);background:var(--panel);color:var(--ink);
  border-radius:10px;padding:8px 14px;font:inherit;font-size:14px;cursor:pointer;
  display:inline-flex;align-items:center;gap:7px;transition:border-color .15s,transform .1s}
.btn:hover{border-color:var(--accent)}
.btn:active{transform:translateY(1px)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}
.pill{font-size:12px;color:var(--mut);border:1.5px solid var(--line);border-radius:999px;
  padding:3px 10px}
h2.sect{font-size:14px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);
  margin:52px 0 18px;font-weight:400}
.grid{display:grid;gap:26px;grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
.card{background:var(--panel);border:1.5px solid var(--line);border-radius:16px;
  overflow:hidden;box-shadow:var(--shadow);transition:transform .16s,border-color .16s;
  display:flex;flex-direction:column}
.card:hover{transform:translateY(-3px);border-color:var(--accent)}
.thumb{background:#fff;height:230px;display:flex;align-items:center;justify-content:center;
  border-bottom:1.5px solid var(--line);overflow:hidden;padding:14px}
.thumb img{max-width:100%;max-height:100%;object-fit:contain}
.card .meta{padding:16px 18px 18px}
.card h3{margin:0 0 6px;font-size:19px;font-weight:400}
.card p{margin:0;font-size:14px;color:var(--mut);line-height:1.5}
footer{color:var(--mut);font-size:13px;padding:64px 0 48px;line-height:1.7}
footer code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;
  background:var(--panel);border:1px solid var(--line);border-radius:5px;padding:1px 6px}

/* board page */
.stage{position:relative;height:calc(100vh - 190px);min-height:460px;background:#fff;
  border:1.5px solid var(--line);border-radius:16px;overflow:hidden;cursor:grab;
  box-shadow:var(--shadow);touch-action:none}
.stage.drag{cursor:grabbing}
.stage img{position:absolute;left:0;top:0;transform-origin:0 0;max-width:none;
  user-select:none;-webkit-user-drag:none}
:root[data-theme="dark"] .stage{background:#0f0f13}
:root[data-theme="dark"] .stage img{filter:invert(.92) hue-rotate(180deg)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .stage{background:#0f0f13}
  :root:not([data-theme="light"]) .stage img{filter:invert(.92) hue-rotate(180deg)}}
.hud{position:absolute;right:14px;bottom:14px;display:flex;gap:6px;z-index:5;
  transition:opacity .22s ease}
.hud .btn{background:rgba(255,255,255,.95);color:#1e1e1e;border-color:#dcd6cb;
  box-shadow:0 2px 10px rgba(0,0,0,.14)}
.hud .btn:hover{border-color:var(--accent)}
.stage.idle .hud{opacity:0;pointer-events:none}
.stage:fullscreen{border:0;border-radius:0;height:100vh;width:100vw}
.stage:fullscreen .hud{right:22px;bottom:22px}
.fsonly{display:none}
.stage:fullscreen .fsonly{display:inline-flex}
.hint{position:absolute;left:0;right:0;top:20px;text-align:center;z-index:5;
  font-size:14px;color:#868e96;transition:opacity .22s ease;display:none}
.stage:fullscreen .hint{display:block}
.stage.idle .hint{opacity:0}
.crumb{font-size:14px;color:var(--mut);padding-top:34px}
.crumb a:hover{color:var(--accent)}
@media(max-width:640px){.wrap{padding:0 16px}.stage{height:66vh}}
"""


def html_shell(title, desc, body, css_extra="", inline_font=True, script=""):
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>{title}</title>
<meta name="description" content="{desc}">
<style>{font_css(inline_font)}{PAGE_CSS}{css_extra}</style>
</head>
<body>
{body}
<script>
(function(){{
  var k='wb-theme', s=localStorage.getItem(k);
  if(s) document.documentElement.dataset.theme=s;
  window.toggleTheme=function(){{
    var d=document.documentElement,
        cur=d.dataset.theme||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'),
        nx=cur==='dark'?'light':'dark';
    d.dataset.theme=nx; localStorage.setItem(k,nx);
  }};
}})();
{script}
</script>
</body>
</html>"""


# inline SVG icons: emoji/dingbat glyphs are not reliably present in every font stack
ICON_FS = ('<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" '
           'stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
           '<path d="M2.2 6V2.2H6M14 6V2.2h-3.8M2.2 10v3.8H6M14 10v3.8h-3.8"/></svg>')
ICON_THEME = ('<svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">'
              '<circle cx="8" cy="8" r="6.1" fill="none" stroke="currentColor" stroke-width="1.7"/>'
              '<path d="M8 1.9a6.1 6.1 0 0 1 0 12.2z" fill="currentColor"/></svg>')

THEME_BTN = (f'<button class="btn" onclick="toggleTheme()" title="Cambiar tema">'
             f'{ICON_THEME} Tema</button>')


GROUPS = [("Flujos", "flow"), ("Wireframes", "wireframe")]


def build_home(projects, token):
    """Front page: one card per project, thumbnail = its first board."""
    n = sum(len(p["boards"]) for p in projects)
    parts = [
        '<div class="wrap">',
        '<header class="top">',
        '<h1>Tableros</h1>',
        '<p class="sub">Flujos y wireframes dibujados a mano en formato Excalidraw, '
        'organizados por proyecto. Cada tablero se puede abrir, mover, descargar y editar.</p>',
        f'<div class="bar">{THEME_BTN}'
        f'<span class="pill">{len(projects)} proyectos</span>'
        f'<span class="pill">{n} tableros</span>'
        '<span class="pill">URL privada · no indexada</span></div>',
        '</header>',
        '<h2 class="sect">Proyectos</h2><div class="grid">',
    ]
    for p in projects:
        first = p["boards"][0]
        counts = []
        for label, key in GROUPS:
            c = sum(1 for b in p["boards"] if b["group"] == key)
            if c:
                counts.append(f"{c} {label.lower()}")
        owner = (f'<span class="pill">{p["owner"]}</span>' if p["owner"] else "")
        parts.append(
            f'<a class="card" href="{p["slug"]}/index.html">'
            f'<div class="thumb"><img src="{p["slug"]}/{first["slug"]}.svg" '
            f'alt="{p["name"]}" loading="lazy"></div>'
            f'<div class="meta"><h3>{p["name"]}</h3><p>{p["description"]}</p>'
            f'<div class="bar" style="margin:12px 0 0">'
            f'<span class="pill">{" · ".join(counts)}</span>{owner}</div></div></a>'
        )
    parts.append("</div>")
    parts.append(
        '<footer>Generado por <code>whiteboard/build.py</code> · formato '
        f'<code>.excalidraw</code> (MIT) · ruta privada <code>/{token}/</code>.<br>'
        'Añadir un proyecto: <code>projects/&lt;slug&gt;/boards.py</code> con '
        '<code>PROJECT</code> y <code>BOARDS</code>, luego '
        '<code>build.py --project &lt;slug&gt;</code>.</footer></div>'
    )
    return html_shell("Tableros", "Flujos y wireframes por proyecto", "".join(parts))


def build_project_index(meta, scenes, token):
    parts = [
        '<div class="wrap">',
        '<div class="crumb"><a href="../index.html">← Proyectos</a></div>',
        '<header class="top" style="padding-top:14px">',
        f'<h1>{meta["name"]}</h1>',
        f'<p class="sub">{meta["description"]}</p>',
        f'<div class="bar">{THEME_BTN}'
        f'<span class="pill">{len(scenes)} tableros</span>'
        + (f'<span class="pill">{meta["owner"]}</span>' if meta["owner"] else "")
        + '</div>',
        '</header>',
    ]
    for label, key in GROUPS:
        items = [s for s in scenes if s.group == key]
        if not items:
            continue
        parts.append(f'<h2 class="sect">{label}</h2><div class="grid">')
        for s in items:
            parts.append(
                f'<a class="card" href="{s.slug}.html">'
                f'<div class="thumb"><img src="{s.slug}.svg" alt="{s.title}" loading="lazy"></div>'
                f'<div class="meta"><h3>{s.title}</h3><p>{s.subtitle}</p></div></a>'
            )
        parts.append("</div>")
    parts.append(
        f'<footer>Proyecto <code>{meta["slug"]}</code> · fuente '
        f'<code>projects/{meta["slug"]}/boards.py</code><br>'
        f'Regenerar solo este proyecto: '
        f'<code>build.py --project {meta["slug"]}</code></footer></div>'
    )
    return html_shell(f'{meta["name"]} · Tableros', meta["description"], "".join(parts))


BOARD_JS = """
(function(){
  var stage=document.getElementById('stage'), img=document.getElementById('board');
  if(!stage||!img) return;
  var s=1,tx=0,ty=0,nw=0,nh=0,drag=false,px=0,py=0;
  function apply(){ img.style.transform='translate('+tx+'px,'+ty+'px) scale('+s+')'; }
  function fit(){
    var r=stage.getBoundingClientRect();
    if(!nw||!nh) return;
    s=Math.min((r.width-32)/nw,(r.height-32)/nh);
    tx=(r.width-nw*s)/2; ty=(r.height-nh*s)/2; apply();
  }
  function ready(){ nw=img.naturalWidth; nh=img.naturalHeight;
    img.style.width=nw+'px'; img.style.height=nh+'px'; fit(); }
  if(img.complete && img.naturalWidth) ready(); else img.addEventListener('load',ready);
  addEventListener('resize',fit);
  window.wbFit=fit;
  window.wbZoom=function(f){
    var r=stage.getBoundingClientRect(), cx=r.width/2, cy=r.height/2;
    var ns=Math.min(8,Math.max(.05,s*f));
    tx=cx-(cx-tx)*(ns/s); ty=cy-(cy-ty)*(ns/s); s=ns; apply();
  };
  /* Zoom proportional to the ACTUAL wheel delta. A trackpad fires many tiny events
     per gesture, so a fixed per-event factor runs away; a mouse wheel fires few big
     ones. Normalising by deltaMode and clamping each step keeps both usable. */
  stage.addEventListener('wheel',function(e){
    e.preventDefault();
    var d=e.deltaY;
    if(e.deltaMode===1) d*=16; else if(e.deltaMode===2) d*=400;
    var f=Math.exp(-d*(e.ctrlKey?0.010:0.0022));   // ctrlKey = pinch on a trackpad
    f=Math.min(1.25,Math.max(1/1.25,f));           // no single event jumps >25%
    var r=stage.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    var ns=Math.min(8,Math.max(.05,s*f));
    tx=mx-(mx-tx)*(ns/s); ty=my-(my-ty)*(ns/s); s=ns; apply();
  },{passive:false});
  stage.addEventListener('pointerdown',function(e){
    drag=true; px=e.clientX; py=e.clientY; stage.classList.add('drag');
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove',function(e){
    if(!drag) return; tx+=e.clientX-px; ty+=e.clientY-py; px=e.clientX; py=e.clientY; apply();
  });
  ['pointerup','pointercancel'].forEach(function(t){
    stage.addEventListener(t,function(){drag=false;stage.classList.remove('drag');});
  });

  /* fullscreen: the canvas takes the whole screen and the controls fade out
     until you move the mouse (or tap). */
  var idle;
  function poke(){
    stage.classList.remove('idle'); clearTimeout(idle);
    if(document.fullscreenElement) idle=setTimeout(function(){stage.classList.add('idle');},2200);
  }
  stage.addEventListener('pointermove',poke);
  stage.addEventListener('pointerdown',poke);
  var hud=stage.querySelector('.hud');
  hud.addEventListener('pointerenter',function(){clearTimeout(idle);});
  hud.addEventListener('pointerleave',poke);
  window.wbFull=function(){
    if(document.fullscreenElement) document.exitFullscreen();
    else if(stage.requestFullscreen) stage.requestFullscreen();
  };
  document.addEventListener('fullscreenchange',function(){
    stage.classList.remove('idle'); setTimeout(fit,80); poke();
  });
  addEventListener('keydown',function(e){
    if(e.target.matches('input,textarea,select')) return;
    var k=e.key.toLowerCase();
    if(k==='f'){ e.preventDefault(); wbFull(); }
    else if(k==='0'){ fit(); }
    else if(k==='+'||k==='='){ wbZoom(1.25); }
    else if(k==='-'||k==='_'){ wbZoom(1/1.25); }
  });
})();
"""


def build_board_page(s, scenes, meta):
    i = scenes.index(s)
    prev = scenes[i - 1] if i else scenes[-1]
    nxt = scenes[(i + 1) % len(scenes)]
    body = f"""<div class="wrap">
<div class="crumb"><a href="../index.html">Proyectos</a> ›
  <a href="index.html">{meta["name"]}</a></div>
<header class="top" style="padding-top:14px">
  <h1 style="font-size:clamp(24px,3.4vw,34px)">{s.title}</h1>
  <p class="sub">{s.subtitle}</p>
  <div class="bar">
    <button class="btn primary" onclick="wbFull()">{ICON_FS} Pantalla completa</button>
    {THEME_BTN}
    <button class="btn" onclick="wbFit()">Ajustar</button>
    <a class="btn" href="{s.slug}.svg" download>Descargar SVG</a>
    <a class="btn" href="{s.slug}.excalidraw" download>Descargar .excalidraw</a>
    <a class="btn" href="edit.html?s={s.slug}">Abrir en el editor</a>
  </div>
</header>
<div class="stage" id="stage">
  <img id="board" src="{s.slug}.svg" alt="{s.title}">
  <div class="hint">{s.title} · mueve el cursor para los controles · Esc para salir</div>
  <div class="hud">
    <button class="btn" onclick="wbZoom(1/1.25)" title="Alejar (−)">−</button>
    <button class="btn" onclick="wbZoom(1.25)" title="Acercar (+)">+</button>
    <button class="btn" onclick="wbFit()" title="Ajustar (0)">Ajustar</button>
    <button class="btn fsonly" onclick="toggleTheme()" title="Tema">{ICON_THEME}</button>
    <button class="btn" onclick="wbFull()" title="Pantalla completa (F)">{ICON_FS}</button>
  </div>
</div>
<footer>Arrastra para mover · rueda para zoom · <b>F</b> pantalla completa ·
  <b>0</b> ajustar · <b>+ −</b> zoom<br>
  <a href="{prev.slug}.html">← {prev.title}</a> &nbsp;·&nbsp;
  <a href="{nxt.slug}.html">{nxt.title} →</a>
</footer>
</div>"""
    return html_shell(f'{s.title} · {meta["name"]}', s.subtitle, body, inline_font=False,
                      script=BOARD_JS)


def build_editor(scenes, meta):
    opts = "".join(f'<option value="{s.slug}">{s.title}</option>' for s in scenes)
    body = f"""<div class="wrap">
<div class="crumb"><a href="../index.html">Proyectos</a> ›
  <a href="index.html">{meta["name"]}</a></div>
<header class="top" style="padding-top:14px">
  <h1 style="font-size:clamp(24px,3.4vw,32px)">Editor</h1>
  <p class="sub">Excalidraw {EXCALIDRAW_VER} cargado desde CDN. Los cambios viven solo en tu
  navegador: exporta el archivo si quieres conservarlos.</p>
  <div class="bar">
    <select class="btn" id="pick" onchange="location.search='?s='+this.value">{opts}</select>
    {THEME_BTN}
    <span class="pill" id="stat">cargando…</span>
  </div>
</header>
<div id="host" style="height:calc(100vh - 220px);min-height:480px;border:1.5px solid var(--line);
  border-radius:16px;overflow:hidden;background:#fff"></div>
<footer>Si el editor no carga (CDN bloqueado), descarga el <code>.excalidraw</code> desde la
ficha del tablero y ábrelo en <code>excalidraw.com</code>.</footer>
</div>"""
    css = ('@media(max-width:640px){#host{height:70vh}}'
           ':root[data-theme="dark"] #host{background:#121212}')
    script = f"""
var VER='{EXCALIDRAW_VER}';
var slug=new URLSearchParams(location.search).get('s')||'{scenes[0].slug}';
document.getElementById('pick').value=slug;
var stat=document.getElementById('stat');
function fail(m){{ stat.textContent=m; }}
(async function(){{
  try{{
    var css=document.createElement('link'); css.rel='stylesheet';
    css.href='https://esm.sh/@excalidraw/excalidraw@'+VER+'/dist/dev/index.css';
    document.head.appendChild(css);
    var React=await import('https://esm.sh/react@19.0.0');
    var ReactDOM=await import('https://esm.sh/react-dom@19.0.0/client');
    window.React=React; window.ReactDOM=ReactDOM;
    var Ex=await import('https://esm.sh/@excalidraw/excalidraw@'+VER+
      '/dist/dev/index.js?external=react,react-dom');
    var data=await (await fetch(slug+'.excalidraw')).json();
    var dark=(document.documentElement.dataset.theme||
      (matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'))==='dark';
    ReactDOM.createRoot(document.getElementById('host')).render(
      React.createElement(Ex.Excalidraw,{{
        initialData:{{elements:data.elements,appState:{{viewBackgroundColor:'#ffffff',
          theme:dark?'dark':'light'}},scrollToContent:true}},
        langCode:'es-ES'
      }})
    );
    stat.textContent='listo';
  }}catch(e){{ console.error(e); fail('no se pudo cargar el editor'); }}
}})();
"""
    return html_shell(f'Editor · {meta["name"]}', "Editor Excalidraw", body, css,
                      inline_font=False, script=script)


# --------------------------------------------------------------------- main

def dir_size(path):
    return sum(os.path.getsize(os.path.join(dp, f))
               for dp, _, fs in os.walk(path) for f in fs)


def build_one_project(slug, bpath, root, embedded):
    """Render a project into <root>/<slug>/. Returns its index entry."""
    meta, builders = load_project(slug, bpath)
    scenes = [b() for b in builders]

    seen = set()
    for s in scenes:
        if s.slug in seen:
            sys.exit(f"[{slug}] slug de tablero duplicado: {s.slug}")
        seen.add(s.slug)

    pdir = os.path.join(root, slug)
    if os.path.isdir(pdir):
        shutil.rmtree(pdir)
    os.makedirs(pdir)

    for s in scenes:
        with open(os.path.join(pdir, f"{s.slug}.svg"), "w") as f:
            f.write(wrap_svg(s, embedded))
        with open(os.path.join(pdir, f"{s.slug}.excalidraw"), "w") as f:
            f.write(s.excalidraw_json())
        with open(os.path.join(pdir, f"{s.slug}.html"), "w") as f:
            f.write(build_board_page(s, scenes, meta))
    with open(os.path.join(pdir, "index.html"), "w") as f:
        f.write(build_project_index(meta, scenes, ""))
    with open(os.path.join(pdir, "edit.html"), "w") as f:
        f.write(build_editor(scenes, meta))

    meta["built_at"] = datetime.datetime.now().replace(microsecond=0).isoformat()
    meta["source"] = bpath
    meta["boards"] = [{"slug": s.slug, "title": s.title, "group": s.group,
                       "subtitle": s.subtitle} for s in scenes]
    meta["size_kb"] = round(dir_size(pdir) / 1024)
    return meta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", help="rebuild ONLY this project (plus the home page)")
    ap.add_argument("--outdir", default="site")
    ap.add_argument("--new-token", action="store_true",
                    help="rotate the secret path (invalidates the old URL)")
    args = ap.parse_args()

    out = os.path.abspath(args.outdir)
    os.makedirs(out, exist_ok=True)
    tokf = os.path.join(out, ".token")
    if args.new_token or not os.path.exists(tokf):
        token = secrets.token_urlsafe(18).replace("-", "").replace("_", "")[:24]
        with open(tokf, "w") as f:
            f.write(token)
    else:
        token = open(tokf).read().strip()

    root = os.path.join(out, token)
    if args.new_token and os.path.isdir(root):
        shutil.rmtree(root)
    os.makedirs(os.path.join(root, "assets"), exist_ok=True)
    shutil.copy(os.path.join(HERE, "assets", "kalam-400.woff2"),
                os.path.join(root, "assets", "kalam-400.woff2"))

    idxf = os.path.join(out, "index.json")
    prev = {}
    if os.path.exists(idxf):
        try:
            prev = {p["slug"]: p for p in json.load(open(idxf)).get("projects", [])}
        except (ValueError, KeyError):
            prev = {}

    if args.project:
        discover_projects(args.project)   # fail on a typo'd slug BEFORE building anything

    embedded = font_css(inline=True)
    entries = {}

    # every project is discovered so the home page always lists them all;
    # only the selected one is re-rendered.
    for slug, bpath in discover_projects():
        if args.project and slug != args.project and slug in prev \
                and os.path.isdir(os.path.join(root, slug)):
            entries[slug] = prev[slug]          # keep the other session's output as-is
            print(f"  · {slug}: sin tocar")
            continue
        entries[slug] = build_one_project(slug, bpath, root, embedded)
        print(f"  ✓ {slug}: {len(entries[slug]['boards'])} tableros "
              f"({entries[slug]['size_kb']} KB)")

    # drop anything that is not a live project (renamed/deleted projects, and the
    # loose files left behind by older flat builds)
    keep = set(entries) | {"assets", "index.html"}
    for name in os.listdir(root):
        if name in keep:
            continue
        p = os.path.join(root, name)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
        print(f"  − {name}: eliminado (ya no pertenece a ningún proyecto)")

    projects = [entries[s] for s in sorted(entries)]
    with open(os.path.join(root, "index.html"), "w") as f:
        f.write(build_home(projects, token))

    # a decoy root so probing "/" reveals nothing
    with open(os.path.join(out, "index.html"), "w") as f:
        f.write("<!doctype html><title>404</title><h1>404</h1>")

    with open(idxf, "w") as f:
        json.dump({"token": token, "projects": projects}, f, ensure_ascii=False, indent=2)

    n = sum(len(p["boards"]) for p in projects)
    print(f"{len(projects)} proyectos · {n} tableros -> {root} ({dir_size(root)/1024:.0f} KB)")
    print(f"path: /{token}/")


if __name__ == "__main__":
    main()
