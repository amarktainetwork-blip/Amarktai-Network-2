# Phase 18 — Final Proof, Deploy + Live Verification

Generated: 2026-05-03  
Branch: `phase-18-final-proof-deploy-verification`

## Goal

This is the final repo-side phase before VPS redeploy.

The goal is not to add more product features. The goal is to make the deployment and verification repeatable, visible and pass/fail driven.

## Added

### Final proof script

New file:

```text
scripts/final_proof.sh
```

It checks:

- public homepage,
- admin login,
- dashboard redirect,
- Command Center,
- Live Readiness page,
- AI Engine hub,
- Repo Workbench simple page,
- Live Readiness API,
- Provider Scores API,
- Media Artifacts API,
- App AI Packages API,
- Aiva Actions API,
- Aiva Action Audit API,
- systemd service hint,
- artifact storage hint.

It prints:

```text
PASS=...
WARN=...
FAIL=...
```

Warnings are acceptable for endpoints that require admin auth if no cookie file is supplied. Failures must be investigated before go-live.

## VPS deployment commands

Run these on the VPS after this PR is merged into `main`.

```bash
set -Eeuo pipefail
cd /var/www/amarktai/repo

echo "== Current state =="
git status --short
git branch --show-current
git rev-parse --short HEAD

echo "== Update from GitHub =="
git fetch origin main
git reset --hard origin/main

echo "== Install dependencies =="
npm install

echo "== Build =="
npm run build

echo "== Verify standalone server =="
test -f .next/standalone/server.js
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static

echo "== Ensure storage dirs =="
sudo mkdir -p /var/www/amarktai/repo/public/generated-artifacts
sudo mkdir -p /var/www/amarktai/repo/storage/provider-results
sudo mkdir -p /var/www/amarktai/repo/storage/app-ai-packages
sudo mkdir -p /var/www/amarktai/repo/storage/aiva-action-audit
sudo chown -R www-data:www-data /var/www/amarktai/repo/public/generated-artifacts /var/www/amarktai/repo/storage || true

echo "== Restart service =="
sudo systemctl restart amarktai-web
sleep 3
sudo systemctl status amarktai-web --no-pager -l

echo "== Tail logs =="
sudo journalctl -u amarktai-web -n 80 --no-pager
```

## Public proof commands

Run after deployment.

```bash
cd /var/www/amarktai/repo
chmod +x scripts/final_proof.sh
BASE_URL="https://amarktai.com" ./scripts/final_proof.sh
```

If you have an admin cookie saved in Netscape/curl cookie format:

```bash
BASE_URL="https://amarktai.com" COOKIE_FILE="/tmp/amarktai.cookies" ./scripts/final_proof.sh
```

## Manual browser checks

Open these routes:

```text
https://amarktai.com/
https://amarktai.com/admin/login
https://amarktai.com/admin/dashboard
https://amarktai.com/admin/dashboard/command-center
https://amarktai.com/admin/dashboard/live-readiness
https://amarktai.com/admin/dashboard/ai-engine/hub
https://amarktai.com/admin/dashboard/ai-engine/app-setup
https://amarktai.com/admin/dashboard/ai-engine/intelligence
https://amarktai.com/admin/dashboard/ai-engine/artifacts
https://amarktai.com/admin/dashboard/ai-engine/aiva-actions
https://amarktai.com/admin/dashboard/repo-workbench/simple
```

## Aiva stream proof

Requires admin cookie.

```bash
curl -N -X POST https://amarktai.com/api/admin/conversation/stream \
  -H 'Content-Type: application/json' \
  --cookie /tmp/amarktai.cookies \
  -d '{
    "message":"Reply in one sentence and confirm Aiva smart routing is active.",
    "capability":"chat",
    "costPreference":"cheap",
    "useSmartRouting":true,
    "appProfile":{"appSlug":"amarktai-network","safetyProfile":"standard"}
  }'
```

Expected events:

```text
event: status
event: route
event: token
event: done
```

## Specialist route proof

These tests require provider keys configured in the service vault/environment.

### Provider stream score

```bash
curl -sS 'https://amarktai.com/api/admin/provider-scores?appSlug=amarktai-network&days=14' \
  --cookie /tmp/amarktai.cookies | jq
```

### App AI package list

```bash
curl -sS 'https://amarktai.com/api/admin/app-ai-package' \
  --cookie /tmp/amarktai.cookies | jq
```

### Aiva action permissions

```bash
curl -sS 'https://amarktai.com/api/admin/aiva/actions' \
  --cookie /tmp/amarktai.cookies | jq
```

### Aiva action audit shell

Blocked without confirmation:

```bash
curl -sS -X POST https://amarktai.com/api/admin/aiva/action-execute \
  -H 'Content-Type: application/json' \
  --cookie /tmp/amarktai.cookies \
  -d '{"actionId":"repo_create_pr","confirmed":false,"payload":{"repo":"amarktainetwork-blip/Amarktai-Network-2"}}' | jq
```

Approved pending executor:

```bash
curl -sS -X POST https://amarktai.com/api/admin/aiva/action-execute \
  -H 'Content-Type: application/json' \
  --cookie /tmp/amarktai.cookies \
  -d '{"actionId":"repo_create_pr","confirmed":true,"payload":{"repo":"amarktainetwork-blip/Amarktai-Network-2"}}' | jq
```

Expected:

```text
success: true
executed: false
status: approved_pending_executor
```

## Go-live decision rule

Do not call it live if any of these fail:

1. `npm run build`
2. `systemctl restart amarktai-web`
3. homepage loads
4. login loads
5. dashboard redirects to Command Center
6. Command Center loads
7. Live Readiness loads
8. Aiva stream emits token events
9. `/api/admin/live-readiness` returns JSON when authenticated
10. final proof script has `FAIL=0`

Warnings are acceptable only when they are expected authentication warnings from running without an admin cookie.

## Remaining after launch

The product can continue improving after launch. Known post-launch enhancements:

- database-backed storage for provider scores/app AI packages/action audit,
- full app registry/product onboarding UI,
- per-action executors for PR/deploy/marketing with approval cards,
- deeper mobile polish across every page,
- Aiva voice controls after TTS provider proof,
- artifact retention/cleanup policies,
- more specialist media routes.

## Verdict

After this PR merges, the repo has a repeatable final proof script and a clear VPS redeploy/runbook. The next step is not another feature phase; it is merge, deploy, verify, and fix any proof failures.