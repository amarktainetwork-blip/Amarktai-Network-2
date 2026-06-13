# V1 VPS Monitoring Readiness

## Endpoint and access

- Endpoint: `GET /api/admin/system/vps`
- Implementation: `src/lib/vps-monitor.ts`
- Authentication: logged-in admin session or `VPS_MONITOR_API_KEY`
- API-key headers: `X-AmarktAI-VPS-Key` or bearer token
- Secret handling: the key is never returned and comparison uses
  `timingSafeEqual`

## Current snapshot

The endpoint reports:

- CPU count, load average, and load-derived CPU percentage
- total/free RAM and used percentage
- disk total/free/used bytes and percentage
- host uptime
- PM2, Nginx, and MariaDB status
- Redis, Qdrant, FFmpeg, Node, and queue status
- storage root and artifact storage bytes
- check timestamp

## Upgrade warnings

Defaults are CPU 85%, RAM 85%, and disk 80%. Override them with
`VPS_WARNING_CPU_PERCENT`, `VPS_WARNING_RAM_PERCENT`, and
`VPS_WARNING_DISK_PERCENT`. Crossing a threshold adds a warning and sets
`upgradeRecommended=true`.

CPU percentage is a load-average estimate, not historical sampling.

## Production setup

Set `VPS_MONITOR_API_KEY` to a generated random secret and call only over HTTPS:

```bash
curl -H "X-AmarktAI-VPS-Key: $VPS_MONITOR_API_KEY" \
  https://amarktai.co.za/api/admin/system/vps
```

Do not expose this endpoint anonymously or include its key in frontend code.

## Remaining monitoring work

- PM2 output is bounded raw command output, not a normalized process schema.
- Data is point-in-time only; no time-series store or alert sender exists.
- Artifact usage has bytes but no independent growth threshold.
- External uptime monitoring and backup verification remain deployment work.

These are operational enhancements, not blockers for a truthful V1 snapshot.
