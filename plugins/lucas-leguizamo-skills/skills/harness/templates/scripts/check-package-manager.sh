#!/usr/bin/env bash
# pnpm, always. One lockfile is the source of truth for what gets installed —
# CI, the host and every machine resolve from it. A second lockfile from another
# package manager resolves different versions of the same dependency tree, and
# the one that wins is whichever tool the next person happens to run.
# See AGENTS.md section 4.
set -euo pipefail
cd "$(dirname "$0")/.."

offenders=()
while IFS= read -r f; do
  case "${f##*/}" in
    package-lock.json) offenders+=("$f: npm lockfile — pnpm is the package manager (pnpm import, then delete it)") ;;
    yarn.lock)         offenders+=("$f: yarn lockfile — pnpm is the package manager (pnpm import, then delete it)") ;;
    npm-shrinkwrap.json) offenders+=("$f: npm shrinkwrap — pnpm is the package manager") ;;
  esac
done < <(git ls-files)

# A package.json that drives itself with npm or yarn in its own scripts sends
# every contributor back to the wrong tool.
while IFS=: read -r file lineno _; do
  offenders+=("$file:$lineno: a script calls npm/yarn — use pnpm")
done < <(git ls-files '*package.json' | xargs grep -nE '"[^"]*":[[:space:]]*"[^"]*\b(npm run|npm ci|npm install|yarn )' /dev/null 2>/dev/null || true)

if ((${#offenders[@]})); then
  echo "Package manager is pnpm (AGENTS.md section 4):" >&2
  printf '  %s\n' "${offenders[@]}" >&2
  exit 1
fi
echo "Package manager OK: pnpm only."
