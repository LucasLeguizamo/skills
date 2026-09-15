#!/usr/bin/env bash
# Every public surface ships its contract beside it: route.ts -> route.md.
# Colocated on purpose: a doc that lives elsewhere drifts. See AGENTS.md section 6.
set -euo pipefail
cd "$(dirname "$0")/.."

missing=()
while IFS= read -r route; do
  [ -f "${route%.*}.md" ] || missing+=("${route%.*}.md")
done < <(find . -path ./node_modules -prune -o -path '*/api/*' -name 'route.ts' -print 2>/dev/null)

if ((${#missing[@]})); then
  echo "API routes without a contract (AGENTS.md section 6):" >&2
  printf '  missing %s\n' "${missing[@]}" >&2
  exit 1
fi
echo "API contracts OK."
