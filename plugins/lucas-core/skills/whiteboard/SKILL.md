---
name: whiteboard
description: Dibuja flows, diagramas, wireframes y mapas de arquitectura estilo FigJam/Excalidraw desde Python (SVG autocontenido + archivo .excalidraw editable + ficha HTML con pan/zoom) y los publica en una web privada con nginx, TLS de Let's Encrypt, puerto no default y URL con token secreto. Úsala cuando el usuario pida un diagrama, un flujo, un wireframe, un mapa de arquitectura, "dibújalo", "hazme un tablero", "publícalo en una página", o draw a diagram / flow / wireframe / architecture map and publish it.
---

# Whiteboard

Genera tableros en **formato Excalidraw** (MIT, JSON abierto) desde Python y los sirve
como sitio estático detrás de nginx con TLS.

Cada tablero produce tres archivos:

| archivo | para qué |
|---|---|
| `<slug>.svg` | lo que se ve en la web. Autocontenido: la fuente va embebida como data-URI, no pide nada a terceros |
| `<slug>.excalidraw` | se arrastra a excalidraw.com (o al editor incluido) para seguir editando a mano |
| `<slug>.html` | ficha con pan/zoom, pantalla completa, tema claro/oscuro y descargas |

En la ficha: **F** entra/sale de pantalla completa (Fullscreen API sobre el lienzo), **0**
ajusta, **+ −** hacen zoom, **Esc** sale. En pantalla completa los controles se desvanecen
tras ~2 s y vuelven al mover el cursor.

No hay build de JS, ni npm, ni React en el camino crítico. Solo Python 3 + nginx.

## Archivos de la skill

```
kit.py        DSL de dibujo + renderer SVG "hecho a mano" (roughjs emulado) + export Excalidraw
build.py      lee projects/*/boards.py → genera site/<token>/
publish.sh    copia a /var/www, escribe el vhost de nginx, saca/renueva el cert
assets/       kalam-400.woff2 (la tipografía manuscrita)
```

El **contenido** vive en el repo de trabajo, no en la skill.

---

## 1. Proyectos — LEE ESTO ANTES DE DIBUJAR

El contenido se organiza en **proyectos**. Un proyecto = un tema de trabajo (normalmente,
lo que una sesión está atacando). **Nunca metas tableros nuevos en el proyecto de otra
sesión**; crea el tuyo.

```
<repo>/whiteboard/
  projects/
    backend/boards.py          ← PROJECT + BOARDS
    campaigns/boards.py          ← PROJECT + BOARDS
              flows.py           ← módulos hermanos, opcionales
              wireframes.py
  site/
    .token                       ← la ruta secreta (no rotar sin avisar)
    index.json                   ← índice INTERNO: quién es dueño de qué y cuándo se construyó
    <token>/index.html           ← portada con un card por proyecto
    <token>/<proyecto>/…
```

**Antes de empezar**, mira qué proyectos ya existen para no pisar a nadie:

```bash
cd <repo>/whiteboard
ls projects/
python3 -c "import json;[print(f\"{p['slug']:14} {len(p['boards']):2} tableros  {p['owner']}\") for p in json.load(open('site/index.json'))['projects']]"
```

Si tu tema encaja en un proyecto existente **y es tuyo**, añade ahí. Si no, crea
`projects/<tu-slug>/boards.py`:

```python
from kit import Scene

PROJECT = {
    "name": "Campaigns",
    "description": "Una línea: de qué va este proyecto.",
    "owner": "sesión: spec de campaigns",   # ← quién trabaja acá. Sé concreto.
}

def board_ejemplo():
    sc = Scene("campaigns-motor", "Título del tablero",
               "Subtítulo de una línea.", group="flow")   # group: "flow" | "wireframe"
    a = sc.node(100, 100, 320, 76, "Paso uno", color="blue")
    b = sc.node(100, 240, 320, 76, "¿Decisión?", kind="diamond", color="yellow")
    c = sc.node(100, 400, 320, 76, "Fin", kind="ellipse", color="green")
    sc.connect(a, b)
    sc.connect(b, c, label="sí", label_side="right")
    return sc

BOARDS = [board_ejemplo]        # ← build.py lee esta lista
```

Reglas que evitan choques:

- **Prefija los slugs de tablero con el del proyecto** (`campaigns-motor`, no `motor`).
  Los `Scene(slug…)` deben ser únicos dentro del proyecto; el prefijo los mantiene
  legibles y evita colisiones si algún día se mueve un tablero.
- **`owner` es obligatorio en la práctica**: es lo único que le dice a la siguiente sesión
  que ese proyecto ya tiene dueño. Sale en la portada y en `site/index.json`.
- Si el proyecto crece, parte los tableros en módulos hermanos
  (`flows.py`, `wireframes.py`) y júntalos en `boards.py` — `build.py` mete la carpeta
  del proyecto en `sys.path`, así que `from flows import …` funciona sin hacks.

### Construir

```bash
cd <repo>/whiteboard

# solo TU proyecto — no toca lo de las demás sesiones
python3 ~/.claude/skills/whiteboard/build.py --project campaigns
#   ✓ campaigns: 9 tableros (1215 KB)
#   · backend: sin tocar

# todo (úsalo si cambiaste el motor o quieres refrescar la portada entera)
python3 ~/.claude/skills/whiteboard/build.py
```

`--project` es el modo por defecto cuando trabajas en paralelo: reconstruye tu carpeta y
la portada, y deja intacto el output de los demás. La portada siempre lista **todos** los
proyectos, se hayan reconstruido o no.

Un proyecto que borras de `projects/` desaparece del sitio en el siguiente build completo.

### API de `kit.Scene`

```python
Scene(slug, title, subtitle="", group="flow")

sc.node(x, y, w, h, text, kind="rect"|"ellipse"|"diamond", color=…,
        font_size=16, style="solid"|"dashed"|"dotted", radius=14,
        opacity=100, align="center", font_family=FONT_MONO, z=10) -> box
sc.label(x, y, text, font_size=16, color="#1e1e1e", align="left", max_w=0, z=12)
sc.line(pts, color=…, style=…, arrow_end=False)      # pts = [(x,y), …]
sc.arrow(pts, …)                                      # line con punta
sc.connect(a, b, label=None, label_side="right"|"left"|"top"|"bottom",
           color=…, style=…, bend=None)               # conector ortogonal entre cajas
sc.frame(x, y, w, h, title="", tint="#f8f9fa")        # contenedor punteado (lanes, grupos)
```

- `node()`/`frame()` devuelven la tupla `(x, y, w, h)` que `connect()` espera.
- Colores: `ink blue green red yellow violet gray white teal pink`.
- `z` ordena el pintado (más alto = más arriba). Los rellenos van en `z` bajo, el texto alto.
- El eje Y crece hacia abajo. No hay auto-layout: se posiciona a mano, con variables y bucles.

### Convenciones que dan buen resultado

- Un flujo vertical: caja de 340–380 de ancho, alto 76–86, paso de 120 en Y.
- Carriles (swimlanes): un `frame()` con `tint` por carril y las cajas centradas dentro.
- Wireframes: `_win()`-style — rectángulo blanco, línea de barra de título, tres círculos.
  Las "líneas de texto" son rectángulos gris al 45 % de opacidad; se leen como wireframe
  y no compiten con el contenido real.
- Notas al pie con `sc.label(..., max_w=…)` debajo del dibujo: es donde va el porqué.
- Verifica siempre con una captura antes de publicar:
  `google-chrome --headless --no-sandbox --screenshot=x.png --window-size=1440,1100 --virtual-time-budget=4000 <url>`

---

## 2. Publicar

```bash
cd <repo>/whiteboard
~/.claude/skills/whiteboard/publish.sh --cert   # primera vez
~/.claude/skills/whiteboard/publish.sh          # re-deploys
# → https://<TU-IP-CON-GUIONES>.sslip.io:<PUERTO>/<TOKEN>/
```

`publish.sh` copia **todo** `site/` al webroot, así que publica también lo que hayan
construido otras sesiones. Eso es lo deseado: un solo sitio, un solo índice.

`--cert` solo hace falta la primera vez; certbot deja el timer de renovación puesto.

### Cómo queda montado

- **Hostname sin tocar DNS:** `sslip.io` resuelve `<TU-IP-CON-GUIONES>.sslip.io` → esa IP,
  así que Let's Encrypt puede emitir un cert real sin panel de DNS ni dominio propio.
- **Puerto no default:** `publish.sh` sortea uno entre 20000–60000 en el primer run y lo
  fija en `.publish.env`. El 443 no queda escuchando.
- **Puerto 80** solo responde `/.well-known/acme-challenge/`; el resto cae.
- **Ruta secreta:** el sitio cuelga de `/<token>/` (24 chars, en `site/.token`).
  Se conserva entre builds; `--new-token` la rota.
- **Todo lo que no sea la URL exacta corta la conexión**, no devuelve error:
  - SNI desconocido (entrar por IP) → `ssl_reject_handshake`
  - path fuera de `/<token>/` o archivo inexistente → `return 444` (nginx cierra sin responder)
- `noindex, nofollow` en meta y en cabecera; `server_tokens off`.

Comprobación rápida (200 solo en la ruta buena, `000` = conexión abortada):

```bash
source .publish.env; T=$(cat site/.token)
curl -s -o /dev/null -w "%{http_code}\n" https://$HOST:$PORT/$T/     # 200
curl -s -o /dev/null -w "%{http_code}\n" https://$HOST:$PORT/otra/   # 000
```

### Config

`.publish.env` (en el proyecto, **no** commitear):

```
PORT=<PUERTO-SORTEADO>
HOST=<TU-IP-CON-GUIONES>.sslip.io
WEBROOT=/var/www/whiteboard
ACMEROOT=/var/www/acme
```

Con dominio propio: cambia `HOST`, apunta el A record a la IP y corre `publish.sh --cert`.

### Notas operativas

- El vhost es `/etc/nginx/sites-available/whiteboard`; `publish.sh` lo reescribe entero
  cada vez, así que no lo edites a mano — edita el script.
- El webroot se borra y se recopia en cada publish; no guardes nada suelto ahí.
- Rotar la URL: `python3 <skill>/build.py --new-token && <skill>/publish.sh`.

---

## Límites conocidos

- El renderer SVG cubre lo que genera `kit.py` (rect, elipse, rombo, líneas, flechas,
  texto). Si abres el `.excalidraw`, añades una forma exótica y lo reimportas, el SVG no
  la va a dibujar — el flujo es de código a dibujo, no al revés.
- El ancho del texto se estima por conteo de caracteres, así que el wrap puede quedar una
  palabra corto o largo. Si un rótulo se desborda, sube el ancho de la caja o baja
  `font_size`.
- `edit.html` carga Excalidraw desde esm.sh: necesita internet en el navegador del que
  mira. Si el CDN está bloqueado, el resto del sitio sigue funcionando (los SVG son
  estáticos) y queda la descarga del `.excalidraw`.
