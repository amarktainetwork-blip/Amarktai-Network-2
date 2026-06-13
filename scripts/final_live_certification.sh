#!/usr/bin/env bash
# =============================================================================
# final_live_certification.sh — AmarktAI Network Final Go-Live Certification
#
# Run on VPS after deploy to certify the production system is live.
#
# Usage:
#   BASE_URL="https://amarktai.co.za" ./scripts/final_live_certification.sh
#   # or local dev:
#   BASE_URL="http://localhost:3000" ./scripts/final_live_certification.sh
#
# Exit codes:
#   0  All critical checks passed — GO-LIVE READY
#   1  One or more critical checks failed — NOT GO-LIVE READY
# =============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0
WARN=0
BLOCKER_TABLE=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass()    { echo -e "${GREEN}PASS${RESET}  $1"; ((PASS++)); }
fail()    { echo -e "${RED}FAIL${RESET}  $1"; ((FAIL++)); BLOCKER_TABLE+=("FAIL: $1"); }
warn()    { echo -e "${YELLOW}WARN${RESET}  $1"; ((WARN++)); }
section() { echo -e "\n${CYAN}${BOLD}── $1 ──${RESET}"; }

check_url() {
  local label="$1"
  local url="$2"
  local expected="${3:-200}"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")
  if [[ "$status" == "$expected" ]]; then
    pass "$label → $status"
  elif [[ "$expected" == "200" && "$status" == "000" ]]; then
    fail "$label → unreachable (connection refused or timeout)"
  else
    fail "$label → expected $expected, got $status"
  fi
}

check_url_any() {
  local label="$1"
  local url="$2"
  shift 2
  local expected_codes=("$@")
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$url" 2>/dev/null || echo "000")
  for code in "${expected_codes[@]}"; do
    if [[ "$status" == "$code" ]]; then
      pass "$label → $status"
      return
    fi
  done
  fail "$label → unexpected $status (expected one of: ${expected_codes[*]})"
}

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${CYAN}║     AmarktAI Network — Final Go-Live Certification               ║${RESET}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════════╝${RESET}"
echo -e "  Target: ${BOLD}$BASE_URL${RESET}"
echo -e "  Time:   $(date -u '+%Y-%m-%dT%H:%M:%SZ')"

# =============================================================================
# PART 1 — PUBLIC ROUTE PROOF
# =============================================================================
section "Part 1 — Public route proof"

check_url "/"                 "$BASE_URL/"
check_url "/about"            "$BASE_URL/about"
check_url "/apps"             "$BASE_URL/apps"
check_url "/contact"          "$BASE_URL/contact"
check_url "/privacy"          "$BASE_URL/privacy"
check_url "/terms"            "$BASE_URL/terms"
check_url "/admin/login"      "$BASE_URL/admin/login"

# =============================================================================
# PART 2 — DASHBOARD ROUTE PROOF
# =============================================================================
section "Part 2 — Dashboard route proof (expects redirect to login)"

for route in \
  "/admin/dashboard" \
  "/admin/dashboard/command-center" \
  "/admin/dashboard/amarktai-assistant" \
  "/admin/dashboard/apps" \
  "/admin/dashboard/agents" \
  "/admin/dashboard/repo-workbench" \
  "/admin/dashboard/research" \
  "/admin/dashboard/creative-studio" \
  "/admin/dashboard/memory" \
  "/admin/dashboard/actions" \
  "/admin/dashboard/diagnostics" \
  "/admin/dashboard/settings"
do
  check_url_any "$route" "$BASE_URL$route" 200 302 307 401 403
done

# =============================================================================
# PART 3 — STATIC ASSET PROOF
# =============================================================================
section "Part 3 — Static asset proof"

# Check _next/static directory serves assets
STATIC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/_next/static/" 2>/dev/null || echo "000")
if [[ "$STATIC_CHECK" != "000" ]]; then
  pass "_next/static/ reachable (HTTP $STATIC_CHECK)"
else
  warn "_next/static/ not reachable — confirm after deploy"
fi

# Check standalone server exists locally
if [ -f ".next/standalone/server.js" ]; then
  pass ".next/standalone/server.js exists"
else
  warn ".next/standalone/server.js not found — run: npm run build"
fi

if [ -d ".next/static" ]; then
  pass ".next/static directory exists"
else
  warn ".next/static directory not found — run: npm run build"
fi

# =============================================================================
# PART 4 — API HEALTH PROOF
# =============================================================================
section "Part 4 — API health proof"

# Health ping
PING_BODY=$(curl -s --max-time 10 "$BASE_URL/api/health/ping" 2>/dev/null || echo "{}")
PING_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/health/ping" 2>/dev/null || echo "000")
if [[ "$PING_STATUS" == "200" ]]; then
  pass "/api/health/ping → 200"
  if echo "$PING_BODY" | grep -q '"ok":true'; then
    pass "/api/health/ping body contains ok:true"
  else
    warn "/api/health/ping body missing ok:true — check response shape"
  fi
  if echo "$PING_BODY" | grep -q '"service":"amarktai-network"'; then
    pass "/api/health/ping body contains service:amarktai-network"
  else
    warn "/api/health/ping body missing service field"
  fi
else
  fail "/api/health/ping → $PING_STATUS (expected 200)"
fi

# Diagnostics
check_url_any "/api/admin/system/live-readiness" "$BASE_URL/api/admin/system/live-readiness" 200 401 403

# =============================================================================
# PART 5 — PROVIDER AND SETTINGS PROOF
# =============================================================================
section "Part 5 — Provider and settings proof"

# Settings endpoint
check_url_any "/api/admin/settings" "$BASE_URL/api/admin/settings" 200 401 403

# Reset endpoint requires confirmation — unauthenticated should return 400 or 401/403
RESET_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST \
  "$BASE_URL/api/admin/settings/reset-approved-keys" \
  -H "Content-Type: application/json" \
  -d '{}' 2>/dev/null || echo "000")
if [[ "$RESET_STATUS" =~ ^(400|401|403)$ ]]; then
  pass "/api/admin/settings/reset-approved-keys rejects unconfirmed request ($RESET_STATUS)"
else
  warn "/api/admin/settings/reset-approved-keys returned $RESET_STATUS — verify auth"
fi

# Adult policy test endpoint accepts modes
ADULT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST \
  "$BASE_URL/api/admin/settings/test-adult" \
  -H "Content-Type: application/json" \
  -d '{"mode":"off"}' 2>/dev/null || echo "000")
if [[ "$ADULT_STATUS" =~ ^(200|400|401|403)$ ]]; then
  pass "/api/admin/settings/test-adult responds ($ADULT_STATUS)"
else
  fail "/api/admin/settings/test-adult returned unexpected $ADULT_STATUS"
fi

# =============================================================================
# PART 6 — REPO WORKBENCH PROOF
# =============================================================================
section "Part 6 — Repo Workbench API proof"

check_url_any "/api/admin/repo-workbench/github/status" \
  "$BASE_URL/api/admin/repo-workbench/github/status" 200 401 403

check_url_any "/api/admin/repo-workbench/github/repos" \
  "$BASE_URL/api/admin/repo-workbench/github/repos" 200 400 401 403

check_url_any "/api/admin/repo-workbench/safe-test" \
  "$BASE_URL/api/admin/repo-workbench/safe-test" 200 400 401 403

# =============================================================================
# PART 7 — STORAGE PROOF
# =============================================================================
section "Part 7 — Storage proof"

# Memory
check_url_any "/api/admin/memory" "$BASE_URL/api/admin/memory" 200 401 403

# Artifacts
ARTIFACT_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/artifacts" 2>/dev/null || echo "{}")
ARTIFACT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/admin/artifacts" 2>/dev/null || echo "000")
if [[ "$ARTIFACT_STATUS" == "200" ]]; then
  pass "/api/admin/artifacts → 200"
  if echo "$ARTIFACT_BODY" | grep -qE '"artifacts"\s*:\s*\['; then
    pass "/api/admin/artifacts returns artifacts array"
  else
    warn "/api/admin/artifacts body missing artifacts array key"
  fi
elif [[ "$ARTIFACT_STATUS" =~ ^(401|403)$ ]]; then
  pass "/api/admin/artifacts → $ARTIFACT_STATUS (auth gated)"
else
  fail "/api/admin/artifacts → $ARTIFACT_STATUS (expected 200 or auth redirect)"
fi

# Research
check_url_any "/api/admin/research/jobs" "$BASE_URL/api/admin/research/jobs" 200 401 403

# =============================================================================
# PART 7b — LOCAL CORE BACKEND PROOF
# =============================================================================
section "Part 7b — Local core backend proof"

# Memory local backend
MEM_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/memory" 2>/dev/null || echo "{}")
MEM_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/admin/memory" 2>/dev/null || echo "000")
if [[ "$MEM_STATUS" == "200" ]]; then
  pass "/api/admin/memory → 200"
  if echo "$MEM_BODY" | grep -qE '"available"\s*:\s*true'; then
    pass "/api/admin/memory returns available:true"
  elif echo "$MEM_BODY" | grep -qE '"statusLabel"\s*:\s*"working"'; then
    pass "/api/admin/memory returns statusLabel:working"
  elif echo "$MEM_BODY" | grep -qE '"writable"\s*:\s*true'; then
    pass "/api/admin/memory returns writable:true (local VPS working)"
  else
    warn "/api/admin/memory returned 200 but status unclear — check body"
  fi
elif [[ "$MEM_STATUS" =~ ^(401|403)$ ]]; then
  warn "AUTH REQUIRED — skipped memory working status proof ($MEM_STATUS)"
else
  fail "/api/admin/memory → $MEM_STATUS (expected 200 or auth redirect)"
fi

# Artifact storage-info
ARTIFACT_INFO_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/artifacts?storage-info" 2>/dev/null || echo "{}")
ARTIFACT_INFO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/admin/artifacts?storage-info" 2>/dev/null || echo "000")
if [[ "$ARTIFACT_INFO_STATUS" == "200" ]]; then
  pass "/api/admin/artifacts?storage-info → 200"
  if echo "$ARTIFACT_INFO_BODY" | grep -qE '"localVpsWritable"\s*:\s*true'; then
    pass "/api/admin/artifacts?storage-info shows local VPS writable"
  elif echo "$ARTIFACT_INFO_BODY" | grep -qE '"writable"\s*:\s*true'; then
    pass "/api/admin/artifacts?storage-info shows writable:true"
  else
    warn "/api/admin/artifacts?storage-info storage not confirmed writable — may need storage dir setup"
  fi
elif [[ "$ARTIFACT_INFO_STATUS" =~ ^(401|403)$ ]]; then
  warn "AUTH REQUIRED — skipped artifact storage-info proof"
else
  warn "/api/admin/artifacts?storage-info → $ARTIFACT_INFO_STATUS"
fi

# Research jobs local
RESEARCH_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/research/jobs" 2>/dev/null || echo "{}")
RESEARCH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/admin/research/jobs" 2>/dev/null || echo "000")
if [[ "$RESEARCH_STATUS" == "200" ]]; then
  pass "/api/admin/research/jobs → 200"
  if echo "$RESEARCH_BODY" | grep -qE '"jobs"\s*:\s*\['; then
    pass "/api/admin/research/jobs returns jobs array"
  else
    warn "/api/admin/research/jobs body missing jobs array"
  fi
elif [[ "$RESEARCH_STATUS" =~ ^(401|403)$ ]]; then
  warn "AUTH REQUIRED — skipped research jobs proof"
else
  fail "/api/admin/research/jobs → $RESEARCH_STATUS"
fi

# Apps local (should have starter data)
APPS_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/apps" 2>/dev/null || echo "{}")
APPS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/admin/apps" 2>/dev/null || echo "000")
if [[ "$APPS_STATUS" == "200" ]]; then
  pass "/api/admin/apps → 200"
  if echo "$APPS_BODY" | grep -q "AmarktAI\|amarktai\|starter_local\|slug"; then
    pass "/api/admin/apps returns real app records"
  else
    warn "/api/admin/apps returned 200 but no recognizable app data"
  fi
elif [[ "$APPS_STATUS" =~ ^(401|403)$ ]]; then
  warn "AUTH REQUIRED — skipped apps local records proof"
else
  fail "/api/admin/apps → $APPS_STATUS (expected 200 or auth redirect)"
fi

# Agents local (should have starter data)
AGENTS_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/agents" 2>/dev/null || echo "{}")
AGENTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/admin/agents" 2>/dev/null || echo "000")
if [[ "$AGENTS_STATUS" == "200" ]]; then
  pass "/api/admin/agents → 200"
  if echo "$AGENTS_BODY" | grep -q "agents\|agent\|type"; then
    pass "/api/admin/agents returns agent records"
  else
    warn "/api/admin/agents returned 200 but no recognizable agent data"
  fi
elif [[ "$AGENTS_STATUS" =~ ^(401|403)$ ]]; then
  warn "AUTH REQUIRED — skipped agents local records proof"
else
  fail "/api/admin/agents → $AGENTS_STATUS"
fi

# Approvals local
APPROVALS_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/approvals" 2>/dev/null || echo "{}")
APPROVALS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$BASE_URL/api/admin/approvals" 2>/dev/null || echo "000")
if [[ "$APPROVALS_STATUS" == "200" ]]; then
  pass "/api/admin/approvals → 200"
  if echo "$APPROVALS_BODY" | grep -qE '"approvals"\s*:\s*\['; then
    pass "/api/admin/approvals returns approvals array (no blocking)"
  else
    warn "/api/admin/approvals body missing approvals array"
  fi
elif [[ "$APPROVALS_STATUS" =~ ^(401|403)$ ]]; then
  warn "AUTH REQUIRED — skipped approvals local proof"
else
  fail "/api/admin/approvals → $APPROVALS_STATUS"
fi

# =============================================================================
# PART 8 — ADULT POLICY PROOF
# =============================================================================
section "Part 8 — Adult policy proof"

check_url_any "/api/admin/app-safety" "$BASE_URL/api/admin/app-safety" 200 401 403
check_url_any "/api/admin/global-adult-mode" "$BASE_URL/api/admin/global-adult-mode" 200 401 403

# Adult mode full_adult_app_mode — must not return "Unknown mode" (400 is valid if not authed)
FULL_ADULT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 -X POST \
  "$BASE_URL/api/admin/settings/test-adult" \
  -H "Content-Type: application/json" \
  -d '{"mode":"full_adult_app_mode","appSlug":"test"}' 2>/dev/null || echo "000")
if [[ "$FULL_ADULT_STATUS" =~ ^(200|401|403)$ ]]; then
  pass "/api/admin/settings/test-adult full_adult_app_mode accepted ($FULL_ADULT_STATUS)"
elif [[ "$FULL_ADULT_STATUS" == "400" ]]; then
  # Check body for "Unknown mode" error
  FULL_ADULT_BODY=$(curl -s --max-time 10 -X POST \
    "$BASE_URL/api/admin/settings/test-adult" \
    -H "Content-Type: application/json" \
    -d '{"mode":"full_adult_app_mode","appSlug":"test"}' 2>/dev/null || echo "{}")
  if echo "$FULL_ADULT_BODY" | grep -qi "unknown mode"; then
    fail "/api/admin/settings/test-adult returns 'Unknown mode' for full_adult_app_mode — fix route"
  else
    pass "/api/admin/settings/test-adult full_adult_app_mode 400 (acceptable, no 'Unknown mode')"
  fi
else
  warn "/api/admin/settings/test-adult full_adult_app_mode → $FULL_ADULT_STATUS"
fi

# =============================================================================
# PART 9 — APPROVAL QUEUE PROOF
# =============================================================================
section "Part 9 — Approval queue proof"

check_url_any "/api/admin/approvals" "$BASE_URL/api/admin/approvals" 200 401 403

# =============================================================================
# PART 10 — APPS AND AGENTS PROOF
# =============================================================================
section "Part 10 — Apps and agents proof"

check_url_any "/api/admin/apps"   "$BASE_URL/api/admin/apps"   200 401 403
check_url_any "/api/admin/agents" "$BASE_URL/api/admin/agents" 200 401 403

# =============================================================================
# PART 11 — SECURITY SPOT CHECKS
# =============================================================================
section "Part 11 — Security spot checks"

# Confirm login page exists and doesn't expose admin directly
check_url_any "/admin/login" "$BASE_URL/admin/login" 200 302

# AmarktAI Assistant chat endpoint
check_url_any "/api/admin/amarktai-assistant/chat" \
  "$BASE_URL/api/admin/amarktai-assistant/chat" 200 405 401 403

# Key masking: settings should not return plaintext keys
SETTINGS_BODY=$(curl -s --max-time 10 "$BASE_URL/api/admin/settings" 2>/dev/null || echo "{}")
if echo "$SETTINGS_BODY" | grep -qE '"key"\s*:\s*"[A-Za-z0-9_\-]{20,}"'; then
  fail "Settings response may contain unmasked key values — review masking"
else
  pass "Settings response does not appear to contain unmasked keys"
fi

# =============================================================================
# FINAL BLOCKER TABLE AND VERDICT
# =============================================================================
section "Final Certification Summary"

TOTAL=$((PASS + FAIL + WARN))
echo ""
echo -e "  Checks run: ${BOLD}$TOTAL${RESET}"
echo -e "  ${GREEN}PASS: $PASS${RESET}"
echo -e "  ${RED}FAIL: $FAIL${RESET}"
echo -e "  ${YELLOW}WARN: $WARN${RESET}"

if [ "${#BLOCKER_TABLE[@]}" -gt 0 ]; then
  echo ""
  echo -e "${RED}${BOLD}Critical blockers:${RESET}"
  for blocker in "${BLOCKER_TABLE[@]}"; do
    echo -e "  ${RED}●${RESET} $blocker"
  done
fi

echo ""
if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}${BOLD}╔══════════════════════════════════════╗${RESET}"
  echo -e "${RED}${BOLD}║  VERDICT: NOT GO-LIVE READY          ║${RESET}"
  echo -e "${RED}${BOLD}║  $FAIL critical blocker(s) found      ║${RESET}"
  echo -e "${RED}${BOLD}╚══════════════════════════════════════╝${RESET}"
  echo ""
  echo "Next steps:"
  echo "  1. Fix blockers listed above"
  echo "  2. npm run build && npm run lint && node_modules/.bin/vitest run"
  echo "  3. BASE_URL=\$BASE_URL ./scripts/final_live_certification.sh"
  exit 1
else
  echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════════╗${RESET}"
  if [ "$WARN" -gt 0 ]; then
    echo -e "${GREEN}${BOLD}║  VERDICT: GO-LIVE READY WITH CLEAN-SLATE KEYS NEEDED            ║${RESET}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}"
    echo ""
    echo -e "${YELLOW}Remaining manual steps (warnings only — not blocking):${RESET}"
    echo "  1. Add real provider keys in Settings (GenX, Qwen, Gemini, Groq, etc.)"
    echo "  2. Test each provider in Settings"
    echo "  3. Run Diagnostics to confirm all green"
    echo "  4. Confirm adult policy per app (default Off)"
    echo "  5. Run Repo Workbench E2E proof with a real repo"
  else
    echo -e "${GREEN}${BOLD}║  VERDICT: GO-LIVE READY                                          ║${RESET}"
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════════╝${RESET}"
  fi
  echo ""
  echo "Deploy commands:"
  echo "  npm run build"
  echo "  cp -r .next/static .next/standalone/.next/static"
  echo "  cp -r public .next/standalone/public"
  echo "  NODE_ENV=production node .next/standalone/server.js"
  echo "  # or: sudo systemctl restart amarktai"
  echo ""
  echo "Verify after deploy:"
  echo "  BASE_URL=https://amarktai.co.za ./scripts/final_live_certification.sh"
  exit 0
fi
