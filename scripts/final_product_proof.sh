#!/usr/bin/env bash

BASE_URL="${BASE_URL:-http://localhost:3000}"
COOKIE_FILE="${COOKIE_FILE:-}"

PASS=0
WARN=0
FAIL=0

curl_args=(-sS --max-time 20)
if [ -n "$COOKIE_FILE" ] && [ -f "$COOKIE_FILE" ]; then
  curl_args+=(-b "$COOKIE_FILE")
fi

record() {
  status="$1"
  label="$2"
  detail="$3"
  if [ "$status" = "PASS" ]; then PASS=$((PASS + 1)); fi
  if [ "$status" = "WARN" ]; then WARN=$((WARN + 1)); fi
  if [ "$status" = "FAIL" ]; then FAIL=$((FAIL + 1)); fi
  printf '%s %-44s %s\n' "$status" "$label" "$detail"
}

fetch_path() {
  path="$1"
  curl "${curl_args[@]}" "$BASE_URL$path"
}

check_json() {
  label="$1"
  path="$2"
  body="$(fetch_path "$path" 2>&1)"
  code=$?
  if [ "$code" -ne 0 ]; then
    record FAIL "$label" "curl failed: $body"
    return
  fi
  if printf '%s' "$body" | grep -qi 'Unauthorized'; then
    record FAIL "$label" "401/Unauthorized with supplied cookie"
    return
  fi
  if printf '%s' "$body" | grep -qi 'not wired yet'; then
    record FAIL "$label" "core status still says not wired yet"
    return
  fi
  record PASS "$label" "response received"
  printf '%s' "$body"
}

printf 'Amarktai final product proof\nBASE_URL=%s\n\n' "$BASE_URL"

# ── Static asset checks ───────────────────────────────────────────────────────
STANDALONE_STATIC="${REPO_DIR:-/var/www/amarktai/platform}/.next/standalone/.next/static"

check_static() {
  local label="$1"
  local url="$2"
  local code
  code=$(curl "${curl_args[@]}" -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || echo "000")
  if [[ "$code" == "200" ]]; then
    record PASS "$label" "HTTP 200"
  else
    record FAIL "$label" "HTTP $code (expected 200) — static asset broken"
  fi
}

_pp_css=""
_pp_js=""
_pp_font=""
if [[ -d "$STANDALONE_STATIC" ]]; then
  _pp_css=$(find  "$STANDALONE_STATIC/css"    -name '*.css'   2>/dev/null | head -1 || true)
  _pp_js=$(find   "$STANDALONE_STATIC/chunks" -name '*.js'    2>/dev/null | head -1 || true)
  _pp_font=$(find "$STANDALONE_STATIC/media"  -name '*.woff*' 2>/dev/null | head -1 || true)
fi

if [[ -n "$_pp_css" ]]; then
  check_static "CSS asset HTTP 200" "${BASE_URL}/_next/static/css/$(basename "$_pp_css")"
else
  record FAIL "CSS asset present" ".next/standalone/.next/static/css is empty or missing"
fi

if [[ -n "$_pp_js" ]]; then
  check_static "JS chunk HTTP 200" "${BASE_URL}/_next/static/chunks/$(basename "$_pp_js")"
else
  record FAIL "JS chunk present" ".next/standalone/.next/static/chunks is empty or missing"
fi

if [[ -n "$_pp_font" ]]; then
  check_static "Font asset HTTP 200" "${BASE_URL}/_next/static/media/$(basename "$_pp_font")"
else
  record WARN "Font asset" "No woff* files found in standalone static/media — skipping"
fi

health="$(fetch_path /api/health/ping 2>&1)"
if printf '%s' "$health" | grep -qi 'ok\|healthy\|success'; then
  record PASS "health ping" "/api/health/ping responded"
else
  record FAIL "health ping" "$health"
fi

runtime="$(check_json "runtime truth" /api/admin/runtime-truth)"
readiness="$(check_json "system live readiness" /api/admin/system/live-readiness)"
github="$(check_json "GitHub status" /api/admin/repo-workbench/github/status)"
repos="$(check_json "Repo Workbench repo listing" /api/admin/repo-workbench/github/repos)"
media="$(check_json "Media models" /api/admin/media-studio/models)"
adult="$(check_json "Adult mode status" /api/admin/global-adult-mode)"
tools="$(check_json "Tool registry" /api/admin/tool-registry)"
artifacts="$(check_json "Artifacts storage route" /api/admin/artifacts)"

# ── Phase A — Settings backend ────────────────────────────────────────────────
settings_integrations="$(check_json "Settings integrations" /api/admin/settings/integrations)"
check_json "Settings test-github" /api/admin/settings/test-github >/dev/null
check_json "Settings test-storage" /api/admin/settings/test-storage >/dev/null
check_json "Settings test-webdock" /api/admin/settings/test-webdock >/dev/null
check_json "Settings test-adult" /api/admin/settings/test-adult >/dev/null
check_json "Provider capability test" /api/admin/provider-capability-test >/dev/null

# ── Phase B — Diagnostics ────────────────────────────────────────────────────
check_json "Live readiness endpoint" /api/admin/live-readiness >/dev/null

# ── Phase C — AmarktAI Assistant ─────────────────────────────────────────────
check_json "AmarktAI Assistant context" /api/admin/amarktai-assistant/context >/dev/null
check_json "AmarktAI Assistant memory" /api/admin/amarktai-assistant/memory >/dev/null

# ── Phase D — Memory ─────────────────────────────────────────────────────────
memory_status="$(check_json "Memory status" /api/admin/memory)"
check_json "Memory manage" /api/admin/memory/manage >/dev/null

# ── Phase E — Apps ───────────────────────────────────────────────────────────
check_json "Apps list" /api/admin/apps >/dev/null
check_json "App profiles" /api/admin/app-profiles >/dev/null
check_json "App AI package" /api/admin/app-ai-package >/dev/null

# ── Phase F — Agents ─────────────────────────────────────────────────────────
check_json "Agent registry" /api/admin/agents >/dev/null
check_json "App agents" /api/admin/app-agents >/dev/null
check_json "Tool registry" /api/admin/tool-registry >/dev/null

# ── Phase G — Repo Workbench ─────────────────────────────────────────────────
check_json "Repo Workbench status" /api/admin/repo-workbench/status >/dev/null

# ── Phase H — Research ───────────────────────────────────────────────────────
check_json "Research jobs" /api/admin/research/jobs >/dev/null

# ── Phase I — Artifacts ──────────────────────────────────────────────────────
check_json "Artifacts media" /api/admin/artifacts/media >/dev/null

# ── Phase J — Approvals ──────────────────────────────────────────────────────
check_json "Approvals queue" /api/admin/approvals >/dev/null

# ── Phase K — VPS ────────────────────────────────────────────────────────────
check_json "VPS status" /api/admin/vps >/dev/null

# ── Phase L — App Safety ─────────────────────────────────────────────────────
check_json "App safety policy" /api/admin/app-safety >/dev/null

if printf '%s' "$runtime" | grep -qi '"github".*"configured":true' && printf '%s' "$github" | grep -qi 'No token\|not configured\|missing'; then
  record FAIL "GitHub truth consistency" "runtime/settings connected but repo workbench token missing"
else
  record PASS "GitHub truth consistency" "no connected/missing mismatch detected"
fi

if printf '%s' "$adult" | grep -qi 'separate key\|specialist key required'; then
  record FAIL "Adult provider reuse" "adult mode still requires a separate key"
else
  record PASS "Adult provider reuse" "adult mode reports configured provider/status instead of separate-key block"
fi

repo_page="$(fetch_path /admin/dashboard/repo-workbench 2>&1)"
for label in "GitHub connection status" "Repo selector" "Tell AmarktAI Assistant what to change" "Plan" "Generate diff" "Apply patch" "Run lint" "Commit" "Create PR" "Logs panel"; do
  if printf '%s' "$repo_page" | grep -q "$label"; then
    record PASS "Repo page label: $label" "present"
  else
    record FAIL "Repo page label: $label" "missing"
  fi
done

if printf '%s' "$repo_page" | grep -qiE 'AGENT_PRESETS|GenX Best|GitHub PAT|ENABLE_DEPLOY_ACTIONS|Safe Repo Workbench Test'; then
  record FAIL "Repo page: no legacy strings" "legacy workbench strings found in canonical workbench"
else
  record PASS "Repo page: no legacy strings" "legacy strings absent"
fi

if grep -RIn --exclude-dir=node_modules --exclude-dir=.next "repo-workbench/simple" src scripts docs >/dev/null 2>&1; then
  record FAIL "/simple route eliminated" "references to /admin/dashboard/repo-workbench/simple still exist"
else
  record PASS "/simple route eliminated" "no references to /simple route found"
fi

command_center="$(fetch_path /admin/dashboard/command-center 2>&1)"
if printf '%s' "$command_center" | grep -qi 'AmarktAI Assistant\|Command Center'; then
  record PASS "Command Center page" "real content detected"
else
  record FAIL "Command Center page" "expected operator content missing"
fi

if printf '%s\n%s\n%s\n%s' "$command_center" "$repo_page" "$tools" "$readiness" | grep -qi 'not wired yet'; then
  record FAIL "No core not-wired messaging" "phrase found in protected product surfaces"
else
  record PASS "No core not-wired messaging" "phrase not present"
fi

printf '\nSUMMARY PASS=%s WARN=%s FAIL=%s\n' "$PASS" "$WARN" "$FAIL"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
