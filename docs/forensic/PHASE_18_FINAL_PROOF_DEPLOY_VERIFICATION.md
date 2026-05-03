# Phase 18 — Final Proof, Deploy + Live Verification

Generated: 2026-05-03  
Branch: `phase-18-final-proof-deploy-verification`

## Goal

This is the final repo-side phase before VPS redeploy.

The goal is not to add more product features. The goal is to make the deployment and verification repeatable, visible and pass/fail driven.

## Added

### Final proof script

```text
scripts/final_proof.sh
```

It checks public routes, dashboard routes, key admin APIs, service hints and artifact storage hints. It prints:

```text
PASS=...
WARN=...
FAIL=...
```

### Safe deploy + proof runner

```text
scripts/deploy_and_proof_safe.sh
```

This is now the preferred VPS command. It intentionally does **not** use `set -e`, so it does not exit the terminal early at the first failed command. It keeps going far enough to print a full report and only exits after showing the summary.

## Preferred VPS deployment command

Run this on the VPS after this PR is merged into `main`.

```bash
cd /var/www/amarktai/repo || exit 1
git fetch origin main
git reset --hard origin/main
chmod +x scripts/deploy_and_proof_safe.sh scripts/final_proof.sh
BASE_URL="https://amarktai.com" ./scripts/deploy_and_proof_safe.sh
```

If you have an admin cookie saved in Netscape/curl cookie format:

```bash
cd /var/www/amarktai/repo || exit 1
git fetch origin main
git reset --hard origin/main
chmod +x scripts/deploy_and_proof_safe.sh scripts/final_proof.sh
BASE_URL="https://amarktai.com" COOKIE_FILE="/tmp/amarktai.cookies" ./scripts/deploy_and_proof_safe.sh
```

## What the safe runner does

It runs:

1. git fetch/reset
2. npm install
3. npm run build
4. standalone server check
5. static asset copy
6. storage directory creation
7. storage ownership attempt
8. amarktai-web restart
9. service status/log tail
10. final proof script
11. PASS/WARN/FAIL summary

It does **not** hide failures. Required failures still count as `FAIL`, but you get the full report instead of an abrupt terminal exit.

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

After this PR merges, use `scripts/deploy_and_proof_safe.sh` for deployment. It gives a complete report instead of exiting early, and the next step is to fix only the real `FAIL` items it reports.