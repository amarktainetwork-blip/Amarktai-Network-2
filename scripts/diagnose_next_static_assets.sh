#!/usr/bin/env bash
# ─── AmarktAI Network — Next.js static asset delivery diagnostic ─────────────
#
# Usage (run on the production server):
#   bash scripts/diagnose_next_static_assets.sh
#
# Optional overrides:
#   PORT=3000 REPO_DIR=/var/www/amarktai/platform bash scripts/diagnose_next_static_assets.sh
#
# Exit code: 0 = all required checks passed, nonzero = at least one failure.

set -uo pipefail

PORT="${PORT:-3000}"
REPO_DIR="${REPO_DIR:-/var/www/amarktai/platform}"
BASE_URL="${BASE_URL:-https://amarktai.co.za}"

_DIAG_TMP=$(mktemp /tmp/_diag_body.XXXXXX)
trap 'rm -f "$_DIAG_TMP"' EXIT

PASS=0
FAIL=0
WARN=0

section() { printf '\n\033[1;36m=== %s ===\033[0m\n' "$1"; }
pass()    { PASS=$((PASS+1)); printf '\033[0;32mPASS\033[0m %s\n' "$1"; }
fail()    { FAIL=$((FAIL+1)); printf '\033[0;31mFAIL\033[0m %s\n' "$1"; }
warn()    { WARN=$((WARN+1)); printf '\033[0;33mWARN\033[0m %s\n' "$1"; }

# ── Git info ─────────────────────────────────────────────────────────────────
section "Git info"
if git -C "$REPO_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
  printf 'Branch : %s\n' "$(git -C "$REPO_DIR" branch --show-current 2>/dev/null || echo unknown)"
  printf 'SHA    : %s\n' "$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || echo unknown)"
else
  warn "Not inside a git work tree: $REPO_DIR"
fi

# ── Next.js config summary ────────────────────────────────────────────────────
section "Next.js config"
for cfg in next.config.mjs next.config.js next.config.ts; do
  f="$REPO_DIR/$cfg"
  if [[ -f "$f" ]]; then
    printf 'Found: %s\n' "$f"
    cat "$f"
    break
  fi
done
if [[ -f "$REPO_DIR/package.json" ]]; then
  printf '\npackage.json scripts:\n'
  grep -A10 '"scripts"' "$REPO_DIR/package.json" || true
fi

# ── Systemd service file ──────────────────────────────────────────────────────
section "Systemd service: amarktai-web"
if command -v systemctl &>/dev/null; then
  systemctl cat amarktai-web 2>/dev/null || warn "systemctl cat amarktai-web failed (not installed or different name)"
  printf '\nService status:\n'
  systemctl status amarktai-web --no-pager -l 2>/dev/null || true
else
  warn "systemctl not available on this machine"
fi

# ── Nginx config (filtered) ───────────────────────────────────────────────────
section "Nginx config (amarktai / _next sections)"
if command -v nginx &>/dev/null; then
  nginx -T 2>/dev/null | grep -B5 -A30 -E 'amarktai|_next/static|proxy_pass.*3000' | head -120 || true
else
  warn "nginx binary not found"
fi

# ── Filesystem: .next/static ─────────────────────────────────────────────────
section "Filesystem: $REPO_DIR/.next/static"
if [[ -d "$REPO_DIR/.next/static" ]]; then
  pass ".next/static directory exists"
  printf 'CSS files  : %s\n' "$(find "$REPO_DIR/.next/static/css"    -name '*.css'  2>/dev/null | wc -l)"
  printf 'JS  chunks : %s\n' "$(find "$REPO_DIR/.next/static/chunks" -name '*.js'   2>/dev/null | wc -l)"
  printf 'Font files : %s\n' "$(find "$REPO_DIR/.next/static/media"  -name '*.woff*' 2>/dev/null | wc -l)"
  find "$REPO_DIR/.next/static" -type f | head -10
else
  fail ".next/static directory NOT found at $REPO_DIR/.next/static"
fi

# ── Filesystem: .next/standalone/.next/static ────────────────────────────────
section "Filesystem: $REPO_DIR/.next/standalone/.next/static"
STANDALONE_STATIC="$REPO_DIR/.next/standalone/.next/static"
if [[ -d "$STANDALONE_STATIC" ]]; then
  pass ".next/standalone/.next/static directory exists"

  CSS_COUNT=$(find "$STANDALONE_STATIC/css"    -name '*.css'   2>/dev/null | wc -l)
  JS_COUNT=$(find  "$STANDALONE_STATIC/chunks" -name '*.js'    2>/dev/null | wc -l)
  FONT_COUNT=$(find "$STANDALONE_STATIC/media" -name '*.woff*' 2>/dev/null | wc -l)

  printf 'CSS files  : %s\n' "$CSS_COUNT"
  printf 'JS  chunks : %s\n' "$JS_COUNT"
  printf 'Font files : %s\n' "$FONT_COUNT"

  if [[ "$CSS_COUNT" -gt 0 ]]; then
    pass "At least one CSS file found in standalone static"
  else
    fail "No CSS files found in $STANDALONE_STATIC/css"
  fi

  if [[ "$JS_COUNT" -gt 0 ]]; then
    pass "At least one JS chunk found in standalone static"
  else
    fail "No JS chunk files found in $STANDALONE_STATIC/chunks"
  fi

  find "$STANDALONE_STATIC" -type f | head -10
else
  fail ".next/standalone/.next/static NOT found — static copy was not run or failed"
fi

# ── Pick representative assets ────────────────────────────────────────────────
CSS_FILE=$(find "$STANDALONE_STATIC/css"    -name '*.css'   2>/dev/null | head -1 || true)
JS_FILE=$(find  "$STANDALONE_STATIC/chunks" -name '*.js'    2>/dev/null | head -1 || true)
FONT_FILE=$(find "$STANDALONE_STATIC/media" -name '*.woff*' 2>/dev/null | head -1 || true)

# ── Local Node HTTP checks ────────────────────────────────────────────────────
section "Local Node HTTP checks (port $PORT)"

check_local() {
  local label="$1"
  local rel_path="$2"
  local url="http://127.0.0.1:${PORT}${rel_path}"
  local code
  printf 'Testing: %s\n' "$url"
  code=$(curl -sS --max-time 10 -o "$_DIAG_TMP" -w '%{http_code}' "$url" 2>/dev/null || echo "000")
  printf 'HTTP %s\n' "$code"
  if [[ "$code" == "200" ]]; then
    pass "Local Node: $label → HTTP 200"
  else
    fail "Local Node: $label → HTTP $code (expected 200)"
    sed -n '1,5p' "$_DIAG_TMP" 2>/dev/null || true
    printf 'Full response headers:\n'
    curl -sS --max-time 10 -I "http://127.0.0.1:${PORT}${rel_path}" 2>/dev/null || true
  fi
}

if [[ -n "$CSS_FILE" ]]; then
  check_local "CSS asset" "/_next/static/css/$(basename "$CSS_FILE")"
else
  warn "No CSS file found to test locally"
fi

if [[ -n "$JS_FILE" ]]; then
  check_local "JS chunk" "/_next/static/chunks/$(basename "$JS_FILE")"
else
  warn "No JS chunk found to test locally"
fi

if [[ -n "$FONT_FILE" ]]; then
  check_local "Font asset" "/_next/static/media/$(basename "$FONT_FILE")"
else
  warn "No font file found to test locally"
fi

# ── Public domain HTTP checks ─────────────────────────────────────────────────
section "Public domain HTTP checks ($BASE_URL)"

check_public() {
  local label="$1"
  local rel_path="$2"
  local url="${BASE_URL}${rel_path}"
  local code
  printf 'Testing: %s\n' "$url"
  code=$(curl -sS --max-time 15 -o "$_DIAG_TMP" -w '%{http_code}' "$url" 2>/dev/null || echo "000")
  printf 'HTTP %s\n' "$code"
  if [[ "$code" == "200" ]]; then
    pass "Public: $label → HTTP 200"
  else
    fail "Public: $label → HTTP $code (expected 200)"
    sed -n '1,5p' "$_DIAG_TMP" 2>/dev/null || true
    printf 'Full response headers:\n'
    curl -sS --max-time 15 -I "${BASE_URL}${rel_path}" 2>/dev/null || true
  fi
}

if [[ -n "$CSS_FILE" ]]; then
  check_public "CSS asset" "/_next/static/css/$(basename "$CSS_FILE")"
else
  warn "No CSS file found to test against $BASE_URL"
fi

if [[ -n "$JS_FILE" ]]; then
  check_public "JS chunk" "/_next/static/chunks/$(basename "$JS_FILE")"
else
  warn "No JS chunk found to test against $BASE_URL"
fi

if [[ -n "$FONT_FILE" ]]; then
  check_public "Font asset" "/_next/static/media/$(basename "$FONT_FILE")"
else
  warn "No font file found to test against $BASE_URL"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
section "Summary"
printf 'PASS=%s WARN=%s FAIL=%s\n' "$PASS" "$WARN" "$FAIL"

if [[ "$FAIL" -gt 0 ]]; then
  printf '\n\033[0;31mDIAGNOSIS: %s check(s) failed. See FAIL lines above.\033[0m\n' "$FAIL"
  printf '\nCommon causes:\n'
  printf '  1. .next/standalone/.next/static was not populated (run deploy script)\n'
  printf '  2. Nginx returns 400 for /_next/static/ (check nginx -T for bad location blocks)\n'
  printf '  3. Node is not running or crashed (check: systemctl status amarktai-web)\n'
  printf '  4. Middleware intercepting /_next/static (check src/middleware.ts matcher)\n'
  exit 1
fi

printf '\n\033[0;32mAll diagnostic checks passed.\033[0m\n'
exit 0
