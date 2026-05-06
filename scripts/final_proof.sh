#!/usr/bin/env bash
set -Eeuo pipefail

BASE_URL="${BASE_URL:-https://amarktai.com}"
COOKIE_FILE="${COOKIE_FILE:-}"
TIMEOUT="${TIMEOUT:-25}"

PASS=0
FAIL=0
WARN=0

section() {
  printf '\n\033[1;36m== %s ==\033[0m\n' "$1"
}

ok() {
  PASS=$((PASS + 1))
  printf '\033[0;32mPASS\033[0m %s\n' "$1"
}

fail() {
  FAIL=$((FAIL + 1))
  printf '\033[0;31mFAIL\033[0m %s\n' "$1"
}

warn() {
  WARN=$((WARN + 1))
  printf '\033[0;33mWARN\033[0m %s\n' "$1"
}

curl_args=(-sS --max-time "$TIMEOUT")
if [[ -n "$COOKIE_FILE" && -f "$COOKIE_FILE" ]]; then
  curl_args+=(--cookie "$COOKIE_FILE")
fi

check_public_route() {
  local path="$1"
  local name="$2"
  local code
  code=$(curl "${curl_args[@]}" -o /tmp/amarktai-proof-body.txt -w '%{http_code}' "$BASE_URL$path" || true)
  if [[ "$code" =~ ^(200|301|302|307|308)$ ]]; then
    ok "$name returned HTTP $code"
  else
    fail "$name returned HTTP $code"
    sed -n '1,12p' /tmp/amarktai-proof-body.txt || true
  fi
}

check_admin_json() {
  local path="$1"
  local name="$2"
  local code
  code=$(curl "${curl_args[@]}" -H 'Accept: application/json' -o /tmp/amarktai-proof-json.txt -w '%{http_code}' "$BASE_URL$path" || true)
  if [[ "$code" == "200" ]]; then
    ok "$name returned JSON HTTP 200"
    if command -v jq >/dev/null 2>&1; then
      jq 'del(.raw)' /tmp/amarktai-proof-json.txt | head -80 || true
    else
      sed -n '1,20p' /tmp/amarktai-proof-json.txt || true
    fi
  elif [[ "$code" == "401" || "$code" == "403" ]]; then
    warn "$name requires admin auth HTTP $code. Re-run with COOKIE_FILE=/path/to/cookies.txt"
  else
    fail "$name returned HTTP $code"
    sed -n '1,20p' /tmp/amarktai-proof-json.txt || true
  fi
}

check_static_asset() {
  local path="$1"
  local name="$2"
  local code
  code=$(curl "${curl_args[@]}" -o /dev/null -w '%{http_code}' "$BASE_URL$path" || true)
  if [[ "$code" == "200" ]]; then
    ok "$name returned HTTP 200"
  else
    fail "$name returned HTTP $code (expected 200) — static asset broken"
  fi
}

section "Public website"
check_public_route "/" "Homepage"
check_public_route "/admin/login" "Admin login"

section "Dashboard routes"
check_public_route "/admin/dashboard" "Dashboard redirect"
check_public_route "/admin/dashboard/command-center" "Command Center"
check_public_route "/admin/dashboard/live-readiness" "Live Readiness page"
check_public_route "/admin/dashboard/ai-engine/hub" "AI Engine hub"
check_public_route "/admin/dashboard/repo-workbench" "Repo Workbench canonical"

section "Admin APIs"
check_admin_json "/api/admin/live-readiness" "Live readiness API"
check_admin_json "/api/admin/provider-scores?appSlug=amarktai-network&days=14" "Provider scores API"
check_admin_json "/api/admin/artifacts/media?appSlug=amarktai-network&limit=20" "Media artifacts API"
check_admin_json "/api/admin/app-ai-package" "App AI packages API"
check_admin_json "/api/admin/AmarktAI Assistant/actions" "AmarktAI Assistant actions API"
check_admin_json "/api/admin/AmarktAI Assistant/action-execute?days=7" "AmarktAI Assistant action audit API"

section "Next.js static assets"
# Discover built CSS/JS/font assets from the standalone static directory and
# verify each returns HTTP 200 through the public BASE_URL.
STANDALONE_STATIC="${REPO_DIR:-/var/www/amarktai/repo}/.next/standalone/.next/static"

_proof_css=""
_proof_js=""
_proof_font=""

if [[ -d "$STANDALONE_STATIC" ]]; then
  _proof_css=$(find "$STANDALONE_STATIC/css"    -name '*.css'   2>/dev/null | head -1 || true)
  _proof_js=$(find  "$STANDALONE_STATIC/chunks" -name '*.js'    2>/dev/null | head -1 || true)
  _proof_font=$(find "$STANDALONE_STATIC/media" -name '*.woff*' 2>/dev/null | head -1 || true)
fi

if [[ -n "$_proof_css" ]]; then
  check_static_asset "/_next/static/css/$(basename "$_proof_css")" "CSS asset"
else
  fail "No built CSS asset found — .next/standalone/.next/static/css is empty or missing"
fi

if [[ -n "$_proof_js" ]]; then
  check_static_asset "/_next/static/chunks/$(basename "$_proof_js")" "JS chunk"
else
  fail "No built JS chunk found — .next/standalone/.next/static/chunks is empty or missing"
fi

if [[ -n "$_proof_font" ]]; then
  check_static_asset "/_next/static/media/$(basename "$_proof_font")" "Font asset"
else
  warn "No font file found in standalone static/media — skipping font check"
fi

section "Local service hints"
if command -v systemctl >/dev/null 2>&1; then
  systemctl is-active --quiet amarktai-web && ok "amarktai-web service active" || warn "amarktai-web service not active or not present"
fi

if [[ -d /var/www/amarktai/repo ]]; then
  ok "Repo directory exists: /var/www/amarktai/repo"
  sudo find /var/www/amarktai/repo/public/generated-artifacts -type f 2>/dev/null | tail -5 || true
else
  warn "Repo directory /var/www/amarktai/repo not found on this machine"
fi

section "Summary"
printf 'PASS=%s WARN=%s FAIL=%s\n' "$PASS" "$WARN" "$FAIL"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi

exit 0
