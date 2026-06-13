# AmarktAI Domain, DNS, Nginx, and VPS Layout

## Production domains

- Main platform: `amarktai.co.za`
- Main alias: `www.amarktai.co.za`
- Reserved future apps: `marketing`, `travel`, `pets`, `health`, and `games`

## GoDaddy DNS

Create these records after the VPS has a stable public IPv4 address:

| Type | Name | Value | Purpose |
| --- | --- | --- | --- |
| A | `@` | `VPS_PUBLIC_IP` | Main platform |
| CNAME | `www` | `amarktai.co.za` | Main alias |
| CNAME | `marketing` | `amarktai.co.za` | Future app |
| CNAME | `travel` | `amarktai.co.za` | Future app |
| CNAME | `pets` | `amarktai.co.za` | Future app |
| CNAME | `health` | `amarktai.co.za` | Future app |
| CNAME | `games` | `amarktai.co.za` | Future app |

If CNAME records are unsuitable, create individual A records for the subdomains
that point to the same VPS IPv4 address. Use a low TTL during cutover, then
raise it after verification.

## VPS folders

```text
/var/www/amarktai/
|-- platform/          # This repository and the V1 Next.js process
|-- apps/
|   `-- <app-slug>/    # Future independently deployed subdomain apps
|-- storage/           # Persistent artifacts, uploads, jobs, and workspaces
|-- logs/              # Application-owned logs
`-- backups/           # Database and storage backup staging
```

The platform runs on port `3000`. Reserved future mappings are:

- `marketing.amarktai.co.za` -> `127.0.0.1:3101`
- `travel.amarktai.co.za` -> `127.0.0.1:3102`

Do not enable a subdomain server block until its process exists.

## Nginx and TLS

The checked-in `deploy/nginx.conf` serves `amarktai.co.za` and
`www.amarktai.co.za` on port `3000`. After DNS resolves:

```bash
apt-get install -y nginx certbot python3-certbot-nginx
cp /var/www/amarktai/platform/deploy/nginx.conf /etc/nginx/sites-available/amarktai
ln -sfn /etc/nginx/sites-available/amarktai /etc/nginx/sites-enabled/amarktai
nginx -t
systemctl reload nginx
certbot --nginx -d amarktai.co.za -d www.amarktai.co.za
```

Future app server blocks should use a separate upstream and certificate name.

## Monitoring

Set a random `VPS_MONITOR_API_KEY` and call:

```bash
curl -H "X-AmarktAI-VPS-Key: $VPS_MONITOR_API_KEY" \
  https://amarktai.co.za/api/admin/system/vps
```

The response reports CPU, RAM, disk, uptime, PM2, Nginx, MariaDB, queue and
storage health, artifact storage bytes, warning thresholds, and upgrade advice.
