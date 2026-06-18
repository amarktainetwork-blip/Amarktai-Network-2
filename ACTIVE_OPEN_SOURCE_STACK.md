# Active Open Source Stack

Last audited: 2026-06-18

| Component | Repo status | Wired file/script | Setup command | VPS needed | V1 required | Notes |
|---|---|---|---|---|---|---|
| Redis | Installed dependency, env supported | `src/lib/redis.ts`, `src/lib/job-queue.ts`, `docker-compose.yml` | `docker compose up -d redis` or managed `REDIS_URL` | Yes for durable queues/cache | Required for robust async media/jobs | App can degrade in some paths but proof is incomplete without it. |
| BullMQ worker | Installed dependency | `scripts/worker.mjs`, `src/lib/worker.ts`, `src/lib/job-queue.ts` | `npm run worker` | Yes | Required for production async jobs | Systemd worker service referenced in deploy docs. |
| Qdrant | Installed dependency/env supported | `src/lib/vector-store.ts`, `docker-compose.yml` | `docker compose up -d qdrant` or `QDRANT_URL` | Recommended | Required for full vector/memory stack | DB fallback exists for some memory paths. |
| Playwright | Installed dependency | `package.json`, research/crawler flows | `npx playwright install --with-deps` | Yes for crawl/render proof | Required for research/browser rendering | Browser binaries may still need install on VPS. |
| Scrapy | Not installed by npm | `scripts/install-open-source-stack.sh`, crawler docs | `pip install scrapy` | Yes if using Python crawl stack | Optional for V1 unless research proof requires it | Not wired as a Node dependency. |
| Trafilatura | Not installed by npm | `scripts/install-open-source-stack.sh`, crawler docs | `pip install trafilatura` | Yes if using extraction stack | Optional/required for richer research | Not wired as a Node dependency. |
| ffmpeg | External executable | `src/lib/local-tools.ts`, media docs | `sudo apt-get install -y ffmpeg` | Yes for media processing | Required for video/audio post-processing | `FFMPEG_PATH` supported. |
| Rhubarb/lip-sync | Missing | No active adapter | Install binary and wire adapter | Yes for talking avatar | Required for talking avatar V1 proof | Current blocker for avatar video. |
| Local storage | Wired | `src/lib/storage-root.ts`, `src/lib/storage-driver.ts`, `src/lib/artifact-store.ts` | Set `AMARKTAI_STORAGE_ROOT` | Yes | Required | Stores intentional artifacts. |
| MySQL/MariaDB | Wired | `prisma/schema.prisma` | `npm run db:push` or migrations | Yes | Required | Prisma provider is MySQL. |
| Vector/memory stack | Partially wired | `src/lib/memory.ts`, `src/lib/retrieval-engine.ts`, `src/lib/federated-memory.ts`, `src/lib/vector-store.ts` | DB plus Redis/Qdrant env | Yes for full stack | Partial V1 | DB fallback exists; semantic proof needs Qdrant. |
| Avatar/video/music libraries | Partial | `src/lib/ai-capability-adapters.ts`, `src/lib/music-studio.ts`, `src/lib/long-form-video.ts` | Provider keys plus ffmpeg; lip-sync missing | Yes | Required for media V1 | Provider execution exists; local composition/lip-sync incomplete. |
