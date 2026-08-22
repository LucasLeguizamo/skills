"""Tiny Excalidraw-scene DSL.

Builds boards programmatically and emits two artifacts per scene:
  - <name>.excalidraw : open Excalidraw JSON (drop it on excalidraw.com to edit)
  - <name>.svg        : self-contained hand-drawn SVG (what the site renders)

The SVG renderer reimplements just enough of roughjs' look (double-stroked,
jittered paths) to keep the FigJam/Excalidraw feel without any JS at view time.
Everything is seeded from element ids, so output is byte-stable across runs.
"""

import json
import math
import random

# stroke, background
PALETTE = {
    "ink": ("#1e1e1e", "transparent"),
    "blue": ("#1971c2", "#a5d8ff"),
    "green": ("#2f9e44", "#b2f2bb"),
    "red": ("#e03131", "#ffc9c9"),
    "yellow": ("#f08c00", "#ffec99"),
    "violet": ("#6741d9", "#d0bfff"),
    "gray": ("#495057", "#e9ecef"),
    "white": ("#1e1e1e", "#ffffff"),
    "teal": ("#0c8599", "#99e9f2"),
    "pink": ("#c2255c", "#fcc2d7"),
}

FONT_EXCALIFONT = 5  # hand-drawn
FONT_MONO = 3
FONT_SANS = 2

# Rough character-width ratios used for wrapping + SVG text metrics.
CHAR_W = {FONT_EXCALIFONT: 0.50, FONT_MONO: 0.60, FONT_SANS: 0.52}
LINE_H = 1.25


def _rng(seed):
    return random.Random(seed)


def _perp(p0, p1):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    n = math.hypot(dx, dy) or 1.0
    return (-dy / n, dx / n)


def _rough_line(p0, p1, rng, amp=1.6):
    """One hand-drawn pass over a straight segment, as an SVG path `d`."""
    px, py = _perp(p0, p1)
    length = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    a = min(amp, max(0.6, length * 0.012))

    def jit(t, extra=1.0):
        x = p0[0] + (p1[0] - p0[0]) * t
        y = p0[1] + (p1[1] - p0[1]) * t
        o = rng.uniform(-a, a) * extra
        return (x + px * o + rng.uniform(-a, a) * 0.4,
                y + py * o + rng.uniform(-a, a) * 0.4)

    s = jit(0.0, 0.5)
    c1 = jit(0.35)
    c2 = jit(0.7)
    e = jit(1.0, 0.5)
    return f"M {s[0]:.2f} {s[1]:.2f} C {c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {e[0]:.2f} {e[1]:.2f}"


def _rough_polyline(pts, rng, closed=False, passes=2, amp=1.6):
    ds = []
    segs = list(zip(pts, pts[1:]))
    if closed:
        segs.append((pts[-1], pts[0]))
    for _ in range(passes):
        for a, b in segs:
            ds.append(_rough_line(a, b, rng, amp))
    return " ".join(ds)


def _smooth_closed(pts):
    """Catmull-Rom -> cubic bezier over a closed point ring."""
    n = len(pts)
    d = [f"M {pts[0][0]:.2f} {pts[0][1]:.2f}"]
    for i in range(n):
        p0 = pts[(i - 1) % n]
        p1 = pts[i]
        p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C {c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}")
    d.append("Z")
    return " ".join(d)


def _ellipse_ring(cx, cy, rx, ry, rng, wobble=1.8, n=18, phase=0.0):
    pts = []
    for i in range(n):
        t = phase + 2 * math.pi * i / n
        w = rng.uniform(-wobble, wobble)
        pts.append((cx + (rx + w) * math.cos(t), cy + (ry + w) * math.sin(t)))
    return pts


def _rounded_rect_pts(x, y, w, h, r):
    """Corner-cut polygon; good enough for a jittered rounded rectangle."""
    r = max(0.0, min(r, w / 2, h / 2))
    return [
        (x + r, y), (x + w - r, y),
        (x + w, y + r), (x + w, y + h - r),
        (x + w - r, y + h), (x + r, y + h),
        (x, y + h - r), (x, y + r),
    ]


def wrap_text(text, max_w, font_size, font_family=FONT_EXCALIFONT):
    """Greedy wrap. Honours explicit \\n. Returns list of lines."""
    ratio = CHAR_W.get(font_family, 0.52) * font_size
    if max_w <= 0:
        return text.split("\n")
    max_chars = max(1, int(max_w / ratio))
    out = []
    for para in text.split("\n"):
        if not para:
            out.append("")
            continue
        line = ""
        for word in para.split(" "):
            cand = word if not line else line + " " + word
            if len(cand) <= max_chars:
                line = cand
            else:
                if line:
                    out.append(line)
                # hard-break a word longer than the box
                while len(word) > max_chars:
                    out.append(word[:max_chars])
                    word = word[max_chars:]
                line = word
        out.append(line)
    return out


def text_width(lines, font_size, font_family=FONT_EXCALIFONT):
    ratio = CHAR_W.get(font_family, 0.52) * font_size
    return max((len(l) for l in lines), default=0) * ratio


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


class Scene:
    def __init__(self, slug, title, subtitle="", group="flow"):
        self.slug = slug
        self.title = title
        self.subtitle = subtitle
        self.group = group  # "flow" | "wireframe"
        self.els = []       # excalidraw elements
        self.draws = []     # (z, svg fragment)
        self._n = 0

    # ---------- ids ----------
    def _id(self, kind):
        self._n += 1
        return f"{self.slug}-{kind}-{self._n}"

    def _seed(self, eid):
        return sum(ord(c) * (i + 7) for i, c in enumerate(eid))

    def _base(self, eid, x, y, w, h, stroke, bg, sw=2, style="solid", roughness=1,
              opacity=100, group_ids=None):
        return {
            "id": eid, "x": round(x, 2), "y": round(y, 2),
            "width": round(w, 2), "height": round(h, 2), "angle": 0,
            "strokeColor": stroke, "backgroundColor": bg,
            "fillStyle": "solid", "strokeWidth": sw, "strokeStyle": style,
            "roughness": roughness, "opacity": opacity,
            "groupIds": group_ids or [], "frameId": None,
            "roundness": None, "seed": self._seed(eid) % 2_000_000,
            "version": 1, "versionNonce": self._seed(eid) % 1_000_000,
            "isDeleted": False, "boundElements": [], "updated": 1,
            "link": None, "locked": False,
        }

    # ---------- primitives ----------
    def _svg_shape(self, kind, eid, x, y, w, h, stroke, bg, sw, style, z, radius=12,
                   opacity=100):
        rng = _rng(self._seed(eid))
        dash = ""
        if style == "dashed":
            dash = ' stroke-dasharray="9 7"'
        elif style == "dotted":
            dash = ' stroke-dasharray="2 6" stroke-linecap="round"'
        op = f' opacity="{opacity/100:.2f}"' if opacity != 100 else ""
        frag = [f'<g{op}>']
        if kind == "ellipse":
            cx, cy, rx, ry = x + w / 2, y + h / 2, w / 2, h / 2
            if bg != "transparent":
                fillpts = _ellipse_ring(cx, cy, rx, ry, _rng(self._seed(eid) + 5), 1.0, 24)
                frag.append(f'<path d="{_smooth_closed(fillpts)}" fill="{bg}" stroke="none"/>')
            for k in range(2):
                pts = _ellipse_ring(cx, cy, rx, ry, rng, 1.7, 18, phase=k * 0.3)
                frag.append(f'<path d="{_smooth_closed(pts)}" fill="none" stroke="{stroke}" '
                            f'stroke-width="{sw}" stroke-linecap="round"{dash}/>')
        else:
            if kind == "diamond":
                pts = [(x + w / 2, y), (x + w, y + h / 2), (x + w / 2, y + h), (x, y + h / 2)]
            else:
                pts = _rounded_rect_pts(x, y, w, h, radius)
            if bg != "transparent":
                poly = " ".join(f"{p[0]:.2f},{p[1]:.2f}" for p in pts)
                frag.append(f'<polygon points="{poly}" fill="{bg}" stroke="none"/>')
            d = _rough_polyline(pts, rng, closed=True, passes=2)
            frag.append(f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="{sw}" '
                        f'stroke-linecap="round"{dash}/>')
        frag.append("</g>")
        self.draws.append((z, "".join(frag)))

    def _svg_text(self, lines, cx_or_x, y, font_size, color, align, font_family, z,
                  opacity=100, width=None):
        fam = {FONT_EXCALIFONT: "Excalifont", FONT_MONO: "ExcaliMono",
               FONT_SANS: "ExcaliSans"}[font_family]
        anchor = {"left": "start", "center": "middle", "right": "end"}[align]
        op = f' opacity="{opacity/100:.2f}"' if opacity != 100 else ""
        parts = [f'<text x="{cx_or_x:.2f}" y="{y:.2f}" font-family="{fam}" '
                 f'font-size="{font_size}" fill="{color}" text-anchor="{anchor}"'
                 f' xml:space="preserve"{op}>']
        for i, line in enumerate(lines):
            dy = 0 if i == 0 else font_size * LINE_H
            parts.append(f'<tspan x="{cx_or_x:.2f}" dy="{dy:.2f}">{esc(line) or " "}</tspan>')
        parts.append("</text>")
        self.draws.append((z, "".join(parts)))

    # ---------- public API ----------
    def node(self, x, y, w, h, text="", kind="rect", color="blue", font_size=16,
             stroke_width=2, style="solid", z=10, radius=14, opacity=100,
             text_color=None, font_family=FONT_EXCALIFONT, align="center"):
        stroke, bg = PALETTE[color]
        eid = self._id(kind)
        el = self._base(eid, x, y, w, h, stroke, bg, stroke_width, style, opacity=opacity)
        el["type"] = kind if kind in ("ellipse", "diamond") else "rectangle"
        if el["type"] == "rectangle":
            el["roundness"] = {"type": 3} if radius else None
        self.els.append(el)
        self._svg_shape(kind, eid, x, y, w, h, stroke, bg, stroke_width, style, z,
                        radius=radius, opacity=opacity)

        if text:
            tcolor = text_color or ("#1e1e1e" if bg != "transparent" else stroke)
            pad = 10
            lines = wrap_text(text, w - 2 * pad, font_size, font_family)
            tid = self._id("text")
            th = len(lines) * font_size * LINE_H
            tel = self._base(tid, x + pad, y + (h - th) / 2, w - 2 * pad, th, tcolor,
                             "transparent", 1, "solid")
            tel.update({
                "type": "text", "text": "\n".join(lines), "fontSize": font_size,
                "fontFamily": font_family, "textAlign": align, "verticalAlign": "middle",
                "containerId": eid, "originalText": text, "autoResize": False,
                "lineHeight": LINE_H,
            })
            el["boundElements"] = [{"type": "text", "id": tid}]
            self.els.append(tel)
            # SVG: first baseline ~ centered block
            first = y + (h - th) / 2 + font_size * 0.92
            ax = {"center": x + w / 2, "left": x + pad, "right": x + w - pad}[align]
            self._svg_text(lines, ax, first, font_size, tcolor, align, font_family, z + 1,
                           opacity=opacity)
        return (x, y, w, h)

    def label(self, x, y, text, font_size=16, color="#1e1e1e", align="left",
              font_family=FONT_EXCALIFONT, z=12, max_w=0, opacity=100):
        lines = wrap_text(text, max_w, font_size, font_family) if max_w else text.split("\n")
        w = max_w or text_width(lines, font_size, font_family)
        h = len(lines) * font_size * LINE_H
        eid = self._id("text")
        ax = {"left": x, "center": x, "right": x}[align]
        ex = x if align == "left" else (x - w / 2 if align == "center" else x - w)
        el = self._base(eid, ex, y, w, h, color, "transparent", 1, "solid", opacity=opacity)
        el.update({
            "type": "text", "text": "\n".join(lines), "fontSize": font_size,
            "fontFamily": font_family, "textAlign": align, "verticalAlign": "top",
            "containerId": None, "originalText": text, "autoResize": True,
            "lineHeight": LINE_H,
        })
        self.els.append(el)
        self._svg_text(lines, ax, y + font_size * 0.92, font_size, color, align,
                       font_family, z, opacity=opacity)
        return (ex, y, w, h)

    def line(self, pts, color="ink", stroke_width=2, style="solid", z=8, arrow_end=False,
             arrow_start=False, opacity=100):
        stroke, _ = PALETTE[color]
        eid = self._id("arrow" if (arrow_end or arrow_start) else "line")
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        x0, y0 = xs[0], ys[0]
        el = self._base(eid, x0, y0, max(xs) - min(xs), max(ys) - min(ys), stroke,
                        "transparent", stroke_width, style, opacity=opacity)
        el.update({
            "type": "arrow" if (arrow_end or arrow_start) else "line",
            "points": [[round(p[0] - x0, 2), round(p[1] - y0, 2)] for p in pts],
            "lastCommittedPoint": None, "startBinding": None, "endBinding": None,
            "startArrowhead": "arrow" if arrow_start else None,
            "endArrowhead": "arrow" if arrow_end else None,
            "elbowed": False,
        })
        self.els.append(el)

        rng = _rng(self._seed(eid))
        dash = ""
        if style == "dashed":
            dash = ' stroke-dasharray="9 7"'
        elif style == "dotted":
            dash = ' stroke-dasharray="2 6" stroke-linecap="round"'
        op = f' opacity="{opacity/100:.2f}"' if opacity != 100 else ""
        d = _rough_polyline(pts, rng, closed=False, passes=2, amp=1.2)
        frag = [f'<g{op}><path d="{d}" fill="none" stroke="{stroke}" stroke-width="{stroke_width}" '
                f'stroke-linecap="round" stroke-linejoin="round"{dash}/>']
        for on, tip, prev in ((arrow_end, pts[-1], pts[-2]), (arrow_start, pts[0], pts[1])):
            if not on:
                continue
            ang = math.atan2(tip[1] - prev[1], tip[0] - prev[0])
            size = 6 + stroke_width * 3
            for s in (-0.42, 0.42):
                bx = tip[0] - size * math.cos(ang + s)
                by = tip[1] - size * math.sin(ang + s)
                frag.append(f'<path d="{_rough_line((bx, by), tip, rng, 0.9)}" fill="none" '
                            f'stroke="{stroke}" stroke-width="{stroke_width}" stroke-linecap="round"/>')
        frag.append("</g>")
        self.draws.append((z, "".join(frag)))

    def arrow(self, pts, **kw):
        kw.setdefault("arrow_end", True)
        return self.line(pts, **kw)

    # ---- connectors between boxes ----
    def connect(self, a, b, color="ink", label=None, style="solid", label_side="right",
                stroke_width=2, gap=8, label_size=14, z=8, bend=None):
        """Orthogonal-ish connector between two boxes (x, y, w, h)."""
        ax, ay, aw, ah = a
        bx, by, bw, bh = b
        acx, acy = ax + aw / 2, ay + ah / 2
        bcx, bcy = bx + bw / 2, by + bh / 2
        vertical = abs(bcy - acy) >= abs(bcx - acx)

        if vertical:
            if bcy > acy:
                p0 = (acx, ay + ah + gap)
                p1 = (bcx, by - gap)
            else:
                p0 = (acx, ay - gap)
                p1 = (bcx, by + bh + gap)
            mid = bend if bend is not None else (p0[1] + p1[1]) / 2
            pts = [p0] if abs(p0[0] - p1[0]) < 1 else [p0, (p0[0], mid), (p1[0], mid)]
            pts.append(p1)
        else:
            if bcx > acx:
                p0 = (ax + aw + gap, acy)
                p1 = (bx - gap, bcy)
            else:
                p0 = (ax - gap, acy)
                p1 = (bx + bw + gap, bcy)
            mid = bend if bend is not None else (p0[0] + p1[0]) / 2
            pts = [p0] if abs(p0[1] - p1[1]) < 1 else [p0, (mid, p0[1]), (mid, p1[1])]
            pts.append(p1)

        self.arrow(pts, color=color, style=style, stroke_width=stroke_width, z=z)
        if label:
            i = len(pts) // 2
            mx = (pts[i - 1][0] + pts[i][0]) / 2
            my = (pts[i - 1][1] + pts[i][1]) / 2
            off = 12
            if label_side == "right":
                self.label(mx + off, my - label_size, label, label_size, "#495057", "left", z=z + 2)
            elif label_side == "left":
                self.label(mx - off, my - label_size, label, label_size, "#495057", "right", z=z + 2)
            elif label_side == "top":
                self.label(mx, my - off - label_size * 1.4, label, label_size, "#495057", "center", z=z + 2)
            else:
                self.label(mx, my + off, label, label_size, "#495057", "center", z=z + 2)
        return pts

    def frame(self, x, y, w, h, title="", color="gray", z=1, style="dashed", tint=None):
        stroke, _ = PALETTE[color]
        eid = self._id("frame")
        el = self._base(eid, x, y, w, h, stroke, tint or "transparent", 1, style, roughness=0)
        el["type"] = "rectangle"
        el["roundness"] = {"type": 3}
        self.els.append(el)
        rng = _rng(self._seed(eid))
        pts = _rounded_rect_pts(x, y, w, h, 16)
        frag = []
        if tint:
            poly = " ".join(f"{p[0]:.2f},{p[1]:.2f}" for p in pts)
            frag.append(f'<polygon points="{poly}" fill="{tint}" stroke="none"/>')
        d = _rough_polyline(pts, rng, closed=True, passes=1, amp=0.8)
        frag.append(f'<path d="{d}" fill="none" stroke="{stroke}" stroke-width="1.5" '
                    f'stroke-dasharray="10 8" stroke-linecap="round"/>')
        self.draws.append((z, "".join(frag)))
        if title:
            self.label(x + 16, y + 12, title, 16, stroke, "left", z=z + 1)
        return (x, y, w, h)

    # ---------- output ----------
    def bounds(self):
        xs, ys, xe, ye = [], [], [], []
        for e in self.els:
            if e["type"] == "text" and e.get("containerId"):
                continue
            if e["type"] in ("arrow", "line"):
                px = [e["x"] + p[0] for p in e["points"]]
                py = [e["y"] + p[1] for p in e["points"]]
                xs.append(min(px)); ys.append(min(py))
                xe.append(max(px)); ye.append(max(py))
            else:
                xs.append(e["x"]); ys.append(e["y"])
                xe.append(e["x"] + e["width"]); ye.append(e["y"] + e["height"])
        if not xs:
            return (0, 0, 100, 100)
        return (min(xs), min(ys), max(xe), max(ye))

    def svg(self, pad=48):
        x0, y0, x1, y1 = self.bounds()
        x0 -= pad; y0 -= pad; x1 += pad; y1 += pad
        w, h = x1 - x0, y1 - y0
        body = "".join(f for _, f in sorted(self.draws, key=lambda t: t[0]))
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.1f} {y0:.1f} {w:.1f} {h:.1f}" '
            f'width="{w:.0f}" height="{h:.0f}" class="board-svg" '
            f'preserveAspectRatio="xMidYMid meet" role="img" '
            f'aria-label="{esc(self.title)}">{body}</svg>'
        )

    def excalidraw(self):
        return {
            "type": "excalidraw",
            "version": 2,
            "source": "whiteboard",
            "elements": self.els,
            "appState": {"gridSize": 20, "viewBackgroundColor": "#ffffff"},
            "files": {},
        }

    def excalidraw_json(self):
        return json.dumps(self.excalidraw(), ensure_ascii=False, indent=0)
