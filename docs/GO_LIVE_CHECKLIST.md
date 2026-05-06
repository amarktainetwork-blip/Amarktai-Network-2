# Amarktai Network Go-Live Checklist

Use this checklist after Phase 18 is merged and deployed.

## 1. Repo is current

```bash
cd /var/www/amarktai/repo
git rev-parse --short HEAD
git status --short
```

Expected:

```text
on origin/main
clean working tree
```

## 2. Build passes

```bash
npm install
npm run build
```

Expected:

```text
build completes without error
.next/standalone/server.js exists
```

## 3. Service is live

```bash
sudo systemctl restart amarktai-web
sudo systemctl status amarktai-web --no-pager -l
sudo journalctl -u amarktai-web -n 120 --no-pager
```

Expected:

```text
active/running
no fatal startup errors
```

## 4. Final proof script passes

```bash
cd /var/www/amarktai/repo
chmod +x scripts/final_proof.sh
BASE_URL="https://amarktai.com" ./scripts/final_proof.sh
```

With admin cookie:

```bash
BASE_URL="https://amarktai.com" COOKIE_FILE="/tmp/amarktai.cookies" ./scripts/final_proof.sh
```

Expected:

```text
FAIL=0
```

## 5. Browser routes work

Open:

```text
/
/admin/login
/admin/dashboard
/admin/dashboard/command-center
/admin/dashboard/live-readiness
/admin/dashboard/ai-engine/hub
/admin/dashboard/ai-engine/app-setup
/admin/dashboard/ai-engine/intelligence
/admin/dashboard/ai-engine/artifacts
/admin/dashboard/ai-engine/AmarktAI Assistant-actions
/admin/dashboard/repo-workbench
```

Expected:

```text
pages load
no blank screens
no obvious mobile overflow
```

## 6. AmarktAI Assistant stream works

```bash
curl -N -X POST https://amarktai.com/api/admin/conversation/stream \
  -H 'Content-Type: application/json' \
  --cookie /tmp/amarktai.cookies \
  -d '{"message":"Confirm AmarktAI Assistant streaming works in one sentence.","capability":"chat","costPreference":"cheap","useSmartRouting":true,"appProfile":{"appSlug":"amarktai-network","safetyProfile":"standard"}}'
```

Expected:

```text
event: status
event: route
event: token
event: done
```

## 7. Live readiness has no critical blocker surprises

```bash
curl -sS https://amarktai.com/api/admin/live-readiness \
  --cookie /tmp/amarktai.cookies | jq
```

Expected:

```text
JSON response
blockers are known/expected
```

## 8. Decision

Go-live is allowed only if:

```text
build passes
service is active
final proof FAIL=0
homepage loads
login loads
dashboard Command Center loads
AmarktAI Assistant stream emits token events
Live Readiness works authenticated
```

If any required proof fails, fix that before public launch.
