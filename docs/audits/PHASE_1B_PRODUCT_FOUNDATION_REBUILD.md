# Phase 1B Product Foundation Rebuild

**Branch:** `copilot/phase-1b-product-foundation-rebuild`  
**Status:** Frontend/dashboard shell complete — backend wiring not included

---

## Final Provider Stack

### Gateway
| Provider | Key | Visibility |
|----------|-----|-----------|
| GenX | `GENX_API_KEY` | Primary |

### Direct Providers (visible in Settings)
| Provider | Display Name | Env Vars | Visibility |
|----------|-------------|----------|-----------|
| Qwen / DashScope | Qwen / DashScope | `QWEN_API_KEY`, `DASHSCOPE_API_KEY` | Primary |
| MiniMax / Mimo | MiniMax / Mimo | `MINIMAX_API_KEY`, `MIMO_API_KEY` | Primary |
| Gemini | Gemini | `GEMINI_API_KEY` | Primary |
| Groq | Groq | `GROQ_API_KEY` | Primary |
| Together AI | Together AI | `TOGETHER_API_KEY` | Primary |
| xAI / Grok | xAI / Grok | `XAI_API_KEY`, `GROK_API_KEY` | Advanced (collapsed) |
| Hugging Face | Hugging Face | `HUGGINGFACE_API_KEY`, `HUGGINGFACEHUB_API_TOKEN`, `HF_TOKEN` | Primary |

### Tools & Operations
| Tool | Env Var | Visibility |
|------|---------|-----------|
| GitHub | `GITHUB_TOKEN` | Primary |
| Webdock | `WEBDOCK_API_TOKEN` | Primary |
| Firecrawl | `FIRECRAWL_API_KEY` | Primary |
| Artifact/scraped page storage | Storage config | Primary |

### Memory / Emotions
| Component | Status |
|-----------|--------|
| Internal memory storage | Backend pending |
| Mem0 client | Ready to wire |
| Qdrant / pgvector | Hidden/internal — Backend pending |

### Specialist Providers (collapsed, not primary)
| Provider | Use Case | Status |
|----------|----------|--------|
| Replicate | Media fallback | Specialist — Advanced |
| ElevenLabs | Voice fallback | Specialist — Advanced |
| Deepgram | STT fallback | Specialist — Advanced |

---

## Providers Removed / Hidden from Normal Product UI

The following providers are in `hidden` or `backlog` governance group and do not appear in primary Settings UI:

- OpenAI (in Advanced collapsed section — not primary)
- Anthropic
- Cohere
- Mistral Direct
- Suno
- Udio
- Perplexity
- Tavily
- Jina
- RunPod
- fal.ai
- Fireworks
- Cerebras
- AssemblyAI
- Any other provider not in the approved stack above

---

## Final Visible Dashboard Nav (11 canonical sections)

| # | Label | Route |
|---|-------|-------|
| 1 | Command Center | `/admin/dashboard/command-center` |
| 2 | Aiva Chat | `/admin/dashboard/aiva` |
| 3 | Apps / Packages | `/admin/dashboard/apps` |
| 4 | Repo Workbench | `/admin/dashboard/repo-workbench` |
| 5 | Scraping / Research | `/admin/dashboard/research` |
| 6 | Memory / Emotions | `/admin/dashboard/memory-emotions` |
| 7 | Media Studio | `/admin/dashboard/media-studio` |
| 8 | Artifacts / Storage | `/admin/dashboard/artifacts` |
| 9 | Actions / Approvals | `/admin/dashboard/ai-engine/aiva-actions` |
| 10 | Diagnostics | `/admin/dashboard/system-health` |
| 11 | Settings | `/admin/dashboard/settings` |

---

## Routes Deleted / Hidden / Redirected

| Old Route | Action | Redirects To |
|-----------|--------|-------------|
| `/admin/dashboard/access` | Redirect | `/admin/dashboard/settings` |
| `/admin/dashboard/deployments` | Redirect | `/admin/dashboard/repo-workbench` |
| `/admin/dashboard/emotions` | Redirect | `/admin/dashboard/memory-emotions` |
| `/admin/dashboard/events` | Redirect | `/admin/dashboard/system-health` |
| `/admin/dashboard/integrations` | Redirect | `/admin/dashboard/settings` |
| `/admin/dashboard/intelligence` | Redirect | `/admin/dashboard/research` |
| `/admin/dashboard/voice` | Redirect | `/admin/dashboard/media-studio` |
| `/admin/dashboard/genx-models` | Redirect | `/admin/dashboard/ai-engine` |
| `/admin/dashboard/brain` | Redirect | `/admin/dashboard/ai-engine` |
| `/admin/dashboard/build-studio` | Redirect | `/admin/dashboard/repo-workbench` |
| `/admin/dashboard/workspace` | Redirect | `/admin/dashboard` |
| `/admin/dashboard/settings/aiva-avatar` | Redirect | `/admin/dashboard/settings` |
| `/admin/dashboard/live-readiness` | Hidden from nav — accessed via Diagnostics match | — |
| `/admin/dashboard/system-health` | Consolidated Diagnostics surface | — |
| `/admin/dashboard/ai-engine/hub` | Replaced by `/admin/dashboard/aiva` | — |
| `/admin/dashboard/ai-engine/intelligence` | Replaced by `/admin/dashboard/research` | — |

---

## New Routes Added

| Route | Purpose | Status |
|-------|---------|--------|
| `/admin/dashboard/aiva` | Aiva Chat — dedicated non-overlapping section | Frontend-ready |
| `/admin/dashboard/memory-emotions` | Memory / Emotions — user memory, emotional profile, consent | Frontend-ready |
| `/admin/dashboard/research` | Scraping / Research — Firecrawl, crawler, storage | Frontend-ready |

---

## Missing Features Marked Ready-to-Wire / Backend Pending

| Feature | Module | Status |
|---------|--------|--------|
| Aiva stream backend | Aiva Chat | Ready to wire |
| Provider key for Aiva | Aiva Chat | Needs key |
| Memory storage backend | Memory / Emotions | Backend pending |
| Mem0 integration | Memory / Emotions | Ready to wire |
| Emotion profile backend | Memory / Emotions | Backend pending |
| Consent / privacy controls | Memory / Emotions | Backend pending |
| Firecrawl (active) | Scraping / Research | Needs key |
| Backup crawler | Scraping / Research | Ready to wire |
| Scraped page storage | Scraping / Research | Backend pending |
| Crawl job history | Scraping / Research | Backend pending |
| Vector store (Qdrant / pgvector) | Memory / Emotions | Backend pending |
| Action approval queue backend | Aiva Chat | Ready to wire |
| Memory context in Aiva | Aiva Chat | Backend pending |
| Voice STT / TTS | Aiva Chat, Media Studio | Ready to wire |
| Streaming voice | Media Studio | Backend pending (batch works) |

---

## Backend Wiring Phases Still Needed

### Phase 2B — Aiva backend
- Wire provider stream to `/admin/dashboard/aiva`
- Connect GenX routing with API key validation
- Wire action approval queue backend

### Phase 2C — Memory / Emotions backend
- Wire Mem0 client with `MEM0_API_KEY`
- Set up vector store (Qdrant or pgvector)
- Connect emotion engine to conversation history
- Wire consent/privacy storage

### Phase 2D — Scraping / Research backend
- Wire Firecrawl with `FIRECRAWL_API_KEY`
- Set up scraped page storage backend
- Wire backup crawler fallback
- Connect crawl job queue and history

### Phase 2E — Diagnostics proof
- All status rows in Diagnostics must reflect live endpoint checks
- No status changes to "Working" without endpoint proof

---

## Verification Commands

```bash
# Run target tests
npx vitest run \
  src/lib/__tests__/dashboard-golive.test.ts \
  src/lib/__tests__/repo-workbench-production.test.ts \
  src/lib/__tests__/one-source-of-truth.test.ts

# Run new foundation test
npx vitest run src/lib/__tests__/frontend-product-foundation.test.ts

# Run provider governance tests
npx vitest run \
  src/lib/__tests__/provider-governance.test.ts \
  src/lib/__tests__/settings-provider-source-of-truth.test.ts

# Build check
npm run build

# Lint check
npm run lint
```

---

## Remaining Blockers

1. **Aiva stream**: No provider key configured → Status: Needs key
2. **Memory backend**: No storage driver for memory/emotions → Status: Backend pending
3. **Firecrawl**: `FIRECRAWL_API_KEY` not set → Status: Needs key
4. **Vector store**: Qdrant/pgvector not configured → Status: Backend pending
5. **Action approvals**: Approval queue API not wired → Status: Ready to wire
6. **Streaming voice**: Streaming TTS backend not wired → Status: Backend pending (batch via `/api/brain/tts` works)
7. **Mem0**: `MEM0_API_KEY` not set, client ready → Status: Ready to wire
