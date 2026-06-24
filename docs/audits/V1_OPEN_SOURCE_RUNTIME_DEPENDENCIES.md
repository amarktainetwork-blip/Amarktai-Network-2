# V1 Open-Source Runtime Dependency Audit

## Kept dependencies

| Package or runtime | Why needed | Representative use | Decision |
| --- | --- | --- | --- |
| `next` | HTTP routes, rendering, standalone build | `src/app`, route handlers | Keep |
| `react`, `react-dom` | Existing dashboard and public UI | page/component TSX | Keep |
| `tailwindcss`, `postcss`, `tailwind-merge`, `clsx` | Styling pipeline | config, CSS, UI helpers | Keep |
| `@fontsource-variable/inter` | Dashboard font asset | global CSS and dashboard layout | Keep |
| `lucide-react` | Existing UI icons | dashboard/public components | Keep |
| `prisma`, `@prisma/client` | MariaDB schema and DB stores | Prisma schema and client | Keep |
| Prisma MySQL engine | MariaDB protocol | datasource `provider = "mysql"` | Keep; no `mysql2` needed |
| `iron-session` | Admin cookie sessions | session library and middleware | Keep |
| `vitest` | Unit and contract proof | `src/lib/__tests__` | Keep |
| `bullmq`, `ioredis` | Queue and Redis connection | job queue and Redis library | Keep |
| `zod` | Runtime validation | API routes and capability inputs | Keep |
| `bcryptjs` | Password hashing | admin authentication | Keep |
| `nodemailer` | Configured email delivery | notification helpers | Keep |
| `playwright` | Existing crawl/render runtime | local tools and crawlers | Keep |
| `@qdrant/js-client-rest` | Vector-store integration | `vector-store.ts` | Keep |
| `sentiment` | Emotion analysis | emotion engine | Keep |
| Node `crypto` | HMAC, signing, vault encryption | webhook verifier, crypto vault | Keep |
| Node `fs`, `path` | Local VPS storage | storage and artifact modules | Keep |
| Native `fetch`, `FormData`, `Blob`, `File`, `Buffer` | Provider HTTP and Studio uploads | adapters and media routes | Keep |

## Removed stale direct dependencies

These packages had no imports anywhere outside `package.json` and the lockfile:

- `@fontsource-variable/space-grotesk`
- `@hookform/resolvers`
- ten unused `@radix-ui/react-*` packages
- `class-variance-authority`
- `date-fns`
- `framer-motion`
- `react-hook-form`
- `recharts`
- `socket.io`
- `socket.io-client`

The package-manager operation removed 19 direct packages and 122 transitive
packages. The audit reported zero known vulnerabilities afterward.

## Missing or deferred dependencies

- Prisma's MySQL engine provides MariaDB connectivity.
- Native web APIs cover multipart upload; Multer is not needed.
- No S3 SDK is required for V1. A future implementation belongs behind the
  existing `StorageDriver`.
- VPS installs must use `npm ci`, which clears development-only extraneous
  modules.
