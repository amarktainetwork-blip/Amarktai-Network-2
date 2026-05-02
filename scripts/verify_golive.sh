#!/usr/bin/env bash
# Amarktai Network — production go-live verification
# Run on the VPS after deploying the latest merged code.
#
# Usage:
#   cd /var/www/amarktai/repo
#   sudo bash scripts/verify_golive.sh

set -Eeuo pipefail

APP_DIR="${APP_DIR:-/var/www/amarktai/repo}"
SERVICE_NAME="${SERVICE_NAME:-amarktai-web}"
LOCAL_BASE_URL="${LOCAL_BASE_URL:-http://localhost:3000}"
PUBLIC_BASE_URL="${PUBLIC_BASE_URL:-https://amarktai.com}"
WORKSPACE_ROOT="${REPO_WORKSPACE_ROOT:-/var/amarktai/workspaces}"
REPORT_DIR="$APP_DIR/docs/forensic"
REPORT_FILE="$REPORT_DIR/LIVE_VPS_GOLIVE_VERIFICATION.md"

pass_count=0
fail_count=0
warn_count=0

log() { printf '[verify] %s\n' "$*"; }
record() {
  local status="$1"; shift
  local name="$1"; shift
  local detail="$*"
  case "$status" in
    PASS) pass_count=$((pass_count + 1)) ;;
    FAIL) fail_count=$((fail_count + 1)) ;;
    WARN) warn_count=$((warn_count + 1)) ;;
  esac
  printf '| %s | %s | %s |\n' "$status" "$name" "${detail//|/\\|}" >> "$REPORT_FILE"
  log "$status — $name — $detail"
}

run_capture() {
  local name="$1"; shift
  local output
  if output=$("$@" 2>&1); then
    record PASS "$name" "$(echo "$output" | tail -n 1 | sed 's/[[:space:]]\+/ /g')"
    return 0
  fi
  record FAIL "$name" "$(echo "$output" | tail -n 3 | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g')"
  return 1
}

mkdir -p "$REPORT_DIR"
cat > "$REPORT_FILE" <<EOF_REPORT
# LIVE VPS GO-LIVE VERIFICATION

Generated: $(date -Is)  
App dir: \\`$APP_DIR\\`  
Service: \\`$SERVICE_NAME\\`  
Local URL: \\`$LOCAL_BASE_URL\\`  
Public URL: \\`$PUBLIC_BASE_URL\\`

| Status | Check | Evidence |
| --- | --- | --- |
EOF_REPORT

cd "$APP_DIR"

[[ -f package.json ]] && record PASS "package.json present" "$APP_DIR/package.json" || record FAIL "package.json present" "missing"
[[ -f .env ]] && record PASS ".env present" "$APP_DIR/.env" || record WARN ".env present" "missing; relying on systemd environment"

run_capture "git branch" git rev-parse --abbrev-ref HEAD || true
run_capture "git commit" git rev-parse --short HEAD || true
run_capture "node version" node --version || true
run_capture "npm version" npm --version || true

if [[ -d "$WORKSPACE_ROOT" ]]; then
  record PASS "Repo workspace root exists" "$WORKSPACE_ROOT"
else
  mkdir -p "$WORKSPACE_ROOT" && record PASS "Repo workspace root created" "$WORKSPACE_ROOT" || record FAIL "Repo workspace root create" "$WORKSPACE_ROOT"
fi

if [[ -w "$WORKSPACE_ROOT" ]]; then
  record PASS "Repo workspace root writable" "$WORKSPACE_ROOT"
else
  record FAIL "Repo workspace root writable" "not writable by $(id -un)"
fi

run_capture "npm install" npm install || true
run_capture "Prisma generate" npx prisma generate || true
run_capture "lint" npm run lint || true
run_capture "tests" npm test || true
run_capture "Next build" env NEXT_PRIVATE_BUILD_WORKER=0 npm run build || true

if [[ -f .next/standalone/server.js ]]; then
  record PASS "Next standalone server" ".next/standalone/server.js exists"
else
  record FAIL "Next standalone server" "missing .next/standalone/server.js"
fi

mkdir -p .next/standalone/.next
if [[ -d .next/static ]]; then
  rm -rf .next/standalone/.next/static
  cp -a .next/static .next/standalone/.next/static
  record PASS "Static copied to standalone" ".next/standalone/.next/static"
else
  record FAIL "Static copied to standalone" ".next/static missing"
fi

if [[ -d public ]]; then
  rm -rf .next/standalone/public
  cp -a public .next/standalone/public
  record PASS "Public copied to standalone" ".next/standalone/public"
else
  record WARN "Public copied to standalone" "public directory missing"
fi

if command -v systemctl >/dev/null 2>&1; then
  if systemctl is-active --quiet "$SERVICE_NAME"; then
    record PASS "systemd service active before restart" "$SERVICE_NAME"
  else
    record WARN "systemd service active before restart" "$SERVICE_NAME is not active"
  fi

  if systemctl restart "$SERVICE_NAME"; then
    sleep 4
    if systemctl is-active --quiet "$SERVICE_NAME"; then
      record PASS "systemd restart" "$SERVICE_NAME active"
    else
      record FAIL "systemd restart" "$SERVICE_NAME inactive after restart"
    fi
  else
    record FAIL "systemd restart" "restart command failed"
  fi
else
  record WARN "systemd available" "systemctl not found"
fi

if curl -fsS --max-time 10 "$LOCAL_BASE_URL/api/health/ping" >/tmp/amarktai-health-ping.txt 2>/tmp/amarktai-health-ping.err; then
  record PASS "local health ping" "$(cat /tmp/amarktai-health-ping.txt | head -c 180)"
else
  record FAIL "local health ping" "$(cat /tmp/amarktai-health-ping.err | head -c 180)"
fi

if curl -fsSI --max-time 15 "$PUBLIC_BASE_URL" >/tmp/amarktai-public-head.txt 2>/tmp/amarktai-public-head.err; then
  record PASS "public site HEAD" "$(head -n 1 /tmp/amarktai-public-head.txt)"
else
  record FAIL "public site HEAD" "$(cat /tmp/amarktai-public-head.err | head -c 180)"
fi

if curl -fsS --max-time 15 "$LOCAL_BASE_URL/api/admin/system/live-readiness" >/tmp/amarktai-live-readiness.json 2>/tmp/amarktai-live-readiness.err; then
  if grep -q '"overall":"PASS"' /tmp/amarktai-live-readiness.json; then
    record PASS "live readiness API" "overall PASS"
  else
    record FAIL "live readiness API" "returned non-PASS; see /tmp/amarktai-live-readiness.json"
  fi
else
  record WARN "live readiness API" "auth may be required or endpoint failed: $(cat /tmp/amarktai-live-readiness.err | head -c 160)"
fi

cat >> "$REPORT_FILE" <<EOF_SUMMARY

## Summary

PASS: $pass_count  
WARN: $warn_count  
FAIL: $fail_count  

EOF_SUMMARY

if [[ "$fail_count" -gt 0 ]]; then
  cat >> "$REPORT_FILE" <<'EOF_NOGO'
## GO/NO-GO

NO-GO. One or more required checks failed. Fix the failed checks before calling the VPS production-live.
EOF_NOGO
  log "NO-GO — $fail_count failed check(s). Report: $REPORT_FILE"
  exit 1
fi

cat >> "$REPORT_FILE" <<'EOF_GO'
## GO/NO-GO

GO for current app go-live verification. Disabled/optional features such as video/music/adult remain governed by runtime truth and provider gates.
EOF_GO

log "GO — verification passed. Report: $REPORT_FILE"
