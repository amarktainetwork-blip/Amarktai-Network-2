# AmarktAI Domain, DNS, Nginx, and VPS Layout

## Production domains

- Main platform: `amarktai.co.za`
- Main alias: `www.amarktai.co.za`
- Wildcard future apps: `*.amarktai.co.za`
- Examples: `marketing`, `travel`, `pets`, `health`, and `games`

## GoDaddy DNS

Create these records after the VPS has a stable public IPv4 address:

| Type | Name | Value | Purpose |
| --- | --- | --- | --- |
| A | `@` | `VPS_PUBLIC_IP` | Main platform |
| CNAME | `www` | `amarktai.co.za` | Main alias |
| A | `*` | `VPS_PUBLIC_IP` | Future app subdomains |

The wildcard covers future names such as `marketing`, `travel`, `pets`,
`health`, and `games`. Use a low TTL during cutover, then raise it after
verification. DNS resolution does not mean an app is deployed or ready.

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

Future apps can later route through an exact Nginx `server_name` and dedicated
port, or through an explicitly implemented app-slug landing layer. Do not
enable a subdomain server block until its process exists.

## Future app onboarding

1. Create `/var/www/amarktai/apps/<slug>`.
2. Register `<slug>.amarktai.co.za` in AmarktAI Connected Apps.
3. Generate the signing secret once and store it in the app runtime.
4. Assign minimum required capability scopes.
5. Configure the AmarktAI API base URL and signing secret.
6. Provision the app process and exact Nginx `server_name`.
7. Send HMAC-signed capability requests and track returned jobs and artifacts.

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

Future app server blocks should use a separate upstream and exact
`server_name`. The checked-in Nginx file contains a disabled wildcard template;
activate only a real route.

For a wildcard TLS certificate, use DNS-01 validation. HTTP-01 validation does
not issue wildcard certificates. Request both `amarktai.co.za` and
`*.amarktai.co.za`, because the wildcard does not cover the apex domain.

## Monitoring

Set a random `VPS_MONITOR_API_KEY` and call:

```bash
curl -H "X-AmarktAI-VPS-Key: $VPS_MONITOR_API_KEY" \
  https://amarktai.co.za/api/admin/system/vps
```

The response reports CPU, RAM, disk, uptime, PM2, Nginx, MariaDB, queue and
storage health, artifact storage bytes, warning thresholds, and upgrade advice.
