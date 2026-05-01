# Settings / Provider Key Source Audit

Single-source intent exists in `src/lib/service-vault.ts` and `src/lib/runtime-capability-truth.ts`: IntegrationConfig DB vault first, environment fallback second. Reality is mixed: some code reads `GitHubConfig`, some code reads `provider-config.ts`, some routes use provider records, and older pages still call legacy test endpoints.

| Provider | Where key is saved | Where key is read | Test endpoint | UI status | Actual runtime status | Mismatch | Blocker | Fix required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GenX | `integrationConfig` via Settings; env `GENX_API_KEY`; URL env `GENX_API_URL` | `service-vault`, `genx-client`, `runtime-capability-truth` | `/api/admin/settings/test-genx`, `/api/admin/genx/status` | Visible in Settings and AI Engine | Live only if catalog probe succeeds | Partial | Runtime truth has static fallback model count of 57 even when live fetch fails | Use live catalog for model UI; clearly separate static catalogue from live availability |
| GitHub PAT | `GitHubConfig.accessToken` and Repo Workbench token route | `github-integration`, `repo-workbench` | `/api/admin/settings/test-github`, `/api/admin/repo-workbench/github/status` | Visible in Settings and Repo Workbench | Works only with valid PAT | Yes | Not unified with IntegrationConfig vault | Store/read through one vault or bridge status everywhere |
| Webdock | Settings integration/env `WEBDOCK_API_KEY` | `/api/admin/vps`, test-webdock | `/api/admin/settings/test-webdock` | Visible | Not live-verified | Partial | VPS metrics/deploy depend on external API | Add live Webdock smoke in health report |
| Firecrawl | IntegrationConfig/env `FIRECRAWL_API_KEY` | `firecrawl.ts`, runtime truth | No dedicated settings test except integrations | Visible as provider/integration | Gracefully unavailable without key | No major | App intelligence crawl blocked without key | Add explicit Firecrawl test card |
| Mem0 | IntegrationConfig/env `MEM0_API_KEY` | `mem0-client.ts` | none found as dedicated route | Visible in docs/settings provider list | Unavailable without key | Partial | Memory status not unified in System Health | Add Mem0 status endpoint to runtime truth |
| Qdrant | env/config modules | `qdrant` references via tests/federated memory | none found | Not clearly surfaced | Not live-verified | Yes | Vector DB not proven | Add Qdrant status/config UI |
| PostHog | env/config modules | PostHog helper/tests | none found | Not clearly surfaced | Unavailable without key | Partial | Analytics optional | Keep optional; add health display |
| Google/Gemini | IntegrationConfig/env in runtime truth; provider-config uses `GEMINI_API_KEY` | brain/provider layers | provider health-check | Visible provider | Direct fallback only if configured | Partial | Key aliases must be consistent | Normalize env aliases |
| Qwen/DashScope | runtime truth env `DASHSCOPE_API_KEY`; provider-config env `QWEN_API_KEY` | Mixed | provider health-check | Visible provider | Mismatch risk | Yes | Different env names | Use one canonical env and alias support |
| Groq | IntegrationConfig/env `GROQ_API_KEY` | brain/provider layers/provider-config | provider health-check | Visible | Direct fallback if configured | No major | Live call unverified | Add quick route test |
| xAI/Grok | runtime truth env `XAI_API_KEY`; GenX covered | runtime truth/brain | provider health-check | Visible | Mostly covered by GenX | Partial | Direct xAI route status unclear | Show as GenX-covered unless direct wired |
| OpenRouter | IntegrationConfig/env `OPENROUTER_API_KEY` | runtime truth/brain | provider health-check | Visible | configured_wired in truth | Partial | Need live model test | Add model list/test endpoint |
| Together AI | IntegrationConfig/env `TOGETHER_API_KEY` | adult text, brain | provider health-check | Visible | Adult text specialist route can use it | Partial | Adult UI not fully wired | Add adult provider live test gate |
| HuggingFace | IntegrationConfig/env `HUGGINGFACE_API_KEY` | adult/catalog/image fallback | provider health-check | Visible | Adult/model fallback possible | Partial | Adult image/video E2E not proven | Add specialist provider status per capability |
| OpenAI | IntegrationConfig/env `OPENAI_API_KEY` | brain, moderation fallback, runtime truth | provider health-check | Visible | Direct fallback if configured | No major | Moderation key absence uses keyword fallback | Surface moderation status |
| ElevenLabs | IntegrationConfig/env `ELEVENLABS_API_KEY` | runtime truth voice | provider health-check | Visible | Listed as TTS fallback | Partial | Media Studio voice calls `/api/brain/tts`; live direct path unverified | Add TTS provider test |
| Deepgram | IntegrationConfig/env `DEEPGRAM_API_KEY` | runtime truth, TTS/STT | provider health-check | Visible | Listed as STT/TTS fallback | Partial | Media UI lists Deepgram via GenX but not direct status | Unify voice model catalog |
| AssemblyAI | Not found as first-class runtime provider | Not found | none | Missing | Missing | Yes | Required by prompt but absent | Add provider record or remove from claims |
| Anthropic | GenX-covered in runtime truth but not direct key in map | GenX model catalog/registry | none direct | AI Engine may show via GenX | Covered by GenX | Partial | Direct Anthropic key not in settings list | Decide direct support or hide direct key |
| Mistral | IntegrationConfig/env `MISTRAL_API_KEY` | runtime truth | provider health-check | Visible | configured_not_wired unless implementation exists | Yes | Truth says not fully wired | Wire or mark optional |
| Cohere | IntegrationConfig/env `COHERE_API_KEY` | runtime truth | provider health-check | Visible | configured_not_wired/embeddings potential | Yes | Rerank/embedding direct route not fully proven | Wire or hide from active capability |
| Replicate | env alias mismatch: runtime `REPLICATE_API_KEY`, provider-config `REPLICATE_API_TOKEN` | media/video fallback | provider health-check | Visible | Potentially direct fallback | Yes | Env alias mismatch | Support both aliases consistently |
| Adult provider key | HuggingFace/Together/xAI specialist providers | adult routes/catalog | `/api/admin/settings/test-adult` | Adult settings visible | Adult media tab hidden/absent | Yes | No complete adult image/video E2E | Gate adult UI on per-provider live tests |

## Cross-surface truth findings

- Settings and AI Engine: partially unified through `/api/admin/runtime-truth`, but AI Engine also calls `/api/admin/genx/status` and `/api/admin/models` separately.
- Media Studio: does not consume runtime truth; it calls `/api/admin/genx/status` and hard-codes model options.
- Repo Workbench: has its own status endpoint and model route; it does not fully consume runtime truth.
- Adult Mode: uses specialist catalogs/routes and Settings test, but Media Studio does not expose a real adult tab.
- System Health: calls GenX/VPS/jobs/app health, but not the full `/api/admin/system/capabilities` or `/api/admin/runtime-truth`.
