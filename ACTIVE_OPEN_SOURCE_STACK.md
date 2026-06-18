# Active Open Source Stack

Last audited: 2026-06-18

This file is the source-of-truth checklist for local/open-source runtime pieces used by V1 proof, Studio generation, research, media assembly, and artifact persistence. "Installed" means present in repo dependencies or expected as a system binary/module; the VPS still has to pass the corresponding Settings/runtime-tool check.

| Component | Installed | Wired | Used by capability | Exact setup command | Exact blocker |
|---|---|---|---|---|---|
| Redis | Yes: `ioredis` dependency | Yes: `src/lib/job-queue.ts`, `src/lib/control-plane-jobs.ts`, Redis settings test | BullMQ queues, async media/control-plane jobs, worker retry/polling proof | `sudo apt-get install -y redis-server && sudo systemctl enable --now redis-server`; set `REDIS_URL=redis://127.0.0.1:6379` | Blocked if `REDIS_URL` is absent or the Redis service is unreachable from the app and worker. |
| BullMQ worker | Yes: `bullmq` dependency | Yes: `scripts/worker.mjs`, `src/lib/worker.ts`, `src/lib/job-queue.ts` | Async provider jobs, control-plane attempts, retries | `npm run worker` for foreground; production: create/enable `amarktai-worker.service` running `npm run worker` in the deployed repo | Blocked if no worker process is running with the same `.env` and deploy version as the Next app. |
| Qdrant | Yes: `@qdrant/js-client-rest` dependency | Yes: vector/retrieval integration and settings surfaces | Retrieval, semantic memory, research enrichment | `docker run -d --name qdrant -p 6333:6333 -v qdrant_storage:/qdrant/storage qdrant/qdrant`; set `QDRANT_URL=http://127.0.0.1:6333` | Blocked if `QDRANT_URL` is missing or the collection service is not reachable. |
| Playwright | Yes: npm dependency `playwright` | Yes: `src/lib/local-tools.ts`, `src/lib/research-tools.ts`, research URL tooling | Web research rendering/crawling | `npx playwright install --with-deps chromium` | Blocked if the Node package or Chromium browser install is missing on the VPS. |
| Scrapy | No repo npm dependency; Python module expected | Partially: `src/lib/local-tools.ts`, `src/lib/research-tools.ts`, install script | Web research crawl fallback | `python -m pip install scrapy` or run `bash scripts/install-open-source-stack.sh` | Blocked for Scrapy-backed crawl proof until installed in the Python used by `PYTHON_PATH` or system `python`. |
| Trafilatura | No repo npm dependency; Python module expected | Partially: `src/lib/local-tools.ts`, `src/lib/research-tools.ts`, install script | Web research extraction | `python -m pip install trafilatura` or run `bash scripts/install-open-source-stack.sh` | Blocked for high-quality extraction proof until installed in the Python used by `PYTHON_PATH` or system `python`. |
| ffmpeg | External binary expected | Yes: `src/lib/local-tools.ts`, `src/lib/long-form-video.ts`, media assembly paths | Long-form video, audio/video post-processing | `sudo apt-get install -y ffmpeg`; optional `FFMPEG_PATH=/usr/bin/ffmpeg` | Blocked if `ffmpeg -version` fails for the app/worker user. |
| ffprobe | External binary expected | Yes: `src/lib/local-tools.ts`, `src/lib/long-form-video.ts` | Video metadata/proof validation | Installed with ffmpeg: `sudo apt-get install -y ffmpeg`; optional `FFPROBE_PATH=/usr/bin/ffprobe` | Blocked if `ffprobe -version` fails for the app/worker user. |
| Rhubarb/lip-sync | No binary bundled | Tool check exists; canonical avatar-video adapter is not complete | Talking avatar video/lip-sync | Install Rhubarb and set `RHUBARB_PATH=/absolute/path/to/rhubarb`; then wire the approved adapter/service boundary | `talking_avatar_video` remains `BLOCKED`: no approved Rhubarb/lip-sync binary/service adapter is configured. |
| Local artifact storage | Yes: built-in `local_vps` storage driver | Yes: `src/lib/storage-driver.ts`, `src/lib/artifact-store.ts`, `/api/artifacts/file/[...key]`, artifact download route | Image/video/audio/music/avatar previews and downloads, durable text/report artifacts | `sudo mkdir -p /var/www/amarktai/storage/{artifacts,uploads,repos,workspaces,logs} && sudo chown -R <app-user>:<app-user> /var/www/amarktai/storage`; set `STORAGE_DRIVER=local_vps` and `AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage` | Blocked if storage root is not writable/readable/deletable by the app and worker. |
| Worker service | Script exists | Yes: worker entrypoint and queue code exist | Async generation completion, retry, polling, control-plane proof | Create systemd unit running `npm run worker`, then `sudo systemctl enable --now amarktai-worker` | Blocked if the worker is stopped, running old code, or missing the same `.env` as the web process. |

Current local audit notes:

- Playwright package resolves in Node.
- Scrapy and Trafilatura are not installed in the local Python environment used during this Codex run.
- The proof script now loads repo `.env*` files itself via `scripts/load-repo-env.ts`; it does not depend on `dotenv`.
