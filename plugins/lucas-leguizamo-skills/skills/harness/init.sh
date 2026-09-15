#!/usr/bin/env bash
# Installs the harness (AGENTS.md, PR template, labels, checks) into a repo.
# Idempotent: never overwrites a file that already exists.
#
#   init.sh <repo> [--dry-run] [--check]
#
# --check writes nothing: lists what is missing and exits 1 if anything is.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
tpl="$here/templates"
target="${1:-}"
mode=install
for arg in "${@:2}"; do
  case "$arg" in
    --dry-run) mode=dry ;;
    --check)   mode=check ;;
    *) echo "unknown flag: $arg" >&2; exit 2 ;;
  esac
done

[ -n "$target" ] && [ -d "$target" ] || { echo "usage: init.sh <repo> [--dry-run|--check]" >&2; exit 2; }
target="$(cd "$target" && pwd)"
[ -d "$target/.git" ] || echo "warning: $target is not a git repo; labels and checks assume git."

missing=0

# put <path-under-templates> <path-under-the-repo>
put() {
  local src="$tpl/$1" dst="$target/$2"
  if [ -e "$dst" ]; then
    printf '  exists   %s\n' "$2"
    return 0
  fi
  missing=$((missing + 1))
  case "$mode" in
    check|dry) printf '  MISSING  %s\n' "$2" ;;
    install)
      mkdir -p "$(dirname "$dst")"
      cp "$src" "$dst"
      [ "${src##*.}" = sh ] && chmod +x "$dst"
      printf '  wrote    %s\n' "$2"
      ;;
  esac
}

echo "Harness -> $target  [$mode]"
put AGENTS.md                    AGENTS.md
put CLAUDE.md                    CLAUDE.md
put GEMINI.md                    GEMINI.md
put pull_request_template.md     .github/pull_request_template.md
put labels.yml                   .github/labels.yml
put labeler.yml                  .github/labeler.yml
put workflows/pr-labels.yml      .github/workflows/pr-labels.yml
put scripts/check-filenames.sh   scripts/check-filenames.sh
put scripts/check-api-docs.sh    scripts/check-api-docs.sh
put scripts/check-secrets.sh     scripts/check-secrets.sh
put scripts/check-package-manager.sh scripts/check-package-manager.sh
put scripts/sync-labels.sh       scripts/sync-labels.sh
put claude-settings.json         .claude/settings.json
put mcp.json                     .mcp.json

if [ -f "$target/.claude/settings.json" ] && ! grep -q check-api-docs "$target/.claude/settings.json"; then
  echo
  echo "  .claude/settings.json exists without the API-contract hook. Add:"
  sed 's/^/    /' "$tpl/claude-settings.json"
fi

if [ -f "$target/.mcp.json" ] && ! grep -q '"engram"' "$target/.mcp.json"; then
  echo
  echo "  .mcp.json exists without engram. Memory needs this server; add:"
  sed 's/^/    /' "$tpl/mcp.json"
fi

if [ "$mode" = check ]; then
  [ "$missing" -eq 0 ] && { echo "Harness complete."; exit 0; }
  echo "$missing harness pieces missing."
  exit 1
fi

cat <<TXT

Next:
  1. Fill in the <TODO>s in AGENTS.md — a contract with <TODO> in it is one nobody follows.
  2. Adjust the globs in .github/labeler.yml, and the engram project name in .mcp.json.
  3. gh auth status && ./scripts/sync-labels.sh   (creates the labels on GitHub)
  4. Branch protection on main: require PR - 1 approval - Code Owners - apply to admins.
  5. ./scripts/check-filenames.sh && ./scripts/check-api-docs.sh && ./scripts/check-secrets.sh && ./scripts/check-package-manager.sh
TXT
