# AmarktAI V1 Operating Truth

This file is the plain-language operating reference for future ChatGPT, Codex,
Cline, developers, and operators working on AmarktAI.

## What AmarktAI is

AmarktAI is the main AI operating system and capability engine. Users and
connected apps request AmarktAI capabilities. AmarktAI plans the route, enforces
policy and scopes, runs or queues the work, and returns a result, job, or
artifact.

AmarktAI is not GenX, Hugging Face, Qwen/DashScope/Wan, Groq, Together AI, or
Xiaomi MiMo. Those services are internal backend providers. They must not
become the product identity or the direct app-facing contract.

## Current V1 product truth

The main platform is `https://amarktai.co.za`, with
`https://www.amarktai.co.za` as its public alias.

The V1 dashboard sections are:

- Command Center
- Studio
- Capabilities
- Connected Apps
- Artifacts
- Jobs
- Settings

V1 does not include App Builder, Repo Workbench, MCP, or a provider
marketplace. Do not reintroduce them through navigation, cards, placeholder
routes, or parallel product layers.

## VPS folder truth

```text
/var/www/amarktai/platform
/var/www/amarktai/apps/<app-slug>
/var/www/amarktai/storage
/var/www/amarktai/logs
/var/www/amarktai/backups
```

The platform repository and production process live under `platform`. Future
subdomain apps live under `apps/<app-slug>`. Storage, logs, and backups remain
outside release directories so deployments do not erase persistent data.

## Adding a future app

1. Create `/var/www/amarktai/apps/<slug>`.
2. Use `<slug>.amarktai.co.za`; wildcard DNS already points subdomains to the VPS.
3. Register the app in AmarktAI Connected Apps.
4. Generate the signing secret once and store it securely in the app runtime.
5. Configure the app with the AmarktAI API base URL and signing secret.
6. Assign only the capability scopes the app needs.
7. Add a dedicated process and Nginx `server_name` rule when the app is ready.
8. Send HMAC-signed capability requests to AmarktAI.
9. Track the returned execution, job, artifact, and result references.

DNS resolving is not proof that an app is deployed. Do not enable an Nginx app
route, readiness state, or connected-app card until the process and signing
configuration are real.

## How apps talk to AmarktAI

Connected apps use HMAC-signed requests and scoped capabilities. Requests are
capability-first, not provider-first. Apps do not call raw providers or models
directly. AmarktAI performs routing and policy checks and returns truthful job,
artifact, result, or configuration status.

## Storage truth

V1 uses local VPS storage:

```text
AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage
```

Studio, jobs, connected apps, and artifacts use the storage adapter. Cloud or
S3-compatible storage can be added later through that adapter. Future code must
not hardwire product features directly to local filesystem paths.

## Provider and routing truth

Providers are internal backend adapters. Users do not choose raw providers in
the main product experience. Routing policy supports `cheap`, `balanced`,
`premium`, and `auto`. GenX is an important approved provider, but it is not the
hardcoded answer for every capability.

## Deployment truth

- Maintain one clean repository and one source of product truth.
- Run one PM2 process for the main platform.
- Maintain one Nginx configuration for the main domain and prepared wildcard
  subdomain handling.
- Route `amarktai.co.za` and `www.amarktai.co.za` to the platform on port 3000.
- Route future apps by exact `server_name` or an explicitly implemented app-slug
  landing layer.
- HTTPS is required for secure admin sessions and connected-app traffic.
- A wildcard certificate requires DNS validation; ordinary HTTP validation
  cannot issue `*.amarktai.co.za`.

## DNS truth

The GoDaddy plan is:

| Type | Host | Target |
| --- | --- | --- |
| A | `@` | VPS public IP |
| CNAME | `www` | `amarktai.co.za` |
| A | `*` | VPS public IP |

Examples covered by the wildcard include `marketing`, `travel`, `pets`,
`health`, and `games`.

## Do not reintroduce

- the old `Amarktai` product spelling; use `AmarktAI`
- provider marketing as the product identity
- fake connected-app cards or fake readiness
- App Builder, Repo Workbench, MCP, or a provider marketplace in V1
- old docs or tests that protect superseded product truth
- direct provider/model calls from connected apps
- a second router, storage system, capability taxonomy, or dashboard

