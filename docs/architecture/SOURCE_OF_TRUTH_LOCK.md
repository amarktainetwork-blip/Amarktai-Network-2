# AmarktAI Network Source-of-Truth Lock

This document is the hard architecture lock for AmarktAI Network.

AmarktAI Network is an AI operating system / command center, not a raw model picker.

## Approved primary AI providers

Only these providers are approved as first-class AI providers:

- GenX
- Hugging Face
- Qwen / DashScope / Wan
- Xiaomi MiMo
- Groq
- Together AI

Direct OpenAI, Gemini, NVIDIA, Suno, Udio, Anthropic, DeepSeek, MiniMax, Replicate, OpenRouter and similar providers must not be presented as first-class configured providers unless explicitly approved later.

GenX-routed models must not be represented as fake direct providers.

## Platform services

These platform services are allowed:

- GitHub
- Redis
- Qdrant
- Local Crawler
- Playwright
- Scrapy
- Trafilatura
- ffmpeg
- Storage
- SMTP

## Canonical modules

Provider identity:
- src/lib/provider-mesh.ts

Approved AI provider list:
- src/lib/approved-ai-catalog.ts
- Must be derived from provider mesh, not duplicated manually.

Provider key and vault truth:
- src/lib/crypto-vault.ts
- src/lib/service-vault.ts
- src/lib/provider-config.ts may remain only as a temporary compatibility adapter while imports are migrated.

Runtime truth:
- src/lib/runtime-truth.ts
- src/lib/runtime-capability-truth.ts

Model catalog:
- src/lib/ai-model-catalog.ts
- src/lib/universal-model-catalog.ts
- src/lib/genx-client.ts

Compatibility only:
- src/lib/model-registry.ts
- src/lib/provider-universe-truth.ts

These compatibility modules must not become product truth again.

Capability taxonomy:
- src/lib/capability-taxonomy.ts

Routing and orchestration:
- src/lib/orchestrator.ts
- src/lib/routing-engine.ts
- src/lib/smart-router.ts
- src/lib/live-ai-routing.ts

Media execution:
- src/lib/media-capability-registry.ts
- src/lib/media-job-store.ts
- src/lib/music-studio.ts
- src/lib/artifact-store.ts

Repo Workbench:
- src/lib/repo-workbench.ts

App Builder:
- No complete backend exists yet.
- A real app service must be created before App Builder can be called production-ready.

Connected Apps:
- No complete backend exists yet.
- A real connected-app registry, app credentials, HMAC/webhooks, app memory, artifacts, budgets and agent permissions must be created.

Dashboard navigation:
- src/lib/dashboard-nav.ts
- src/lib/public-nav.ts

## Non-negotiable rules

1. Do not add a second provider registry.
2. Do not add a second model registry.
3. Do not add a second capability taxonomy.
4. Do not add fake connected providers.
5. Do not mark provider status green unless the key/test/runtime proof is real.
6. Do not call a planning draft an app builder.
7. Do not call connected apps complete until apps have real records, credentials, webhooks and runtime status.
8. Do not delete legacy files until imports are migrated and tests are rewritten.
