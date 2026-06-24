#!/usr/bin/env bash
# Safe deploy runner for Amarktai Network.
# It does not use set -e, so it keeps going far enough to show a full report.

set -uo pipefail

BASE_URL="${BASE_URL:-https://amarktai.co.za}"
REPO_DIR="${REPO_DIR:-/var/www/amarktai/platform}"
COOKIE_FILE="${COOKIE_FILE:-}"
FAIL=0
WARN=0
PASS=0

section() {
  printf '\n\033[1;36m== %s ==\033[0m\n' "$1"
}

pass() {
  PASS=$((PASS + 1))
  printf '\033[0;32mPASS\033[0m %s\n' "$1"
}

warn() {
  WARN=$((WARN + 1))
  printf '\033[0;33mWARN\033[0m %s\n' "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  printf '\033[0;31mFAIL\033[0m %s\n' "$1"
}

run_required() {
  local label="$1"
  shift
  section "$label"
  "$@"
  local code=$?
  if [[ "$code" -eq 0 ]]; then
    pass "$label"
  else
    fail "$label exited with code $code"
  fi
  return 0
}

run_optional() {
  local label="$1"
  shift
  section "$label"
  "$@"
  local code=$?
  if [[ "$code" -eq 0 ]]; then
    pass "$label"
  else
    warn "$label exited with code $code"
  fi
  return 0
}

section "Start"
printf 'REPO_DIR=%s\nBASE_URL=%s\n' "$REPO_DIR" "$BASE_URL"

if [[ ! -d "$REPO_DIR" ]]; then
  fail "Repo directory not found: $REPO_DIR"
  printf '\nCannot continue without repo directory.\n'
  printf 'PASS=%s WARN=%s FAIL=%s\n' "$PASS" "$WARN" "$FAIL"
  exit 1
fi

cd "$REPO_DIR" || {
  fail "Could not cd into $REPO_DIR"
  printf 'PASS=%s WARN=%s FAIL=%s\n' "$PASS" "$WARN" "$FAIL"
  exit 1
}

run_optional "Current git state" bash -lc 'git status --short && git branch --show-current && git rev-parse --short HEAD'
run_required "Fetch origin main" git fetch origin main
run_required "Reset to origin/main" git reset --hard origin/main
run_required "Install dependencies" npm install
run_required "Build app" npm run build
run_required "Verify standalone server" test -f .next/standalone/server.js

section "Copy standalone static assets"
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
if [[ -d .next/standalone/.next/static ]]; then
  pass "Static assets copied"
else
  fail "Static assets were not copied"
fi

section "Verify static assets at filesystem level"
_css_count=$(find .next/standalone/.next/static/css    -name '*.css' 2>/dev/null | wc -l)
_js_count=$(find  .next/standalone/.next/static/chunks -name '*.js'  2>/dev/null | wc -l)
if [[ "$_css_count" -gt 0 ]]; then
  pass "CSS files in standalone static: $_css_count"
else
  fail "No CSS files found in .next/standalone/.next/static/css — static copy incomplete"
fi
if [[ "$_js_count" -gt 0 ]]; then
  pass "JS chunks in standalone static: $_js_count"
else
  fail "No JS chunks found in .next/standalone/.next/static/chunks — static copy incomplete"
fi

section "Ensure storage directories"
sudo mkdir -p "$REPO_DIR/public/generated-artifacts" \
  "$REPO_DIR/storage/provider-results" \
  "$REPO_DIR/storage/app-ai-packages" \
  "$REPO_DIR/storage/aiva-action-audit"
if [[ "$?" -eq 0 ]]; then
  pass "Storage directories exist"
else
  fail "Could not create storage directories"
fi

sudo chown -R www-data:www-data "$REPO_DIR/public/generated-artifacts" "$REPO_DIR/storage" 2>/dev/null
if [[ "$?" -eq 0 ]]; then
  pass "Storage ownership set"
else
  warn "Storage ownership not changed. Check permissions if artifact writes fail."
fi

run_required "Restart amarktai-web" sudo systemctl restart amarktai-web
run_optional "Service status" sudo systemctl status amarktai-web --no-pager -l
run_optional "Recent service logs" sudo journalctl -u amarktai-web -n 120 --no-pager

section "Verify static assets over HTTP (local Node)"
# Wait up to 30 s for the service to become ready before testing assets.
_node_port="${PORT:-3000}"
_svc_ready=0
for _i in 1 2 3 4 5 6; do
  if curl -sS --max-time 5 -o /dev/null -w '' "http://127.0.0.1:${_node_port}/" 2>/dev/null; then
    _svc_ready=1
    break
  fi
  sleep 5
done
if [[ "$_svc_ready" -eq 0 ]]; then
  fail "Node service did not respond on port $_node_port within 30 s"
fi
_css_asset=$(find .next/standalone/.next/static/css    -name '*.css' 2>/dev/null | head -1 || true)
_js_asset=$(find  .next/standalone/.next/static/chunks -name '*.js'  2>/dev/null | head -1 || true)
_font_asset=$(find .next/standalone/.next/static/media -name '*.woff*' 2>/dev/null | head -1 || true)

_check_http_200() {
  local label="$1"
  local url="$2"
  local code
  code=$(curl -sS --max-time 12 -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    pass "$label → HTTP 200 ($url)"
  else
    fail "$label → HTTP $code (expected 200) — $url"
  fi
}

if [[ -n "$_css_asset" ]]; then
  _css_rel="/_next/static/css/$(basename "$_css_asset")"
  _check_http_200 "Local Node CSS" "http://127.0.0.1:${_node_port}${_css_rel}"
  _check_http_200 "Public CSS" "${BASE_URL}${_css_rel}"
else
  fail "No CSS asset found to test — static copy may have failed"
fi

if [[ -n "$_js_asset" ]]; then
  _js_rel="/_next/static/chunks/$(basename "$_js_asset")"
  _check_http_200 "Local Node JS" "http://127.0.0.1:${_node_port}${_js_rel}"
  _check_http_200 "Public JS" "${BASE_URL}${_js_rel}"
else
  fail "No JS chunk found to test — static copy may have failed"
fi

if [[ -n "$_font_asset" ]]; then
  _font_rel="/_next/static/media/$(basename "$_font_asset")"
  _check_http_200 "Public Font" "${BASE_URL}${_font_rel}"
fi

section "Run final proof"
chmod +x scripts/final_proof.sh
if [[ -n "$COOKIE_FILE" && -f "$COOKIE_FILE" ]]; then
  BASE_URL="$BASE_URL" COOKIE_FILE="$COOKIE_FILE" ./scripts/final_proof.sh
else
  BASE_URL="$BASE_URL" ./scripts/final_proof.sh
fi
proof_code=$?
if [[ "$proof_code" -eq 0 ]]; then
  pass "Final proof script completed"
else
  fail "Final proof script found failures or exited with code $proof_code"
fi

section "Summary"
printf 'PASS=%s WARN=%s FAIL=%s\n' "$PASS" "$WARN" "$FAIL"

if [[ "$FAIL" -gt 0 ]]; then
  printf '\nDeployment/proof completed with failures. Fix the FAIL items above before go-live.\n'
  exit 1
fi

printf '\nDeployment/proof completed with no required failures. Review WARN items before go-live.\n'
exit 0
