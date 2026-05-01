# System Health / VPS / Deploy Audit

| Area | Status | Evidence | Blocker | Terminal/live checks |
| --- | --- | --- | --- | --- |
| systemd service | Partial | `deploy/amarktai-web.service` | not installed/verified on VPS | `systemctl status amarktai-web` |
| standalone Next static handling | Partial | deploy script copies standalone/static | not live verified | inspect `.next/standalone`, curl assets |
| Nginx config | Missing in repo | no nginx file found in deploy list | cannot verify reverse proxy | `nginx -t`, site conf check |
| health endpoints | Partial | `/api/health/ping`, `/api/health`, `/api/system/health-deep` | deep health not tied to all capabilities | curl all health routes |
| Webdock API | Partial | `/api/admin/vps`, settings test | key/live server not verified | call settings Webdock test |
| VPS metrics | Partial | dashboard calls `/api/admin/vps` | live permissions unknown | verify CPU/RAM/disk metrics |
| Redis/job queue | Partial/Missing | `job-queue.ts` exists | not universal queue; Redis health unclear | check Redis env/service |
| DB status | Partial | Prisma schema/tests | production DB not checked | `npx prisma db pull` or safe connection test |
| storage paths | Partial | storage driver tests | VPS permissions unknown | `ls -la /var/www/amarktai/storage /var/amarktai/workspaces` |
| artifacts storage | Partial | Artifact model/store | live persistence not verified | create/open/delete artifact |
| repo workspace storage | Partial | Repo Workbench root `/var/amarktai/workspaces` | permission not verified | import disposable repo |
| deployment scripts | Partial | `scripts/deploy_vps.sh` | not run in live audit | dry run/manual review |
| deploy API routes | Guarded | Repo Workbench deploy route | disabled unless env flag | verify disabled by default |
| GitHub workflow dispatch | Partial | github deploy helper | no workflow checked | list workflows |
| app uptime | Partial | app-health route | no external checks | curl app domains |
| provider health | Partial | genx/provider health routes | live keys unknown | run all provider tests |

Critical blockers: no live VPS verification, no Nginx config in repo, no proof of systemd install, no proof storage permissions, no deploy dry-run, no universal queue for long media jobs.

Optional blockers: Webdock metrics can be optional if VPS SSH/systemd checks are sufficient.
