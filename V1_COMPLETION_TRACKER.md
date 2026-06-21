# AmarktAI Network V1 Completion Tracker

Current source of truth ledger for V1 provider/runtime completion. Older audit files remain historical; this file is the current progress ledger for Phase 2 onward.

## Current Phase

Phase 3 Chunk 1 - Open-source stack install/proof contract.

## Current Source Head

- Branch: `integration/cline-source-of-truth`
- Phase 2 Chunk 2 source head: `9b18182 fix: classify unresolved media provider capabilities truthfully`
- Phase 2 Chunk 3 source head: `92d5efe fix: unify provider config and capability truth`
- Current chunk target commit: `feat: install and prove open-source runtime stack`

## Current Proof Summary

Latest VPS baseline after Phase 2 Chunk 2:

| Status | Count |
|---|---:|
| LIVE_PROVEN | 10 |
| SOURCE_WIRED | 8 |
| PROVIDER_AVAILABLE | 0 |
| BLOCKED | 7 |
| NOT_WIRED | 0 |

Local Windows diagnostic proof may show `LIVE_PROVEN: 0` when `.env` and DB-backed provider credentials are absent. Do not replace the VPS baseline with local no-DB proof output unless the proof is intentionally run in the target runtime.

## Current Provider Status Table

| Provider | Credential source of truth | Catalog truth | Runtime contract truth | Current blocker / next action |
|---|---|---|---|---|
| GenX | `integrationConfig.genx` first, then `aiProvider.genx`, then `GENX_API_KEY` | Live-authenticated catalog must preserve all discovered models; unknown models remain visible | Text/media adapter contracts decide executable-now status per model/capability | Verify GenX chat/model execution failures separately; do not mark ready from key/catalog alone |
| Hugging Face | `integrationConfig.huggingface`, `aiProvider.huggingface`, `HUGGINGFACE_API_KEY` / `HUGGINGFACEHUB_API_TOKEN` / `HF_TOKEN` | Public/task-sampled plus curated candidates; not a full HF universe load | Specialist endpoint and policy gates are distinct from public catalog visibility | Configure `HF_ENDPOINT_*` or `HF_SPECIALIST_ENDPOINTS_JSON` for rerank/video/music/specialist routes |
| Qwen / DashScope | `integrationConfig.qwen`, `aiProvider.qwen`, `QWEN_API_KEY` / `DASHSCOPE_API_KEY` | DashScope compatible catalog plus Wanx media contracts | Qwen media is first-class; paid/non-free-quota routing is blocked unless approved | Keep `QWEN_PAID_ENABLED=false` until paid execution is intentionally approved |
| Xiaomi MiMo | `integrationConfig.mimo`, `aiProvider.mimo`, `MIMO_API_KEY` / `XIAOMI_API_KEY` | Catalog visible through current MiMo endpoint | Token-plan/catalog access is distinct from backend runtime API execution | Set `MIMO_RUNTIME_API_ENABLED=true` only after backend runtime API access is proven |
| Groq | `integrationConfig.groq`, `aiProvider.groq`, `GROQ_API_KEY` | OpenAI-compatible model catalog | Chat/reasoning/code/STT/TTS only; not image/video/music | Prevent media classification; use only supported Groq audio/text routes |
| Together | `integrationConfig.together`, `aiProvider.together`, `TOGETHER_API_KEY` | `/models` catalog remains visible | Video/I2V/adult video gated by `TOGETHER_VIDEO_RUNTIME_ENABLED`; rerank requires dedicated endpoint | Keep models visible; set video flag only after `/videos` endpoint proof succeeds |

## Current Capability Status Table

| Capability | Current V1 status | Truth distinction |
|---|---|---|
| Core chat/reasoning/code/provider selection | LIVE_PROVEN on VPS where provider smoke succeeds | Provider key, catalog, model execution, and route execution remain separate |
| Summarization/translation/fallback/proof/logging/worker polling | SOURCE_WIRED | Source exists; live DB/provider/job proof still required |
| Rerank search relevance | BLOCKED | HF/Together rerank candidates are visible but endpoint/specialist config is required |
| Image editing/source transform | SOURCE_WIRED | No fake text-to-image fallback; requires actual image-edit adapter/model execution proof |
| Image to video | SOURCE_WIRED | Qwen/GenX contract candidates; Together remains gated until endpoint proof |
| Long-form video, adult media, avatar video, local stack-dependent work | BLOCKED | Requires DB policy, ffmpeg/worker/Rhubarb/local services or provider endpoint proof |
| NOT_WIRED | 0 | Remaining gaps must be BLOCKED/SOURCE_WIRED with exact next action, not mystery unclassified |

## Config Source Of Truth Status

Current split truth sources found:

| Source | Current role | Risk | Current fix |
|---|---|---|---|
| `.env` | Runtime flags, base URL overrides, local tool URLs, fallback provider keys | Silent false/empty flags can block runtime without dashboard visibility | `provider-runtime-truth.ts` exposes current value, required value, source, blocker, next action |
| `integrationConfig` | Authoritative credential vault and service/provider API URL config | Runtime can work while dashboard `aiProvider` row says unhealthy | Validator treats integrationConfig credential as runtime truth and warns on stale aiProvider state |
| `aiProvider` | Dashboard provider row, health, base URL, legacy credential fallback | Health can over/under-claim readiness | Validator surfaces mismatch warnings; health does not override integrationConfig key presence |
| `providerPerformance` | Last success/failure evidence | Can bias routing without explaining source | Contract layer reserves last evidence/live-proven fields; route responses keep rejected reasons |
| Hardcoded provider truth | Provider capability family, auth, endpoints, billing policy | Can imply support when adapter/endpoint is absent | Contract layer separates support, adapter availability, endpoint requirements, and executable-now |
| Runtime flags | Together video, Qwen paid, MiMo runtime API | Defaults may block runtime silently | `.env.example`, proof, runtime truth, and contracts now expose these flags |
| Dashboard settings/API | Operator view of provider readiness | Can show ready from key/catalog alone | Runtime truth now includes config blockers and next actions from central validator |
| Proof script | Live/provider/capability evidence | Can use different source than dashboard | Proof imports the same config and contract truth libraries |

## Blocked-To-Working Plan

| Blocker | Current classification | Exact next action |
|---|---|---|
| Together video/I2V HTTP 404 history | BLOCKED by runtime flag / dedicated endpoint | Prove official endpoint; then set `TOGETHER_VIDEO_RUNTIME_ENABLED=true` and rerun proof |
| HF rerank/video/music specialist routes | BLOCKED by specialist endpoint | Configure `HF_ENDPOINT_RERANK`, `HF_ENDPOINT_TEXT_TO_VIDEO`, `HF_ENDPOINT_IMAGE_TO_VIDEO`, `HF_ENDPOINT_MUSIC_GENERATION`, or `HF_SPECIALIST_ENDPOINTS_JSON` |
| MiMo token-plan-only runtime | BLOCKED/tool-plan-only for non-proven runtime routes | Confirm backend runtime API access and set `MIMO_RUNTIME_API_ENABLED=true` |
| Qwen paid/non-free-quota models | BLOCKED by policy unless approved | Keep `QWEN_PAID_ENABLED=false`; set true only after operator approval |
| Image edit transform proof | SOURCE_WIRED | Prove a source-image transform adapter/model path; do not substitute text-to-image |
| Image-to-video proof | SOURCE_WIRED | Reprove Qwen Wanx I2V or GenX I2V job start/poll/artifact path |
| Avatar video | BLOCKED | Install/configure Rhubarb/lip-sync service/binary and expose executable path/service URL |
| Local media/research stack | BLOCKED where required | Run `sudo APP_ROOT=/var/www/amarktai PLATFORM_ROOT=/var/www/amarktai/platform bash scripts/install-open-source-stack.sh`, configure env paths, then rerun proof on the VPS |

## Open-Source Stack Status

| Tool | Installed | Wired | Used by | Setup command | Blocker |
|---|---|---|---|---|---|
| Redis | Target VPS: pending proof | Partially | Async media jobs, BullMQ worker | `sudo apt-get install -y redis-server && sudo systemctl enable --now redis-server; export REDIS_URL=redis://127.0.0.1:6379` | Proof must show Redis ping; local Windows proof may report missing |
| BullMQ worker | Pending proof | Partially | Async provider polling/retry | Configure worker service with `REDIS_URL=redis://127.0.0.1:6379` | Worker service unit still needs target VPS proof |
| Qdrant | Target VPS: pending proof | Partially | RAG/memory/research | `docker run -d --name amarktai-qdrant --restart unless-stopped -p 127.0.0.1:6333:6333 -v /var/www/amarktai/qdrant:/qdrant/storage qdrant/qdrant:latest; export QDRANT_URL=http://127.0.0.1:6333` | Requires Docker/service proof on target VPS |
| Playwright | Source-wired | Yes | Web research/scrape | `cd /var/www/amarktai/platform && npx playwright install --with-deps chromium` | Proof must show Node package and browser deps available |
| Scrapy | Target VPS: pending proof | Source-wired | Web research/scrape | `python3 -m venv /var/www/amarktai/.venv && /var/www/amarktai/.venv/bin/pip install scrapy trafilatura && export AMARKTAI_PYTHON_BIN=/var/www/amarktai/.venv/bin/python` | Proof must import Scrapy with configured Python |
| Trafilatura | Target VPS: pending proof | Source-wired | Web extraction | `python3 -m venv /var/www/amarktai/.venv && /var/www/amarktai/.venv/bin/pip install scrapy trafilatura && export AMARKTAI_PYTHON_BIN=/var/www/amarktai/.venv/bin/python` | Proof must import Trafilatura with configured Python |
| ffmpeg | Target VPS: pending proof | Source-wired | Video/music/media assembly | `sudo apt-get install -y ffmpeg; export FFMPEG_PATH=/usr/bin/ffmpeg` | Proof must run `ffmpeg -version` |
| ffprobe | Target VPS: pending proof | Source-wired | Media duration/probe | `sudo apt-get install -y ffmpeg; export FFPROBE_PATH=/usr/bin/ffprobe` | Proof must run `ffprobe -version` |
| Rhubarb/lip-sync | BLOCKED until configured | Source-wired boundary only | Talking avatar video | Install Rhubarb for VPS architecture, then set `RHUBARB_PATH=/var/www/amarktai/tools/rhubarb/rhubarb` or `LIPSYNC_SERVICE_URL=http://127.0.0.1:<port>` | Not auto-installed; proof must report `LIPSYNC_SERVICE_REQUIRED` until configured |
| Local artifact storage | Present in source | Yes | Durable preview/download | Ensure `AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage` exists and is writable | Verify target VPS permissions |

## Dashboard And Frontend Missing-Functions Inventory

| Function | Status |
|---|---|
| Provider capability matrix | Present but incomplete |
| All provider model catalog browser | API exists but UI incomplete |
| Provider config truth panel | API exists; UI missing |
| Runtime flags panel | API exists; UI missing |
| Endpoint/specialist setup panel | API exists; UI missing |
| Proof status panel | Present but incomplete |
| Capability execution studio | Present but incomplete |
| Artifact preview/download | Present but incomplete |
| Media quality review | Missing |
| Job progress/polling | Present but incomplete |
| Route trace/explanation | Present but incomplete |
| Provider fallback trace | Present but incomplete |
| Blocked/config-needed actions | API exists but UI incomplete |
| Open-source stack status | API exists but UI incomplete |
| Research/self-learning panel | Present but incomplete |
| Vector memory/RAG panel | API exists but UI missing |
| Connected apps panel | Present but incomplete |
| App workflow builder | Missing |
| Brand kit panel | Missing |
| Voice persona panel | Present but incomplete |
| Avatar library panel | Present but incomplete |
| Long-form video project panel | Present but incomplete |
| Music studio duration/composition panel | Present but incomplete |
| Adult mode/provider policy panel | Present but incomplete |
| Deploy/readiness panel | Present but incomplete |

## Next Phase Checklist

| Phase | Scope |
|---|---|
| Phase 3 - open-source stack install/proof | Redis, BullMQ worker, Qdrant, Playwright, Scrapy, Trafilatura, ffmpeg, ffprobe, Rhubarb, storage/worker service |
| Phase 4 - research/self-learning | Web research reliability, scraping, vector memory/RAG, self-learning proof |
| Phase 5 - media workflows: music, long-form video, image-to-video, image edit | Durable media jobs, preview/download, source transforms, length/composition |
| Phase 6 - avatar/voice/brand workflows | Avatar image/video, voice persona, brand kit |
| Phase 7 - connected apps/app workflows | Connected app execution, workflow builder, signed app registry |
| Phase 8 - full dashboard/frontend redesign | Operator dashboard visual redesign and structured settings |
| Phase 9 - final deploy/QA | Production deploy, VPS verification, final live proof, regression QA |
