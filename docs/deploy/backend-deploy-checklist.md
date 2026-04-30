# Backend Deploy Checklist

Use this checklist before restarting the VPS service.

1. Confirm the target branch and commit:
   `git status --short --branch`
   `git rev-parse HEAD`

2. Install dependencies:
   `npm ci`

3. Generate Prisma client:
   `npm exec -- prisma generate`

4. Apply schema safely:
   `npm exec -- prisma db push`

5. Verify locally on the VPS:
   `npm run lint`
   `npm test`
   `npm run build`

6. Confirm systemd service is canonical:
   `systemctl status amarktai-web`

7. Restart and verify:
   `systemctl restart amarktai-web`
   `curl -sf --max-time 10 http://localhost:3000/api/health/ping`

Do not mark media, repo, or AI routes live-ready unless their status endpoints report real providers available or a truthful blocker.
