# Capability Governance And Root Workspace Implementation

## Root Workspace Rule

AmarktAI Network is now treated as the root admin workspace:

- `appSlug`: `amarktai-network`
- `type`: `root_admin_app`
- `access`: full
- Providers: all configured providers
- Models: all valid configured models
- Tools: all configured tools
- Agents: all internal agents
- Adult policy: controlled in Settings
- Memory: root/admin memory
- Workbench, Studio, and Operations: full access

Dashboard copy now states that AmarktAI Network is the root workspace and should not be added through app onboarding. `Add App` is reserved for future external managed apps.

## Final Provider Ownership Matrix

| Capability | Primary owner | Fallback owners | Route truth |
|---|---|---|---|
| Chat/reasoning/coding | GenX | OpenAI, Groq, Together | Studio stream and Workbench |
| Repo audit/PR/deploy | GitHub | GenX/OpenAI for reasoning | Workbench routes |
| Research/crawling | Firecrawl | Playwright, GenX/OpenAI summarization | Research routes |
| Browser QA | Playwright | None | Browser/runtime routes |
| Image | GenX | OpenAI, Qwen, HF, Together | Studio execute/image routes |
| Video/I2V | GenX | Qwen, MiniMax | Studio execute/video routes |
| Music/song | GenX Lyria | MiniMax after route wiring | `/api/admin/music-studio` |
| TTS/STT/voice selection | GenX | OpenAI, Groq, MiniMax | Studio execute, MiniMax specialist route |
| Embeddings/RAG | OpenAI | Hugging Face | Memory routes |
| Moderation | OpenAI | None | Policy routes |
| Adult text/image | Together/HF/OpenAI where policy allows | Provider-specific adult routes | Adult policy routes |
| Adult video/voice | Blocked | None | No production route |
| Artifacts | Storage | None | `/api/admin/artifacts` |
| Jobs/realtime | Redis | Storage fallback truth | Operations/runtime routes |

## Capability Governance Summary

Implemented `src/lib/provider-capability-governance.ts` as the single dashboard-facing source of truth for:

- root workspace identity
- approved providers
- route-present but not approved providers
- governed capabilities
- governed model catalog
- route presence
- sync/async/polling behavior
- artifact support
- capability ownership and fallback ownership
- blocked and unsupported capabilities
- manual provider/model validation

The model catalog route now returns `governance`, `rootWorkspace`, `workbenchModels`, blocked capabilities, underused capabilities, and route-present-not-approved provider visibility.

## GenX Fixes

- GenX live expected count is pinned to `58`.
- Governance table uses the 58 IDs from `docs/audits/FULL_PROVIDER_FUNCTION_CAPABILITY_RESEARCH.md`.
- Seedance 2 drift is fixed in the GenX client:
  - `seedance-2`
  - `seedance-2-i2v`
  - `seedance-2-r2v`
- Lyria models are classified as music/song/instrumental music:
  - `lyria-3-clip-preview`
  - `lyria-3-pro-preview`

## Workbench Redesign

Workbench remains in place at `/admin/dashboard/workbench`.

The model selector now consumes governed Workbench models where available, so media, image, video, TTS, STT, and music models do not appear in the coding workflow. The flow remains:

repo -> branch -> model/auto -> prompt -> plan -> patch -> approve -> checks -> commit -> push -> PR -> guarded merge/deploy

The current UI already follows the Codex/Copilot-style layout:

- left: repo, branch, model, prompt
- center/right: plan, file list, diff, checks, logs, PR, next action
- guarded merge/deploy controls
- no GitHub token display

## Studio Music, Voice, And Adult Fixes

Studio execution now normalizes:

- `Music / Audio` -> `music_generation`
- `Voice / TTS` -> `tts`

Music calls `/api/admin/music-studio` and no longer routes as `voice_tts`.

MiniMax/Mimo TTS is preserved through the specialist route `/api/admin/specialist/minimax-tts` when governance selects MiniMax. Qwen and MiniMax underused voice/music capabilities are surfaced as available-but-not-wired rather than fake success.

Adult governance allows only:

- `adult_text`
- `adult_image`

These remain policy gated. `adult_video` and `adult_voice` are blocked until a production route, provider policy proof, safeguards, artifact handling, and live tests exist.

## Add External App Model

Apps & Agents now separates:

- root internal agents for AmarktAI Network
- future external managed app onboarding

The app package API rejects attempts to add `amarktai-network` or legacy `amarktai` as an external app package.

## Settings And Operations Truth

Settings now displays the capability governance matrix, blocked capabilities, route-present-not-approved providers, and underused/not-wired provider capabilities.

Operations now displays governance blockers and route truth alongside runtime blockers, provider health, storage, jobs, approvals, and go-live readiness.

## Remaining Live Tests

Still required before marking providers Connected:

- GenX live catalog and execution tests
- GitHub repo/branch/PR flow test
- Storage write/read test
- Redis/queue test
- Playwright browser QA test
- Firecrawl research test
- OpenAI/Groq/Together/HF/Qwen/MiniMax provider live tests where keys exist
- Studio music job test using GenX Lyria
- MiniMax/Mimo TTS live test
- Workbench PR creation live test

## Go-Live Readiness Verdict

Ready for live testing: yes, after environment keys are added.

Ready for go-live once API keys are added: not automatically. Providers must pass live tests and Workbench PR flow must be verified before Connected/go-live status is valid.

Required blockers remaining:

- missing keys in local/runtime environments
- live provider tests not yet passed
- Workbench PR flow needs live GitHub validation
- Studio media/music/voice jobs need live provider validation

Optional/later:

- avatar/talking video
- automated memory promotion scheduler
- extra providers
- SMTP enhancements

