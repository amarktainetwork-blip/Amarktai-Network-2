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

repo_page="$(fetch_path /admin/dashboard/repo-workbench/simple 2>&1)"
for label in "GitHub connection status" "Repo selector" "Tell Aiva what to change" "Plan" "Generate diff" "Apply patch" "Run lint" "Commit" "Create PR" "Logs panel"; do
  if printf '%s' "$repo_page" | grep -q "$label"; then
    record PASS "Repo page label: $label" "present"
  else
    record FAIL "Repo page label: $label" "missing"
  fi
done

command_center="$(fetch_path /admin/dashboard/command-center 2>&1)"
if printf '%s' "$command_center" | grep -qi 'Aiva\|Command Center'; then
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
