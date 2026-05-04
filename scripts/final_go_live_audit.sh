#!/usr/bin/env bash
# =============================================================================
# final_go_live_audit.sh — AmarktAI Network Go-Live Audit Script
#
# Usage:
#   ./scripts/final_go_live_audit.sh [BASE_URL]
#
# If BASE_URL is provided (e.g. https://yourdomain.com), live URL checks are
# performed. Otherwise only local build/lint/test checks run.
#
# Exit codes:
#   0  All critical checks passed
#   1  One or more critical checks failed
# =============================================================================

set -euo pipefail

BASE_URL="${1:-}"
PASS=0
FAIL=0
WARN=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

pass() { echo -e "${GREEN}PASS${RESET}  $1"; ((PASS++)); }
fail() { echo -e "${RED}FAIL${RESET}  $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}WARN${RESET}  $1"; ((WARN++)); }
section() { echo -e "\n${CYAN}${BOLD}── $1 ──${RESET}"; }

# =============================================================================
# SECTION 1 — BUILD
# =============================================================================
section "Build"

echo "Running: npm run build"
if npm run build 2>&1; then
  pass "Build succeeded"
else
  fail "Build FAILED"
fi

# =============================================================================
# SECTION 2 — LINT
# =============================================================================
section "Lint"

echo "Running: npm run lint"
if npm run lint 2>&1; then
  pass "Lint passed"
else
  fail "Lint FAILED"
fi

# =============================================================================
# SECTION 3 — TESTS
# =============================================================================
section "Tests"

echo "Running targeted test suites"
if node_modules/.bin/vitest run \
    src/lib/__tests__/dashboard-golive.test.ts \
    src/lib/__tests__/repo-workbench-production.test.ts \
    src/lib/__tests__/one-source-of-truth.test.ts \
    src/lib/__tests__/public-website-foundation.test.ts \
    src/lib/__tests__/dashboard-foundation-complete.test.ts \
    src/lib/__tests__/go-live-clean-slate-audit.test.ts \
    2>&1; then
  pass "All targeted tests passed"
else
  fail "One or more targeted tests FAILED"
fi

# =============================================================================
# SECTION 4 — STANDALONE SERVER & STATIC ASSETS
# =============================================================================
section "Standalone server & static assets"

if [ -f ".next/standalone/server.js" ]; then
  pass "Standalone server exists: .next/standalone/server.js"
else
  fail "Standalone server NOT found: .next/standalone/server.js"
fi

if [ -d ".next/static" ]; then
  pass ".next/static directory exists"
else
  fail ".next/static directory NOT found"
fi

if [ -d ".next/standalone/.next/static" ]; then
  pass "Standalone static assets copied: .next/standalone/.next/static"
else
  warn "Standalone static assets not copied (run: cp -r .next/static .next/standalone/.next/static)"
fi

if [ -d ".next/standalone/public" ]; then
  pass "Public assets copied to standalone: .next/standalone/public"
else
  warn "Public assets not copied to standalone (run: cp -r public .next/standalone/public)"
fi

# =============================================================================
# SECTION 5 — LIVE URL CHECKS (only if BASE_URL provided)
# =============================================================================
if [ -n "$BASE_URL" ]; then
  section "Live static asset checks ($BASE_URL)"

  check_url() {
    local label="$1"
    local url="$2"
    local expect_status="${3:-200}"
    local actual
    actual=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    if [ "$actual" = "$expect_status" ]; then
      pass "$label → $actual"
    else
      fail "$label → got $actual, expected $expect_status ($url)"
    fi
  }

  check_redirect() {
    local label="$1"
    local url="$2"
    local expect_location="$3"
    local actual_status actual_location
    actual_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    actual_location=$(curl -s -I --max-time 10 "$url" 2>/dev/null | grep -i "^location:" | tr -d '\r' | awk '{print $2}' || echo "")
    if [[ "$actual_status" =~ ^30[1-9]$ ]]; then
      if echo "$actual_location" | grep -q "$expect_location"; then
        pass "$label → $actual_status to $actual_location"
      else
        warn "$label → $actual_status but location '$actual_location' (expected '$expect_location')"
      fi
    else
      fail "$label → got $actual_status (expected 3xx redirect to $expect_location)"
    fi
  }

  # ── Static assets ──
  section "Static assets"
  # Discover a real CSS/JS asset from the build manifest
  CSS_FILE=$(find .next/static -name "*.css" -type f 2>/dev/null | head -1 | sed "s|\.next/static|/_next/static|")
  JS_FILE=$(find .next/static -name "*.js" -type f 2>/dev/null | head -1 | sed "s|\.next/static|/_next/static|")
  if [ -n "$CSS_FILE" ]; then
    check_url "CSS asset" "${BASE_URL}${CSS_FILE}"
  else
    warn "No CSS asset found in .next/static"
  fi
  if [ -n "$JS_FILE" ]; then
    check_url "JS asset" "${BASE_URL}${JS_FILE}"
  else
    warn "No JS asset found in .next/static"
  fi

  # ── Public routes ──
  section "Public routes"
  check_url "/"         "${BASE_URL}/"
  check_url "/about"    "${BASE_URL}/about"
  check_url "/apps"     "${BASE_URL}/apps"
  check_url "/contact"  "${BASE_URL}/contact"
  check_url "/privacy"  "${BASE_URL}/privacy"
  check_url "/terms"    "${BASE_URL}/terms"
  check_url "/admin/login" "${BASE_URL}/admin/login"

  # ── Canonical dashboard routes (may redirect to login if not authenticated) ──
  section "Dashboard canonical routes"
  for route in \
    /admin/dashboard \
    /admin/dashboard/command-center \
    /admin/dashboard/amarktai-assistant \
    /admin/dashboard/apps \
    /admin/dashboard/agents \
    /admin/dashboard/repo-workbench \
    /admin/dashboard/research \
    /admin/dashboard/creative-studio \
    /admin/dashboard/memory \
    /admin/dashboard/actions \
    /admin/dashboard/diagnostics \
    /admin/dashboard/settings; do
    actual=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${BASE_URL}${route}" 2>/dev/null || echo "000")
    if [[ "$actual" =~ ^(200|301|302|307|308)$ ]]; then
      pass "$route → $actual"
    else
      fail "$route → $actual (expected 200 or redirect)"
    fi
  done

  # ── Legacy redirect routes ──
  section "Legacy redirect routes"
  check_redirect "/admin/dashboard/aiva"                    "${BASE_URL}/admin/dashboard/aiva"                    "amarktai-assistant"
  check_redirect "/admin/dashboard/system-health"           "${BASE_URL}/admin/dashboard/system-health"           "diagnostics"
  check_redirect "/admin/dashboard/live-readiness"          "${BASE_URL}/admin/dashboard/live-readiness"          "diagnostics"
  check_redirect "/admin/dashboard/readiness"               "${BASE_URL}/admin/dashboard/readiness"               "diagnostics"
  check_redirect "/admin/dashboard/system"                  "${BASE_URL}/admin/dashboard/system"                  "diagnostics"
  check_redirect "/admin/dashboard/monitor"                 "${BASE_URL}/admin/dashboard/monitor"                 "diagnostics"
  check_redirect "/admin/dashboard/media-studio"            "${BASE_URL}/admin/dashboard/media-studio"            "creative-studio"
  check_redirect "/admin/dashboard/music-studio"            "${BASE_URL}/admin/dashboard/music-studio"            "creative-studio"
  check_redirect "/admin/dashboard/video"                   "${BASE_URL}/admin/dashboard/video"                   "creative-studio"
  check_redirect "/admin/dashboard/voice"                   "${BASE_URL}/admin/dashboard/voice"                   "creative-studio"
  check_redirect "/admin/dashboard/memory-emotions"         "${BASE_URL}/admin/dashboard/memory-emotions"         "memory"
  check_redirect "/admin/dashboard/emotions"                "${BASE_URL}/admin/dashboard/emotions"                "memory"
  check_redirect "/admin/dashboard/ai-engine/aiva-actions"  "${BASE_URL}/admin/dashboard/ai-engine/aiva-actions"  "actions"
  check_redirect "/admin/dashboard/operations"              "${BASE_URL}/admin/dashboard/operations"              "actions"
  check_redirect "/admin/dashboard/alerts"                  "${BASE_URL}/admin/dashboard/alerts"                  "actions"
  check_redirect "/admin/dashboard/jobs"                    "${BASE_URL}/admin/dashboard/jobs"                    "diagnostics"
  check_redirect "/admin/dashboard/build-studio"            "${BASE_URL}/admin/dashboard/build-studio"            "repo-workbench"
  check_redirect "/admin/dashboard/intelligence"            "${BASE_URL}/admin/dashboard/intelligence"            "research"
  check_redirect "/admin/dashboard/integrations"            "${BASE_URL}/admin/dashboard/integrations"            "settings"
  check_redirect "/admin/dashboard/models"                  "${BASE_URL}/admin/dashboard/models"                  "settings"

else
  section "Live URL checks"
  warn "BASE_URL not provided — skipping live URL checks. Pass URL as first argument to enable."
  warn "Example: ./scripts/final_go_live_audit.sh https://yoursite.com"
fi

# =============================================================================
# SUMMARY
# =============================================================================
section "Summary"

TOTAL=$((PASS + FAIL + WARN))
echo ""
echo -e "${BOLD}Results: ${GREEN}${PASS} PASS${RESET} · ${RED}${FAIL} FAIL${RESET} · ${YELLOW}${WARN} WARN${RESET} (of ${TOTAL} checks)${RESET}"

if [ "$FAIL" -gt 0 ]; then
  echo -e "\n${RED}${BOLD}AUDIT FAILED — $FAIL critical check(s) did not pass.${RESET}"
  echo ""
  echo "To redeploy and re-prove live:"
  echo "  1. Fix the issues above"
  echo "  2. npm run build"
  echo "  3. npm run lint"
  echo "  4. node_modules/.bin/vitest run src/lib/__tests__/go-live-clean-slate-audit.test.ts"
  echo "  5. ./scripts/final_go_live_audit.sh \$BASE_URL"
  exit 1
else
  echo -e "\n${GREEN}${BOLD}AUDIT PASSED — all critical checks OK.${RESET}"
  if [ "$WARN" -gt 0 ]; then
    echo -e "${YELLOW}$WARN warning(s) — review above.${RESET}"
  fi
  echo ""
  echo "Redeploy commands:"
  echo "  npm run build"
  echo "  cp -r .next/static .next/standalone/.next/static"
  echo "  cp -r public .next/standalone/public"
  echo "  node .next/standalone/server.js"
  echo "  ./scripts/final_go_live_audit.sh \$BASE_URL"
  exit 0
fi
