# FINAL LIVE RUNTIME PROOF

Date: 2026-05-07 (UTC)
Branch audited: `fix/final-live-runtime-proof`
Repo HEAD after `git pull origin main`: `4e900f95c9ba0f6fabeba0121258ddf4896153ee`
PR #62 merge proof: `4e900f9 Merge pull request #62 from amarktainetwork-blip/fix/phase-2-real-studio-workbench`

## Deployed commit

- **Live deployed commit:** **UNVERIFIED (BLOCKED)**
- Reason: audit runner could not resolve DNS for `amarktai.com`, so deployed host could not be reached.

## Service status

- **systemd service name:** expected from repo deploy files: `amarktai` (web), `amarktai-realtime` (realtime)
- **systemd live status:** **UNVERIFIED (BLOCKED)** (no VPS shell/systemctl access in this audit session)
- **Nginx routes live status:** **UNVERIFIED (BLOCKED)** (no VPS shell/nginx access)
- **Build directory served truth:** **UNVERIFIED (BLOCKED)** (no VPS filesystem access)

## Domain results

| URL | Result |
|---|---|
| `https://amarktai.com/` | DNS resolution failed (`curl: Could not resolve host`) |
| `https://amarktai.com/admin/login` | DNS resolution failed (`curl: Could not resolve host`) |
| `https://amarktai.com/admin/dashboard` | DNS resolution failed (`curl: Could not resolve host`) |
| `https://amarktai.com/api/health` | DNS resolution failed (`curl: Could not resolve host`) |
| `https://amarktai.com/api/health/ping` | DNS resolution failed (`curl: Could not resolve host`) |
| `https://amarktai.network/` | DNS resolution failed (`curl: Could not resolve host`) |

## Auth/session proof

- **Admin login live proof:** **UNVERIFIED (BLOCKED)** (domain unreachable).
- **Dashboard + six sections live proof:** **UNVERIFIED (BLOCKED)** (domain unreachable).
- **Protected API 401 without session:** live **UNVERIFIED**; code path exists (`401 Unauthorized` in protected routes).
- **Protected API with session:** **UNVERIFIED (BLOCKED)**.

## Settings/provider truth table

Legend:
- Key exists = could be checked live in Settings
- Test route exists = route present in code
- Live test result = runtime execution against deployed service
- Settings status label / connected count = live UI/API truth

| Provider | Key exists | Test route exists | Live test result | Settings status label | Connected count accuracy |
|---|---|---|---|---|---|
| GenX | Unverified | `/api/admin/settings/test-genx` | Unverified (blocked) | Unverified | Unverified |
| Hugging Face | Unverified | `/api/admin/provider-capability-test` (generic) | Unverified (blocked) | Unverified | Unverified |
| Qwen/DashScope | Unverified | `/api/admin/provider-capability-test` (generic/specialist) | Unverified (blocked) | Unverified | Unverified |
| MiniMax/Mimo | Unverified | `/api/admin/provider-capability-test` (generic/specialist) | Unverified (blocked) | Unverified | Unverified |
| Groq | Unverified | `/api/admin/provider-capability-test` (generic) | Unverified (blocked) | Unverified | Unverified |
| Together AI | Unverified | `/api/admin/provider-capability-test` (generic) | Unverified (blocked) | Unverified | Unverified |
| OpenAI | Unverified | `/api/admin/provider-capability-test` (generic) | Unverified (blocked) | Unverified | Unverified |
| GitHub | Unverified | `/api/admin/settings/test-github` | Unverified (blocked) | Unverified | Unverified |
| Webdock | Unverified | `/api/admin/settings/test-webdock` | Unverified (blocked) | Unverified | Unverified |
| Firecrawl | Unverified | `/api/admin/provider-capability-test` (generic) | Unverified (blocked) | Unverified | Unverified |
| Storage | Unverified | `/api/admin/settings/test-storage` | Unverified (blocked) | Unverified | Unverified |

## GenX proof

- GenX catalog: **UNVERIFIED (BLOCKED)**.
- GenX chat: **UNVERIFIED (BLOCKED)**.
- GenX streaming in Studio Chat: **UNVERIFIED (BLOCKED)**.
- `auto:*` alias isolation from GenX execution: **UNVERIFIED LIVE** (code-level only, not live-proven).
- Image/video endpoint truthfulness: **UNVERIFIED LIVE**.

## Studio proof table

| Studio area | Live proof |
|---|---|
| Chat | Unverified (blocked) |
| Coding handoff to Workbench | Unverified (blocked) |
| Research + artifact save | Unverified (blocked) |
| Image + artifact | Unverified (blocked) |
| Video job/blocker truth | Unverified (blocked) |
| Music/Audio | Unverified (blocked) |
| Voice/TTS | Unverified (blocked) |
| STT upload + transcript | Unverified (blocked) |
| Avatar/Talking Video truthful missing-backend state | Unverified (blocked) |
| Adult routes truthful behavior | Unverified (blocked) |
| Artifacts list + links + VPS files | Unverified (blocked) |

## Workbench proof table

| Workbench check | Live proof |
|---|---|
| Repo list | Unverified (blocked) |
| Branch list | Unverified (blocked) |
| Import/sync | Unverified (blocked) |
| Plan | Unverified (blocked) |
| Patch | Unverified (blocked) |
| Review diff | Unverified (blocked) |
| Apply patch | Unverified (blocked) |
| Checks | Unverified (blocked) |
| Commit | Unverified (blocked) |
| Push | Unverified (blocked) |
| Create PR + URL open | Unverified (blocked) |
| Rehydrate latest job | Unverified (blocked) |
| Token redaction + guarded merge/deploy/main push | Unverified live (blocked) |

## Storage proof

- `AMARKTAI_STORAGE_ROOT` usage exists in code path.
- Live writable/readable proof on VPS: **UNVERIFIED (BLOCKED)**.
- Artifact/read logs from VPS storage: **UNVERIFIED (BLOCKED)**.
- No ephemeral build-dir production storage: **UNVERIFIED (BLOCKED)**.

## Operations proof

- Provider health truthfulness: **UNVERIFIED (BLOCKED)**.
- Storage/jobs/artifacts counters truthfulness: **UNVERIFIED (BLOCKED)**.
- Webdock connected-only-after-test: **UNVERIFIED (BLOCKED)**.
- No fake production-ready statuses: **UNVERIFIED (BLOCKED)**.

## Apps & Agents proof

- Required registry existence and truthful UI state: **UNVERIFIED (BLOCKED)**.
- Package store behavior: **UNVERIFIED (BLOCKED)**.
- Phase 3 remaining items are still applicable pending live runtime proof.

## Blockers found

1. Audit environment cannot resolve external DNS hosts (`amarktai.com`, `amarktai.network`), so all required live URL checks are blocked.
2. No direct VPS shell access in this session, so systemd/nginx/filesystem deployment truth checks are blocked.
3. No live authenticated browser/admin session possible while domain is unreachable.

## Blockers fixed (targeted)

1. Updated docs/env defaults from `amarktai.network` to `amarktai.com` where safe:
   - `.env.example` (`NEXT_PUBLIC_APP_URL`, `ADMIN_EMAIL`, SMTP example/comment)
   - `README.md` admin fallback email references

## Blockers remaining

1. Live domain is still unreachable from audit environment (DNS).
2. Deployed commit/service/nginx/build-dir truth not proven on VPS.
3. Full live auth/session, Studio, Workbench, Settings/provider, Storage, Operations, and Apps/Agents runtime proofs remain incomplete.

## Exact commands run

```bash
git --no-pager status -sb
git checkout main
git pull origin main
git --no-pager log --oneline -5
git rev-parse HEAD
git checkout -B fix/final-live-runtime-proof

npm ci
npm run build
npm run lint
npm test

curl -sS -L -o /tmp/resp_body -w "HTTP %{http_code}\n" https://amarktai.com/
curl -sS -L -o /tmp/resp_body -w "HTTP %{http_code}\n" https://amarktai.com/admin/login
curl -sS -L -o /tmp/resp_body -w "HTTP %{http_code}\n" https://amarktai.com/admin/dashboard
curl -sS -L -o /tmp/resp_body -w "HTTP %{http_code}\n" https://amarktai.com/api/health
curl -sS -L -o /tmp/resp_body -w "HTTP %{http_code}\n" https://amarktai.com/api/health/ping
curl -sS -L -o /tmp/resp_body -w "HTTP %{http_code}\n" https://amarktai.network/
```

## Local verification results

- `npm run build` ✅ passed
- `npm run lint` ✅ passed
- `npm test` ✅ passed (40 files, 1200 tests)

## Final verdict

**Do not polish frontend yet. Fix runtime blockers first.**
