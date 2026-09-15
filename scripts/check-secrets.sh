#!/usr/bin/env bash
# No real secret ever enters the repo. Scans everything git would let you commit
# (tracked plus untracked-but-not-ignored) for the shapes a leaked credential
# takes. See AGENTS.md sections 5 and 8.
set -euo pipefail
cd "$(dirname "$0")/.."

offenders=()

# A tracked .env is never allowed, placeholders included.
while IFS= read -r f; do
  case "${f##*/}" in
    .env|.env.local|.env.production) offenders+=("$f: a real env file must never be tracked (use .env.example)") ;;
  esac
done < <(git ls-files --cached)

# Candidates: no lockfiles, no .md (docs show placeholders on purpose), no
# binaries, and not this script itself (its regexes spell out the patterns).
files=()
while IFS= read -r -d '' f; do
  [[ -f "$f" ]] || continue
  base="${f##*/}"; ext="${f##*.}"
  [[ "$base" == pnpm-lock.yaml || "$base" == package-lock.json ]] && continue
  [[ "$ext" == md ]] && continue
  [[ "$f" == scripts/check-secrets.sh ]] && continue
  # Vendored third-party skills and agents: not ours to police, and their
  # bundled assets carry base64 blobs that look like tokens.
  [[ "$f" == .agents/* || "$f" == .claude/skills/* || "$f" == .devin/* ]] && continue
  case "$ext" in png|jpg|jpeg|gif|webp|svg|ico|pdf|woff|woff2|ttf|mp4|mov|avif) continue ;; esac
  files+=("$f")
done < <(git ls-files --cached --others --exclude-standard -z)

if ((${#files[@]})); then
  # Postgres URL with a password that is not a placeholder
  while IFS=: read -r file lineno content; do
    if [[ "$content" =~ postgres(ql)?://[^:@[:space:]/]+:([^@[:space:]/]*)@ ]]; then
      pass="${BASH_REMATCH[2]}"
      # Placeholders: postgres:postgres, CAMBIAR, ..., <password>, [password],
      # ${VAR}, or any spelling of the word itself.
      case "$pass" in
        postgres|test|CAMBIAR|...|\<*\>|\[*\]|'$'*|*[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd]*) ;;
        *) offenders+=("$file:$lineno: postgres URL with a non-placeholder password") ;;
      esac
    fi
  done < <(grep -nEI 'postgres(ql)?://[^:@[:space:]/]+:[^@[:space:]/]*@' "${files[@]}" 2>/dev/null || true)

  # scan <regex> <message> [reject-regex]
  # A line matching reject-regex is skipped: that is how an .env.example keeps its
  # empty KEY="" lines without tripping the check.
  scan() {
    while IFS=: read -r file lineno content; do
      [ -n "${3:-}" ] && grep -qE "$3" <<<"$content" && continue
      offenders+=("$file:$lineno: $2")
    done < <(grep -nEI "$1" "${files[@]}" 2>/dev/null || true)
  }
  scan 'sk-(or-|ant-)?[A-Za-z0-9_-]{16,}'        'looks like a provider API key (sk-/sk-or-/sk-ant-)'
  scan 'eyJ[A-Za-z0-9_=+./-]{40,}'               'eyJ... string long enough to be a real JWT'
  # A value only counts as a secret when it looks like one: 16+ characters of
  # credential alphabet and nothing else. An .env.example saying
  # KEY="generate one with: openssl rand -base64 32" is instruction, not a leak.
  scan '_SECRET=.?[A-Za-z0-9+/=_-]{16,}.?$' 'a *_SECRET with a value committed to the repo'
  scan 'SERVICE_ROLE_KEY=.?[A-Za-z0-9+/=_.-]{16,}.?$' 'service-role key committed (defeats every tenant boundary)'
fi

if ((${#offenders[@]})); then
  echo "Possible secrets found:" >&2
  printf '  %s\n' "${offenders[@]}" >&2
  exit 1
fi
echo "Secrets OK."
