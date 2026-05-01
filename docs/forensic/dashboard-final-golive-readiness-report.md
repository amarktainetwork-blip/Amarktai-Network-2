# Dashboard Final Go-Live Readiness Report

**Date:** 2026-05-01  
**Branch:** `copilot/fix-dashboard-runtime-wiring` (to be merged as `finish-dashboard-adult-mcp-repo-voice-golive`)  
**Prepared by:** Copilot Agent

---

## COMPLETED

- [x] **Phase 1 — Runtime truth wiring**: All 9 dashboard sections (Overview, Command Center, Repo Workbench, AI Engine, Media Studio, Apps & Agents, Artifacts & Jobs, System Health, Settings) fetch from live API endpoints. No static provider/model/key state in page components.
- [x] **Phase 2 — Settings as single setup page**: All key/provider/feature configuration lives in `/admin/dashboard/settings`. Sections: AI Engine, GitHub, Storage, Adult Mode, Service Integrations (Firecrawl, Mem0, Qdrant, PostHog, SMTP), Providers, Webdock.
- [x] **Phase 3 — Adult Mode zero-blocker audit**: Adult mode disabled globally by default. Adult capability routes only to approved specialist providers (Together AI, HuggingFace, Replicate, xAI/Grok). Provider test required before "Ready" status. Safety exclusions documented and enforced in content-filter.
- [x] **Phase 4 — Repo Workbench simplified**: Full guided numbered flow (① Connect GitHub → ② Select Repo → ③ Workspace → ④ Agent → ⑤ Task → ⑥ Diff → ⑦ Checks → ⑧ Commit/Push/PR → ⑨ Deploy). Agent/model selector (GenX Best / Cheap / Balanced / Premium) with estimated cost shown before run. Delete/Archive/Reset/Clear workspace management buttons with proper confirmation gates.
- [x] **Phase 5 — MCP/Tools/Webhooks audit**: `docs/forensic/mcp-tools-webhooks-audit.md` created. System Health → MCP/Tools tab shows honest status: not wired yet, no fake tool calls.
- [x] **Phase 6 — Streaming voice audit**: Media Studio Voice tab clearly shows "Batch TTS: Ready / Streaming: Pending realtime service". Streaming mode button is disabled (not fake). Batch TTS routes to `/api/brain/tts`.
- [x] **Phase 7 — Media Studio complete check**: Images (Recraft v3, Grok Imagine, DALL-E 3), Video (Veo 2, Kling, etc. with cost warning), Voice (batch TTS with provider/model/speed selector + streaming pending), Music (blueprint-only if no real provider), History (from `/api/admin/artifacts`).
- [x] **Phase 8 — Duplicate pages redirected**: access→settings, deployments→repo-workbench, emotions→system-health, events→system-health, integrations→settings, intelligence→ai-engine, voice→media-studio, genx-models→ai-engine, brain→ai-engine, build-studio→repo-workbench, workspace→dashboard, settings/aiva-avatar→settings. Nav has exactly 9 sections.
- [x] **Phase 9 — Completion report**: This document.
- [x] **Phase 10 — Tests**: 41 new dashboard go-live tests added in `src/lib/__tests__/dashboard-golive.test.ts`. All 1415 tests pass.

---

## LEFT TO DO

- [ ] **MCP / Tool Registry**: Full MCP protocol layer, tool registry schema, per-app/agent tool permissions, destructive tool confirmation flows, tool call logs, webhook registry — **not implemented**. See `docs/forensic/mcp-tools-webhooks-audit.md`.
- [ ] **Streaming TTS**: Requires `REALTIME_SERVICE_URL` env var and a running realtime service. Backend route `/api/realtime/session` exists but service not provisioned. Status is truthfully shown as pending.
- [ ] **Video generation UI activation**: Video generation routes exist and are wired via async job pipeline. UI button is intentionally disabled until GenX key with video quota is confirmed to be active. Un-gate once quota is confirmed.
- [ ] **Music generation**: If no real music/audio provider is configured, output is lyrics/blueprint only. Suno/Udio/MusicGen integration not yet wired to a real endpoint.
- [ ] **Adult Mode provider test passing**: Adult mode status will show "Ready" once a specialist provider key (Together AI, HuggingFace, Replicate, or xAI/Grok) is configured AND the provider test passes in Settings → Adult Mode.
- [ ] **Deploy actions**: Repo Workbench deploy section is disabled until `ENABLE_DEPLOY_ACTIONS=true` is set in environment. Exact blocker shown in UI.
- [ ] **Settings tabs structure**: Settings currently uses a vertical section layout. If tabbed UI is desired (Primary Gateway / Fallback Providers / GitHub & Deploy / Media Providers / Adult Mode / Research & Memory / VPS / Webdock / Security & Feature Flags) — those 8 tabs need to be added as a UI navigation layer over the existing sections.

---

## GO/NO-GO

**NO-GO for fully unmanned production** — but **GO for admin use tonight** with the following caveats:

1. Admin dashboard is functional and truthful — no fake features visible.
2. GenX key must be active to unlock AI engine, media generation, repo workbench agent.
3. Adult mode requires a passing provider test before it shows "Ready".
4. Streaming voice is correctly marked pending.
5. MCP/tools are correctly marked not wired.
6. Deploy is gated by `ENABLE_DEPLOY_ACTIONS`.

---

## Adult Mode

| Item | Status |
|---|---|
| global enabled | ❌ Disabled by default |
| app scoped | ✅ Per-app `adultMode` config |
| provider | Together AI / HuggingFace / Replicate / xAI/Grok |
| provider test | ✅ Required — `/api/admin/settings/test-adult` |
| blockers | Provider key must be set AND test must pass before "Ready" |
| safety exclusions | ✅ Minors, age-ambiguous, non-consensual, explicit sex acts, real-person deepfake, illegal content — all hardcoded blocked in content-filter |
| GenX used for adult | ❌ Never — specialist provider only |

---

## Repo Workbench

| Item | Status |
|---|---|
| guided flow | ✅ Numbered 9-step flow ① through ⑨ |
| agent/model selector | ✅ GenX Best / Cheap / Balanced / Premium with description + est. cost |
| delete/archive/reset | ✅ All 3 implemented with confirmation gates |
| clear failed jobs | ✅ Implemented |
| deploy status | ✅ Disabled unless ENABLE_DEPLOY_ACTIONS=true — exact blocker shown |
| blockers | None if GitHub token + GenX key configured |

---

## MCP/Tools/Webhooks

| Item | Status |
|---|---|
| implemented | ❌ Not yet |
| wired | ⚠️ Partial: GitHub tools in Repo Workbench, media tools in brain routes |
| missing | Tool registry, per-app/agent scoping, confirmation hooks, tool logs, webhooks, MCP protocol |
| UI placeholder | ✅ System Health → MCP/Tools tab shows honest status |

---

## Voice

| Item | Status |
|---|---|
| batch TTS | ✅ Ready — `/api/brain/tts` wired to Groq, OpenAI, Gemini, HuggingFace |
| STT | ✅ `/api/brain/stt` and `/api/voice/stt` routes exist |
| streaming | ⏳ Pending — requires REALTIME_SERVICE_URL + realtime service |
| UI | ✅ Provider/model/voice/language/speed selector + batch mode active + streaming clearly pending |
| blockers | None for batch TTS; realtime service needed for streaming |

---

## Media

| Item | Status |
|---|---|
| image | ✅ Recraft v3, Grok Imagine, DALL-E 3 via GenX — requires GenX key |
| video | ⚠️ Routes exist (Veo 2, Kling, etc.) — UI button disabled until GenX video quota confirmed |
| voice | ✅ Batch TTS ready — streaming pending |
| music | ⚠️ Blueprint-only if no real music provider configured |
| adult | ⚠️ Ready only after specialist provider test passes |
| blockers | GenX key required for all; video quota required for video |

---

## Duplicates

| Item | Status |
|---|---|
| removed/hidden | access, deployments, emotions, events, integrations, intelligence, voice (login), genx-models, brain, build-studio, workspace, settings/aiva-avatar |
| Nav sections | Exactly 9 canonical sections |
| remaining duplicates | None visible in nav |

---

## Settings

| Item | Status |
|---|---|
| one setup page | ✅ `/admin/dashboard/settings` is the only configuration page |
| duplicate setup pages removed | ✅ All redirected to settings or canonical target |
| sections covered | AI Engine / GenX key, GitHub & Deploy, Storage, Adult Mode, Service Integrations (Firecrawl/Crawl4AI/Mem0/Qdrant/PostHog/SMTP), Provider keys (fallback), Webdock |
| blockers | None |

---

## Tests

| Test | Result |
|---|---|
| `npm run lint` | ✅ No errors (2 pre-existing `<img>` warnings in build-studio tabs, unrelated) |
| `npm test` | ✅ 1415 tests passed, 44 test files, 0 failures |
| `npm run build` | ✅ Build succeeded, no TypeScript or compilation errors |

**New tests added:** `src/lib/__tests__/dashboard-golive.test.ts` — 41 tests covering:
- Nav has exactly 9 sections
- Aiva hidden by default
- All duplicate pages redirect correctly (12 pages)
- Repo Workbench: agent presets, cost estimate, delete/archive/reset/clear, deploy blocker
- Adult Mode: settings section, provider test required, media studio gating
- Voice: batch/streaming mode, streaming disabled, /api/brain/tts wired, provider selector
- System Health: MCP tab present and honest
- Settings: all sections present, no other page has key config forms
