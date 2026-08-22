# skills

Marketplace de plugins de Claude Code de [Lucas Leguizamo](https://lucasleguizamo.com).
Un solo plugin por ahora — `lucas-core` — con las skills y agentes de autoría
propia. Se instala una vez y se actualiza con `/plugin update`, sin copiar
archivos sueltos a `~/.claude`.

## Instalación

```
/plugin marketplace add lucasleguizamo/skills
/plugin install lucas-core@lucas
```

Actualizar:

```
/plugin update lucas-core
```

## Qué incluye `lucas-core` (v0.1.0)

### Skills

| Skill | Qué hace | Cuándo se dispara |
|---|---|---|
| `concat-content` | Artículos de blog SEO para CONCAT en JSX listo para `lib/blog-posts.tsx`, con prompt de imagen | "escribe un post", "crea un artículo para el blog", "qué post sigue" |
| `pm-agent` | Descubrimiento de producto con `AskUserQuestion` → visión, backlog priorizado, PRD o plan de sprint | "hazme un PRD", "arma el backlog", "prioriza estas features" |
| `whiteboard` | Diagramas, flows y wireframes estilo Excalidraw generados por código y publicados en una web privada (nginx + TLS + URL con token) | "hazme un diagrama", "dibuja el flujo", "publícalo en una página" |

### Agentes

| Agente | Rol |
|---|---|
| `skillsmith` | Autoría y curaduría de skills, agentes y plugins con estándar de marketplace |
| `skills-cli` | Construye el CLI `skills` (Node + TypeScript, cero dependencias de runtime) |
| `site-ripper` | Ingeniería inversa de una URL → SPEC de tokens, retícula, motion y copy |
| `site-rebuilder` | Convierte ese SPEC en código real, adaptado al design system del repo destino |

## El CLI

`cli/` está vacío a propósito. El paquete `@lucasleguizamo/skills` (binario
`skills`: `init`, `list`, `sync`, `export`, `doctor`) llega en una fase
posterior. Hoy este repo es sólo marketplace + plugin.

## Curaduría

`AUDIT.md` clasifica todo lo que hay en `~/.claude` en `mine` (autoría propia,
va al plugin), `vendor` (de terceros, sólo se documenta para reinstalarlo) y
`dead` (candidato a borrar). Nada de terceros se republica acá: se referencia
su marketplace de origen.

## Licencia

MIT © 2026 Lucas Leguizamo
