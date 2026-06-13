# V1 Domain, VPS, Subdomain, Storage, and Monitoring Plan

## Implemented now

- Canonical main domains are `amarktai.co.za` and `www.amarktai.co.za`.
- Wildcard DNS is planned for `*.amarktai.co.za`; it prepares future names but
  does not claim that any future app is deployed.
- The checked-in Nginx configuration proxies both names to port `3000`.
- The deploy script uses `/var/www/amarktai/platform` and creates the shared
  `apps`, `storage`, `logs`, and `backups` directories.
- Local VPS storage is the V1 default at `/var/www/amarktai/storage`.
- Studio, connected apps, jobs, and artifacts call the `StorageDriver`
  interface. The active adapter is `local_vps`; adding an S3-compatible driver
  later does not require rewriting those callers.
- The read-only VPS snapshot supports admin-session authentication or
  `VPS_MONITOR_API_KEY`.
- Monitoring reports CPU, RAM, disk, uptime, PM2, Nginx, MariaDB, queue and
  auxiliary service status, artifact storage usage, thresholds, and upgrade
  warnings.

## GoDaddy DNS plan

| Type | Host | Target |
| --- | --- | --- |
| A | `@` | VPS public IPv4 |
| CNAME | `www` | `amarktai.co.za` |
| A | `*` | VPS public IPv4 |

The wildcard covers marketing, travel, pets, health, games, and later app
slugs. Exact A records remain an optional override.

## Runtime layout

```text
/var/www/amarktai/platform
/var/www/amarktai/apps/<app-slug>
/var/www/amarktai/storage
/var/www/amarktai/logs
/var/www/amarktai/backups
```

## Nginx plan

- `amarktai.co.za`, `www.amarktai.co.za` -> port `3000` now.
- `marketing.amarktai.co.za` -> `127.0.0.1:3101` when that app is deployed.
- `travel.amarktai.co.za` -> `127.0.0.1:3102` when that app is deployed.
- Pets, health, and games remain DNS reservations until ports and processes are assigned.
- Future apps may use exact `server_name` blocks or a deliberate app-slug
  landing layer. No catch-all application router is implemented in this PR.
- Wildcard TLS requires DNS-01 validation and must include the apex domain as a
  separate certificate name.

## Monitoring thresholds

Defaults are CPU 85%, RAM 85%, and disk 80%. They can be overridden with
`VPS_WARNING_CPU_PERCENT`, `VPS_WARNING_RAM_PERCENT`, and
`VPS_WARNING_DISK_PERCENT`. Crossing a threshold sets
`upgradeRecommended=true`. CPU is a load-average estimate, not a sampling
daemon.

## Future work

- Provision each future app process, port, process-manager definition, Nginx
  server block, TLS certificate, deploy pipeline, and backup plan.
- Register each app in Connected Apps, generate its signing secret once, assign
  scopes, and configure HMAC-signed capability requests.
- Implement the S3-compatible `StorageDriver` when off-VPS replication is required.
- Add an external time-series collector if historical charts and alert delivery
  are required. V1 exposes a truthful point-in-time snapshot only.
