#!/usr/bin/env bash
# Creates or updates the repo's labels from .github/labels.yml, so the labels
# every PR must carry actually exist. Idempotent — run it after editing the file.
# Requires the GitHub CLI, authenticated: gh auth status
set -euo pipefail
cd "$(dirname "$0")/.."

file=".github/labels.yml"
name="" color="" description=""

unquote() { local v=$1; v=${v%\"}; v=${v#\"}; printf '%s' "$v"; }

flush() {
  [[ -z "$name" ]] && return 0
  gh label create "$name" --color "$color" --description "$description" --force >/dev/null
  echo "  $name"
  name="" color="" description=""
}

echo "Syncing labels from $file"
while IFS= read -r line; do
  case "$line" in
    "- name: "*)        flush; name=$(unquote "${line#- name: }") ;;
    "  color: "*)       color=$(unquote "${line#  color: }") ;;
    "  description: "*) description=$(unquote "${line#  description: }") ;;
  esac
done < "$file"
flush

echo "Labels in sync."
