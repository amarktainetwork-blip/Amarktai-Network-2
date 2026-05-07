# Phase 1 Platform Truth Stabilization

## What Changed

- Kept the dashboard architecture at exactly six sections: Studio, Workbench, Apps & Agents, Memory & Learning, Operations, Settings.
- Added a Settings truth source that reports only approved visible AI providers plus tools/services and counts only configured entries with a test/status route.
- Added a route truth registry in `src/lib/platform-route-registry.ts` and mirrored it in `docs/audits/PHASE_1_ROUTE_TRUTH_MAP.md`.
- Unified storage root resolution through `src/lib/storage-root.ts`.
- Protected `/api/tools` with the admin session policy.
- Fixed the Firecrawl tool registry endpoint to the existing research route.
- Added a GenX execution guard so `auto:*` aliases resolve before chat/media calls.
- Made Studio tabs truthful: unwired media tabs say `Backend route available, UI wiring pending` or `Not implemented`.
- Made Apps & Agents stop showing an unsaved fallback app as a real app record.
- Made Operations provider health derive from runtime truth and show only approved visible AI providers.
- Kept adult capability app-policy based with no separate adult key requirement.

## What Was Kept

- Existing backend capability routes.
- Existing admin login/session protection.
- Existing guarded Repo Workbench backend flow.
- Existing app AI package backend store.
- Existing required agent registry.
- Existing forensic history.

## Deprecated Or Archived

- No useful forensic docs were deleted.
- No app/backend routes were deleted in Phase 1.
- Duplicate route families are documented for later consolidation instead of being removed unsafely.

## Remaining For Phase 2

- Wire Studio media tabs to real protected backend routes with persistence.
- Add durable Workbench job rehydration before claiming persisted UI state.
- Build create/edit/assignment UI for Apps & Agents on top of existing backend stores.
- Consolidate model/routing duplicate route families after Studio and Workbench use the same route.
- Add provider-specific live tests for providers that currently have only key presence/status truth.

## Remaining For Phase 3

- Live VPS proof with production credentials.
- Deployment smoke tests on the real domain and services.
- Final monitoring/alert tuning after live jobs, artifacts, and provider runs exist.

## Route Truth Summary

See `docs/audits/PHASE_1_ROUTE_TRUTH_MAP.md`.

## Required Environment Variables

- `SESSION_SECRET`
- `DATABASE_URL`
- `VAULT_ENCRYPTION_KEY`
- `AMARKTAI_STORAGE_ROOT`
- `GENX_API_KEY`
- `GITHUB_TOKEN`
- Optional approved provider keys: `HUGGINGFACE_API_KEY`, `HUGGINGFACEHUB_API_TOKEN`, `HF_TOKEN`, `QWEN_API_KEY`, `DASHSCOPE_API_KEY`, `MINIMAX_API_KEY`, `MIMO_API_KEY`, `GROQ_API_KEY`, `TOGETHER_API_KEY`, `OPENAI_API_KEY`
- Tool/service keys: `WEBDOCK_API_KEY`, `FIRECRAWL_API_KEY`
- Workbench guards: `REPO_WORKBENCH_ALLOW_MERGE`, `REPO_WORKBENCH_ALLOW_DEPLOY`

## Verification Commands

```bash
git status
npm run build
npm run lint
npm test
curl -I https://amarktai.com/admin/dashboard
curl -i https://amarktai.com/api/admin/runtime-truth
curl -i https://amarktai.com/api/health
```
