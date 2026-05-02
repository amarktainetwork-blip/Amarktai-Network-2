# Phase 5 — AI Provider Governance

Generated: 2026-05-02  
Branch: `phase-5-ai-provider-governance`

## Goal

Clean up the AI setup before redesign by making provider choices intentional, centralised, and debateable.

This phase does **not** delete providers or break existing settings. It creates a governance layer so we can decide what belongs in the primary setup, what is optional, what is advanced-only, what should be deprecated, and what should be proposed for later.

## Added

### 1. Canonical provider governance manifest

New file:

```text
src/lib/ai-provider-governance.ts
```

This manifest defines each provider's:

- key
- display name
- integration key
- env var
- governance status
- reason
- capabilities
- whether GenX covers it
- whether it is wired
- whether it belongs in primary setup
- cost role

## Current governance categories

### Core providers

These are the current intended backbone:

```text
genx
github
qwen
groq
together
huggingface
```

Reasoning:

- GenX remains the main gateway.
- GitHub is required for Repo Workbench.
- Qwen, Groq, Together and HuggingFace are cheap/free-capable AI that should not be ignored.

### Active optional providers

These are useful but not always required:

```text
openrouter
replicate
elevenlabs
deepgram
firecrawl
mem0
webdock
```

Reasoning:

- OpenRouter = aggregator fallback.
- Replicate = media/adult/image/video fallback.
- ElevenLabs/Deepgram = voice specialist routes.
- Firecrawl = research/app onboarding.
- Mem0 = memory.
- Webdock = VPS/deploy telemetry.

### Advanced optional providers

These should not clutter primary setup because GenX usually covers them:

```text
openai
xai
```

Reasoning:

- They can be useful direct premium fallbacks.
- They should not be presented as required for normal setup.

### Deprecated / not primary

These should be hidden from primary setup unless we later prove a need:

```text
cohere
mistral
```

Reasoning:

- Cohere is only needed if we specifically want Cohere reranking later.
- Mistral direct is not needed while we have GenX/Qwen/Groq/Together/HuggingFace style low-cost routes.

### Proposed backlog

These are **not wired** and should be debated before adding:

```text
perplexity
tavily
jina
runpod
fal
fireworks
cerebras
suno
udio
```

Reasoning:

- Perplexity/Tavily/Jina may be useful for research/RAG.
- RunPod/fal may be useful for specialist media/adult/self-hosting.
- Fireworks/Cerebras may be useful if we need more cheap inference.
- Suno/Udio are music candidates but need legal/API confirmation first.

## 2. Runtime truth now reads provider governance

Updated:

```text
src/lib/runtime-capability-truth.ts
```

Runtime truth no longer owns its own scattered provider arrays. It now imports:

- provider env map
- GenX-covered provider keys
- wired provider keys
- adult specialist provider keys
- runtime provider governance list

This keeps the source of truth clean.

## 3. New admin provider-governance API

New endpoint:

```text
GET /api/admin/provider-governance
```

It returns:

- governance categories
- runtime provider status
- primary setup providers
- proposed backlog
- recommendations for keep/core/advanced/debate-before-adding/hide-from-primary-setup

## What this phase deliberately does not do

- Does not delete old providers yet.
- Does not remove provider keys from Settings yet.
- Does not add proposed providers yet.
- Does not rewrite all UI provider pages yet.
- Does not redesign the public website.

## Manual verification after merge/deploy

```bash
curl -sS https://amarktai.com/api/admin/provider-governance \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

Expected:

- `genx`, `github`, `qwen`, `groq`, `together`, `huggingface` appear as core.
- `openai` and `xai` appear as advanced optional.
- `cohere` and `mistral` appear as deprecated.
- proposed providers appear in `proposedBacklog` only.
- runtime provider status still works.

Also verify:

```bash
curl -sS https://amarktai.com/api/admin/runtime-truth \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq '.providers[] | {key, governanceStatus, status, showInPrimarySetup}'
```

## Next recommended phase

After this is merged, debate and decide:

1. Which deprecated providers to hide from Settings UI.
2. Which proposed providers to add first.
3. Whether RunPod/fal should become the specialist adult/media route.
4. Whether Perplexity/Tavily/Jina should become the travel/research app backbone.
5. Whether Fireworks/Cerebras should be added as additional cheap inference.

Only after this provider setup is agreed should we do the website/dashboard redesign.

## Verdict

Provider setup is now governable. The next step is not random coding — it is deciding the final provider stack and then wiring Settings/UI to match it.
