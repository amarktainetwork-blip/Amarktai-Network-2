# AmarktAI V1 Operating Truth

This is the durable product and VPS operating reference. The root
`README_VPS_AMARKTAI_OPERATING_TRUTH.md` contains the same rules in a
chat-friendly location.

## Product identity

AmarktAI is the main AI operating system and capability engine. Users and apps
call AmarktAI capabilities. GenX, Hugging Face, Qwen/DashScope/Wan, Groq,
Together AI, and Xiaomi MiMo are internal backend providers, not the product
identity and not direct connected-app dependencies.

## V1 surface

The platform runs at `amarktai.co.za`; `www.amarktai.co.za` is its public alias.
The V1 dashboard contains Command Center, Studio, Capabilities, Connected Apps,
Artifacts, Jobs, and Settings.

V1 has no App Builder, Repo Workbench, MCP, or provider marketplace.

## VPS layout

```text
/var/www/amarktai/platform
/var/www/amarktai/apps/<app-slug>
/var/www/amarktai/storage
/var/www/amarktai/logs
/var/www/amarktai/backups
```

The main platform uses one repository and one PM2 process. Persistent storage,
logs, and backups stay outside the release directory.

## Wildcard domain architecture

GoDaddy DNS:

| Type | Host | Target |
| --- | --- | --- |
| A | `@` | VPS public IP |
| CNAME | `www` | `amarktai.co.za` |
| A | `*` | VPS public IP |

The wildcard makes names such as `marketing.amarktai.co.za`,
`travel.amarktai.co.za`, `pets.amarktai.co.za`, `health.amarktai.co.za`, and
`games.amarktai.co.za` resolve to the VPS. Resolution alone does not deploy an
app. Nginx must later route an exact `server_name` to a real process, or a
deliberate app-slug landing layer must be implemented.

The main platform routes to port 3000. Example future processes may use port
3101 for marketing and 3102 for travel. Unknown wildcard hosts must not claim a
fake working app.

Use HTTPS for admin and connected-app traffic. A certificate for
`*.amarktai.co.za` requires DNS-01 validation. The apex
`amarktai.co.za` must be included separately because a wildcard certificate
does not cover the apex name.

## Future app onboarding

1. Create `/var/www/amarktai/apps/<slug>`.
2. Select `<slug>.amarktai.co.za`.
3. Register the app in Connected Apps.
4. Generate its signing secret once and store it securely.
5. Configure the AmarktAI API base URL and signing secret in the app.
6. Assign minimum required capability scopes.
7. Provision the app process and exact Nginx `server_name`.
8. Send HMAC-signed, capability-first requests.
9. Track returned execution, job, artifact, and result references.

Connected apps never call raw providers or models. AmarktAI owns provider
routing, policy, jobs, artifacts, and truthful readiness.

## Storage and routing

V1 storage is local VPS storage at:

```text
AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage
```

All callers use the storage adapter. S3-compatible storage can be added later
without rewriting Studio or artifact workflows. Do not hardwire new features to
local paths.

Routing policy supports `cheap`, `balanced`, `premium`, and `auto`. Providers
remain internal adapters. GenX is important but is not hardcoded for every
capability.

## MariaDB production truth

The Prisma datasource uses `provider = "mysql"` and V1 production uses
MariaDB. Install and start `mariadb-server`, then create the application
database and user:

```sql
CREATE DATABASE amarktai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'amarktai'@'127.0.0.1' IDENTIFIED BY 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON amarktai.* TO 'amarktai'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Configure:

```text
DATABASE_URL="mysql://amarktai:STRONG_PASSWORD@127.0.0.1:3306/amarktai"
```

Replace the placeholder password, then run `npm ci`, `npx prisma generate`,
`npx prisma validate`, `npx prisma db push`, and a `SELECT 1` through
`prisma db execute`.

## Guardrails for future work

Do not reintroduce the old `Amarktai` spelling, provider marketing, fake
connected-app cards, fake readiness, App Builder, Repo Workbench, MCP, a
provider marketplace, direct provider calls, duplicate routing/storage/truth
layers, or obsolete docs and tests that preserve the wrong V1 product.
