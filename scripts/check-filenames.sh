#!/usr/bin/env bash
# Fails if a tracked file breaks the naming convention in AGENTS.md section 3.
# Rule: kebab-case ASCII, lowercase. Exceptions: React components
# (PascalCase.tsx), hooks and utils (camelCase.ts), and the names another tool
# fixes for us.
set -euo pipefail
cd "$(dirname "$0")/.."

# ponytail: a ratchet. Legacy names listed in scripts/filenames-debt.txt are
# tolerated; delete a line when you rename it. Never add one.
debt_file="scripts/filenames-debt.txt"

offenders=()
while IFS= read -r path; do
  case "$path" in
    .claude/*|.agents/*|.devin/*) continue ;;             # vendored or tool-owned
  esac
  grep -qxF "$path" "$debt_file" 2>/dev/null && continue
  name="${path##*/}"
  case "$name" in
    README.md|AGENTS.md|CLAUDE.md|GEMINI.md|SKILL.md|pull_request_template.md|CODEOWNERS|LICENSE|CHANGELOG.md|SECURITY.md|CONTRIBUTING.md|Makefile) continue ;;  # names another tool fixes
  esac
  # A skill folder's own docs follow SKILL.md: skills/<name>/UPPERCASE.md
  if [[ "$path" =~ (^|/)skills/[^/]+/[A-Z][A-Z0-9_-]*\.md$ ]]; then continue; fi
  # React component: PascalCase.tsx
  if [[ "$name" =~ ^[A-Z][A-Za-z0-9]*\.tsx$ ]]; then continue; fi
  # Hook or util: camelCase.ts / camelCase.tsx
  if [[ "$name" =~ ^[a-z][a-zA-Z0-9]*\.tsx?$ ]]; then continue; fi
  # General rule (dotfiles allowed)
  if [[ "$name" =~ ^\.?[a-z0-9][a-z0-9._-]*$ ]]; then continue; fi
  offenders+=("$path")
done < <(git ls-files)

if ((${#offenders[@]})); then
  echo "Filenames outside the convention (AGENTS.md section 3):" >&2
  printf '  %s\n' "${offenders[@]}" >&2
  exit 1
fi
owed=$(grep -cvE '^\s*(#|$)' "$debt_file" 2>/dev/null || echo 0)
echo "Filenames OK: $(git ls-files | wc -l | tr -d ' ') tracked files, $owed legacy names still owed."
