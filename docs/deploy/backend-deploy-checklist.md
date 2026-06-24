# Deploy Readiness Checklist

Use this checklist before restarting the VPS services for branch
`integration/cline-source-of-truth`.

1. Confirm the target checkout and VPS path:
   `cd /var/www/amarktai/platform`
   `git status --short --branch`
   `git rev-parse --abbrev-ref HEAD`
   `git rev-parse HEAD`

2. Confirm the canonical branch is checked out:
   `integration/cline-source-of-truth`

3. Install dependencies:
   `npm ci`

4. Generate Prisma client:
   `npx prisma generate`

5. Build the production app:
   `npm run build`

   Windows equivalent when running locally from PowerShell or `cmd.exe`:
   `npm.cmd run build`

6. Copy standalone static assets after every successful build:
   `rm -rf .next/standalone/.next/static`
   `cp -R .next/static .next/standalone/.next/static`
   `rm -rf .next/standalone/public`
   `cp -R public .next/standalone/public`

   Required paths:
   `.next/static -> .next/standalone/.next/static`
   `public -> .next/standalone/public`

7. Restart the canonical services:
   `sudo systemctl restart amarktai-platform.service`
   `sudo systemctl restart amarktai-worker.service`

8. Verify local health on the VPS:
   `curl -sf --max-time 10 http://127.0.0.1:3000/api/health`

9. Verify CSS asset delivery from the standalone output:
   `CSS=$(ls /var/www/amarktai/platform/.next/standalone/.next/static/css/*.css | head -1)`
   `CSS_NAME=$(basename "$CSS")`
   `curl -I http://127.0.0.1:3000/_next/static/css/$CSS_NAME`

10. Verify the public domain:
    `curl -I https://amarktai.co.za/_next/static/css/$CSS_NAME`
    `curl -I https://amarktai.co.za/api/health`

11. Roll back quickly if the deploy is unhealthy:
    `git log --oneline -10`
    `git checkout <known-good-sha>`
    `npm ci`
    `npx prisma generate`
    `npm run build`
    `rm -rf .next/standalone/.next/static`
    `cp -R .next/static .next/standalone/.next/static`
    `rm -rf .next/standalone/public`
    `cp -R public .next/standalone/public`
    `sudo systemctl restart amarktai-platform.service`
    `sudo systemctl restart amarktai-worker.service`

Do not mark deploy readiness complete unless local health, CSS asset delivery,
and public-domain checks all pass on `/var/www/amarktai/platform` with
`amarktai-platform.service` and `amarktai-worker.service` running the same
build output.
