# Next.js Static Asset Delivery

This document explains how AmarktAI Network builds, copies, serves, and verifies
its Next.js static assets (`/_next/static/` — CSS, JS chunks, fonts).

---

## How standalone assets are built

`next build` with `output: 'standalone'` in `next.config.mjs` produces two
distinct output directories:

```
.next/
├── standalone/          ← self-contained Node.js server
│   └── server.js        ← the runtime (run this to start the app)
└── static/              ← compiled CSS, JS chunks, fonts, media
    ├── css/
    ├── chunks/
    └── media/
```

**Important:** `next build` does **not** copy `.next/static/` into
`.next/standalone/` automatically. If you start `standalone/server.js` without
the copy step every `/_next/static/*` request returns 404 (or, depending on
your reverse proxy, 400 Bad Request).

---

## Where static assets must be copied

The standalone `server.js` resolves `/_next/static/` relative to its own
working directory. The `amarktai-web` systemd service sets:

```ini
WorkingDirectory=/var/www/amarktai/repo/.next/standalone
```

Therefore the standalone server looks for static assets at:

```
/var/www/amarktai/repo/.next/standalone/.next/static/
```

The deploy script (`scripts/deploy_and_proof_safe.sh`) performs this copy:

```bash
rm -rf .next/standalone/.next/static
cp -R  .next/static .next/standalone/.next/static
```

`scripts/deploy.sh` (the full bare-metal deploy) does the same and also copies
`public/` into `standalone/public/` so favicon and other public files are
served correctly.

---

## How systemd starts the app

The service unit at `deploy/amarktai-web.service` (copied to
`/etc/systemd/system/amarktai-web.service`):

```ini
[Service]
WorkingDirectory=/var/www/amarktai/repo/.next/standalone
ExecStart=/usr/bin/node /var/www/amarktai/repo/.next/standalone/server.js
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
EnvironmentFile=-/var/www/amarktai/repo/.env
```

The `WorkingDirectory` is the standalone directory itself. The server reads
static files from `${cwd}/.next/static/`, which resolves to
`.next/standalone/.next/static/` — exactly where the deploy step puts them.

---

## Whether Nginx proxies or directly serves `_next/static`

**Default (recommended): proxy to Node**

The Nginx config at `deploy/nginx.conf` proxies all `/_next/static/*` requests
to the upstream Node.js app:

```nginx
location /_next/static/ {
    proxy_pass         http://amarktai_app;   # 127.0.0.1:3000
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    ...
    expires 1y;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";
}
```

Node serves the asset directly from disk and returns `200 OK`. Nginx adds
long-lived cache headers and forwards the response.

**Alternative: serve directly via Nginx (bare-metal only)**

If you want Nginx to bypass Node for static assets (lower latency), use an
`alias` block **only when** the files exist on the host filesystem:

```nginx
location /_next/static/ {
    alias /var/www/amarktai/repo/.next/standalone/.next/static/;
    try_files $uri =404;
    expires 1y;
    access_log off;
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin "*";
}
```

> ⚠️  Do **not** use this block when running in Docker — the files live inside
> the container, not on the host, and Nginx will return 404 for every asset.

---

## Exact curl commands for verification

```bash
# 1. Confirm the standalone static directory is populated
ls /var/www/amarktai/repo/.next/standalone/.next/static/css/

# 2. Pick a CSS file and test locally against Node (should be 200)
CSS=$(ls /var/www/amarktai/repo/.next/standalone/.next/static/css/*.css | head -1)
CSS_NAME=$(basename "$CSS")
curl -I http://127.0.0.1:3000/_next/static/css/$CSS_NAME

# 3. Test through the public domain (should be 200)
curl -I https://amarktai.com/_next/static/css/$CSS_NAME

# 4. Same for a JS chunk
JS=$(ls /var/www/amarktai/repo/.next/standalone/.next/static/chunks/*.js | head -1)
JS_NAME=$(basename "$JS")
curl -I https://amarktai.com/_next/static/chunks/$JS_NAME

# 5. Run the full diagnostic (on the production server)
bash /var/www/amarktai/repo/scripts/diagnose_next_static_assets.sh
```

---

## Common failure: HTML works but `/_next/static` returns 400

**Symptom:** The browser receives valid HTML for `/` or `/admin/login`, but the
linked CSS, JS, and font files all return HTTP 400.

**Root causes and fixes:**

| Cause | Fix |
|---|---|
| `.next/standalone/.next/static/` is empty | Re-run the deploy script to copy static files |
| Node service is not running | `sudo systemctl start amarktai-web` |
| Nginx `/_next/static/` location block missing or has bad `alias` path | Check `nginx -T | grep _next`; use proxy_pass block from `deploy/nginx.conf` |
| Nginx receives 400 from Node because static files missing | Fix the static copy, then reload nginx |
| Middleware intercepting `/_next/static/*` | Verify `src/middleware.ts` matcher is `['/admin/:path*']` — not a wildcard `(.*)` |
| Wrong `WorkingDirectory` in systemd unit | Must be `.next/standalone`, not the repo root |

**Quick check sequence:**

```bash
# 1. Are the files there?
ls /var/www/amarktai/repo/.next/standalone/.next/static/css/*.css

# 2. Is Node returning 200 locally?
curl -sI http://127.0.0.1:3000/_next/static/css/<hash>.css | head -1

# 3. Is Nginx passing the request through?
curl -sI https://amarktai.com/_next/static/css/<hash>.css | head -1

# 4. Full diagnostic
bash /var/www/amarktai/repo/scripts/diagnose_next_static_assets.sh
```

---

## Rollback steps

If a bad deploy causes static assets to break and you need to roll back quickly:

```bash
# On the production server
cd /var/www/amarktai/repo

# 1. Check out the previous known-good commit
git fetch origin main
git log --oneline -10

# 2. Revert to a specific SHA
git reset --hard <previous-sha>

# 3. Rebuild and re-deploy
npm install
npm run build
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static

# 4. Restart the service
sudo systemctl restart amarktai-web

# 5. Verify
bash scripts/diagnose_next_static_assets.sh
```

If a rollback is not possible and you need a hot-fix for static assets only
(e.g. the standalone directory is intact but the copy was missed):

```bash
cd /var/www/amarktai/repo
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static
sudo systemctl restart amarktai-web
```
