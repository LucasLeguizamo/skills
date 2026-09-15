#!/usr/bin/env bash
# Writes one version into every manifest listed in .version-bump.json, so a
# harness never installs stale metadata. Usage: ./scripts/bump-version.sh 0.3.0
set -euo pipefail
cd "$(dirname "$0")/.."

version="${1:-}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || {
  echo "usage: bump-version.sh <major.minor.patch>" >&2; exit 2; }

VERSION="$version" python3 - <<'PY'
import json, os

version = os.environ["VERSION"]
spec = json.load(open(".version-bump.json"))

for entry in spec["files"]:
    path, field = entry["path"], entry["field"]
    doc = json.load(open(path))
    node, parts = doc, field.split(".")
    for part in parts[:-1]:
        node = node[int(part)] if part.isdigit() else node[part]
    last = parts[-1]
    key = int(last) if last.isdigit() else last
    if node[key] == version:
        print(f"  unchanged  {path}")
        continue
    node[key] = version
    with open(path, "w") as fh:
        json.dump(doc, fh, indent=2, ensure_ascii=False)
        fh.write("\n")
    print(f"  wrote      {path}")

print(f"All manifests at {version}. Regenerate the feed: node cli/dist/index.js export")
PY
