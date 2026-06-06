# Final VPS Install Plan

## 1. Prepare

1. Deploy the repository to `/var/www/amarktai`.
2. Install Node.js and Docker.
3. Set `APP_USER`, `APP_GROUP`, and `AMARKTAI_STORAGE_ROOT` when the defaults do not match the VPS.
4. Run `sudo bash scripts/install-open-source-stack.sh`.

## 2. Services installed or checked

- Redis: queue and live job coordination.
- Qdrant: vector memory and research indexing.
- Playwright Chromium: rendered browser research and verification.
- Python virtual environment: Scrapy and Trafilatura.
- ffmpeg: audio/video conversion and final movie assembly.
- Rhubarb Lip Sync: optional manual binary install for avatar lip-sync.
- Persistent storage directories: artifacts, jobs, logs, memory, and research.

## 3. Environment

Set the application database/session variables, then add provider keys through Settings. Infrastructure variables commonly used by the app:

```bash
REDIS_URL=redis://127.0.0.1:6379
QDRANT_URL=http://127.0.0.1:6333
AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage
PYTHON_PATH=/var/www/amarktai/.venv/bin/python
FFMPEG_PATH=/usr/bin/ffmpeg
RHUBARB_PATH=/var/www/amarktai/tools/rhubarb/rhubarb
```

## 4. Application install

```bash
cd /var/www/amarktai
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

Start the web process and worker with systemd or the existing process manager. Keep Nginx in front of the Next.js service and preserve the application storage directory across deployments.

## 5. Verification

1. Open Settings.
2. Test Redis, Qdrant, Local Crawler, ffmpeg, and Storage.
3. Add each provider key and click Test.
4. Confirm green appears only after the live test passes.
5. Run Command jobs for an image, song, and supported video provider.
6. Confirm completed or asynchronous work appears in Outputs.
7. Open System for VPS/service diagnostics.

## 6. Rollback

- Stop the new application process.
- Restore the previous release directory or deployment symlink.
- Keep `/var/www/amarktai/storage` and the Qdrant data directory intact.
- Do not delete Redis/Qdrant data during an application rollback.
