#!/usr/bin/env bash
# Every harness manifest carries the same version. One source, many manifests:
# a manifest that falls behind ships stale metadata to that harness forever,
# because nothing else compares them. See AGENTS.md section 6.
set -euo pipefail
cd "$(dirname "$0")/.."

python3 - <<'PY'
import json, sys

spec = json.load(open(".version-bump.json"))
seen = {}
for entry in spec["files"]:
    path, field = entry["path"], entry["field"]
    try:
        doc = json.load(open(path))
    except FileNotFoundError:
        print(f"  {path}: listed in .version-bump.json but missing", file=sys.stderr)
        sys.exit(1)
    for part in field.split("."):
        doc = doc[int(part)] if part.isdigit() else doc[part]
    seen.setdefault(doc, []).append(path)

if len(seen) > 1:
    print("Manifest versions disagree (AGENTS.md section 6):", file=sys.stderr)
    for version, paths in sorted(seen.items()):
        for p in paths:
            print(f"  {version}  {p}", file=sys.stderr)
    print("Fix with: ./scripts/bump-version.sh <version>", file=sys.stderr)
    sys.exit(1)

version = next(iter(seen))
print(f"Versions OK: {len(spec['files'])} manifests all at {version}.")
PY
