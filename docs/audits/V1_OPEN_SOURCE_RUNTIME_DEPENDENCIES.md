# V1 Open-Source Runtime Dependency Audit

| Package or runtime | Why V1 needs it | Current use | Decision |
| --- | --- | --- | --- |
| Next.js 15 | HTTP routes, server rendering, standalone production server | `src/app`, API route handlers, `next.config.mjs` | Keep |
| React 18 / React DOM | Dashboard and public UI | `src/app/**/*.tsx`, `src/components` | Keep |
| Prisma 5 / `@prisma/client` | MariaDB schema and DB access | `prisma/schema.prisma`, `src/lib/prisma.ts`, artifact/job/profile stores | Keep |
| MariaDB/MySQL connector | Production SQL protocol | Prisma's `mysql` datasource and bundled query engine | Keep through Prisma; do not add `mysql2` unless a non-Prisma SQL caller is introduced |
| iron-session | Admin cookie sessions | `src/lib/session.ts`, `src/middleware.ts` | Keep |
| Vitest | Unit and contract proof | `src/lib/__tests__` | Keep |
| Tailwind CSS / PostCSS | Existing dashboard styling and production CSS build | `tailwind.config.ts`, `postcss.config.mjs`, page components | Keep |
| Node `fs` / `path` | Local VPS storage adapter | `src/lib/storage-driver.ts`, `src/lib/local-json-store.ts` | Keep; no external filesystem package is needed |
| BullMQ | Durable Redis-backed job queue abstraction | `src/lib/job-queue.ts` | Keep |
| ioredis | Queue and Redis connectivity | `src/lib/redis.ts`, BullMQ setup | Keep |
| Zod | Request validation | Brain, integration, and admin API routes | Keep |
| Playwright | Local crawl/render capability | crawler and browser routes; provider mesh local tool entry | Keep |
| Native `FormData`, `Blob`, `File`, `Buffer` | Studio image/audio/video upload and provider multipart requests | Studio STT, provider adapters, media routes | Keep; no Multer dependency is required for Next.js route handlers |
| Native `fetch` | Approved provider HTTP adapters and remote artifact retrieval | capability adapters, artifact store, provider tests | Keep |

## Missing dependencies

No additional open-source package is required for the requested V1 runtime.
Prisma supplies MariaDB/MySQL connectivity, Node supplies local filesystem and
multipart primitives, and the existing BullMQ/ioredis pair covers queued work.

## Removed or deferred dependencies

- MongoDB and Mongoose are not dependencies and are not part of V1.
- An S3 SDK is intentionally deferred. The `StorageDriver` interface isolates
  Studio, jobs, and artifacts from the active `local_vps` implementation, so an
  S3-compatible adapter can be added later without changing callers.
