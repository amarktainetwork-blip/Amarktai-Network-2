# AmarktAI Network V1 Operating Truth

## CURRENT IMPLEMENTATION STATUS

- **Date:** 2026-06-16
- **PR Number:** #118 follow-up on `integration/cline-source-of-truth`
- **Purpose:** Repair provider runtime discovery and dashboard execution inside
  the final PR #114-#117 architecture.
- **Completed:** Model evidence normalization, provider-contract fallback,
  task-filtered Hugging Face discovery, Together native runtime paths,
  canonical dashboard planning, provider diagnostics, Brain media polling
  recovery for async provider jobs, GitHub-tracked GenX static runtime catalog
  fallback when live GenX model discovery fails, GenX fallback routing through
  degraded discovery-health, canonical GenX discovery base-url handling for
  `GENX_BASE_URL` and `GENX_API_URL`, and canonical Hugging Face auth-alias
  alignment across provider config and specialist execution.
- **Working:** Provider truth, capability routing, scoring, adapters, jobs,
  artifacts, adult policy, connected-app scope enforcement, public Brain
  media-job polling by opaque local job id, and GenX discovery candidates from
  the existing runtime catalog when `/api/v1/models` is unavailable. GenX image
  local Brain polling and artifact persistence are proven by focused contract
  tests.
- **Partial:** Production live provider proof, true token streaming, research,
  long-form media composition, and advanced provider-specific voice families.
- **Broken At Start:** The runtime required exact model-level capability tags,
  so healthy provider catalogs containing only model IDs yielded
  `NO_ROUTE_FOUND`. Studio also preplanned through obsolete static truth.
  External media-job polling returned Unauthorized before the 2026-06-16
  follow-up. VPS-local GenX discovery fallback existed outside GitHub until it
  was moved into the canonical branch. VPS proof then exposed that degraded
  discovery-health could suppress the explicit GenX fallback route.
- **Proof:** TypeScript, 496 tests, and a 183-page production build passed in PR
  #118. VPS proof on 2026-06-16 confirmed install, Prisma generation,
  TypeScript, focused media contract tests, production build, local site health,
  and API health. GenX image failed with `NO_ROUTE_FOUND` before the
  degraded-health fallback routing fix; rerun VPS proof after pulling the
  latest branch.
- **Next PR:** #119 Research Completion after production smoke verification.

This document is the law for AmarktAI Network V1. When code, tickets, prompts,
or older documents disagree with it, stop and resolve the conflict before
shipping.

## Operator Truth

- Branch: `integration/cline-source-of-truth`
- VPS path: `/var/www/amarktai/platform`
- Services: `amarktai-platform.service` and `amarktai-worker.service`
- DB: MariaDB/MySQL via Prisma `provider = "mysql"`
- Standalone deploy: `.next/static` and `public` must be copied into
  `.next/standalone`
- Dashboard reflects Brain runtime; the dashboard is not source of truth

## Mission

```text
ONE BRAIN
    |
UNLIMITED APPS
    |
UNLIMITED PROVIDERS
    |
UNLIMITED MODELS
    |
UNLIMITED CAPABILITIES
```

AmarktAI is the Brain. Providers are replaceable backend infrastructure. Apps
request capabilities from the Brain and never call providers directly.

```text
APP
  -> BRAIN
  -> CAPABILITY
  -> ROUTER
  -> PROVIDER
  -> ARTIFACT
  -> APP
```

The Brain owns provider routing, model discovery, memory, artifacts, workflows,
agents, research, brand context, and adult permissions.

## Approved Providers

The only approved AI providers in V1 are Hugging Face, Together, Groq, GenX,
Qwen, and MiMo.

Admin provider-key truth must cover these six approved providers only. App
callers remain capability-only and cannot choose provider, model, or endpoint.

Adding or removing a provider is an architecture change. It requires updates to
this document, `PROVIDER_MATRIX.md`, `provider-truth.json`, and
`CHANGELOG_AI.md`.

## Provider And Model Rules

Runtime product code must not hardcode a provider or model as the universal
answer. Patterns such as `provider = "qwen"`, `provider = "hf"`, or
`model = "flux"` are not allowed as routing policy.

Every execution follows:

```text
Capability
  -> Provider Discovery
  -> Model Discovery
  -> Score
  -> Execute
```

Provider-specific adapters may contain endpoint protocol identifiers, but no
fallback model IDs. Capability callers cannot select raw providers or models.
Models are dynamic and discovery-driven.

GenX discovery uses live `/api/v1/models` first. Canonical provider discovery
must honor `GENX_BASE_URL` and `GENX_API_URL`, normalize dashboard-style GenX
URLs to `query.genx.sh`, and then append the required endpoint family path.
If live discovery fails while a GenX credential is configured, discovery may
expose models from the existing GenX runtime catalog as provider-contract
evidence. This is a recovery path for routing candidates only; it does not by
itself prove live execution. The explicit GenX static runtime fallback may
remain routable when discovery health is degraded so the provider-native
adapter can produce the real success or provider error.

Current GenX fallback truth is conservative. The canonical fallback exposes only
image, text-to-video models covered by the explicit GenX video contract, music,
and TTS. Unproven GenX families such as image edit, image-to-video, avatar,
STT, documents, agents, and adult media are not exposed through the canonical
fallback path.

## Routing Profiles

Supported profiles are `cheap`, `balanced`, `premium`, `mixed`,
`best_available`, and `custom`. A profile influences scoring; it cannot bypass
capability, availability, safety, adult, credential, or artifact requirements.

## Adult Capability

Adult is a capability and policy decision, not a provider. The dashboard
controls adult access as `ON` or `OFF`. Connected apps are registered with
adult access as `YES` or `NO`. The Brain makes the final permission and safety
decision before routing.

## Brand Ownership

The Marketing App owns logos, colors, tone, audiences, and campaigns. The Brain
owns memory, embeddings, retrieval-augmented generation, and style retrieval.
Apps supply authorized brand context; the Brain retrieves and applies it.

## Source Of Truth

GitHub is the only repository source of truth. The operating set is the
canonical GitHub branch, this document, `CHANGELOG_AI.md`,
`PROVIDER_MATRIX.md`, and the canonical runtime registries.

The canonical GitHub branch is `integration/cline-source-of-truth`.

Do not create parallel provider configs, model catalogs, capability lists,
routers, or product truth documents.

## Phase 1 Provider Truth Rules

The canonical Phase 1 provider truth layer is under `src/lib/providers/`.
It owns:

- the six approved provider IDs
- the 23 product capability IDs
- provider-native endpoint and discovery metadata
- cached model, task, inference-provider, and endpoint discovery
- routing profiles and scoring weights
- dynamic route planning from discovered model evidence

No model IDs are stored in this layer. A model becomes eligible only after
provider discovery returns model-level capability evidence, or after an explicit
provider-contract evidence path exists for a provider whose catalog omits task
metadata or whose live catalog is temporarily unavailable. Missing discovery
returns no route; it never creates a default model or fake fallback.

Provider scoring considers quality, speed, cost, availability, adult
permission, research support, streaming, health, and artifact support.
Internal routing profiles may constrain scoring. App-facing specialist routes
ignore raw provider/model preferences; an unknown or undiscovered model is
never authorized.

Qwen discovery distinguishes compatible-mode and AIGC endpoint families. Its
standard endpoint retains free-quota truth, and models marked outside free
quota are excluded unless `QWEN_PAID_ENABLED=true`. MiMo uses its token-plan
endpoint. Hugging Face discovery includes public model/task metadata,
inference-provider mappings, and separately configured private or dedicated
endpoints.

Hugging Face canonical auth alias truth is `HUGGINGFACE_API_KEY`,
`HUGGINGFACEHUB_API_TOKEN`, and `HF_TOKEN`. Admin/provider test surfaces and
specialist execution must honor that same alias set.

Hugging Face provider truth remains conservative. The canonical provider layer
represents Hugging Face dynamic catalog, inference-provider metadata,
private/dedicated endpoint metadata, artifact-capable inference adapters, and
`asyncJobs: false`. It does not claim canonical Hugging Face tool-calling or
agent execution because no such adapter contract is proven in the current repo.

Groq canonical auth alias truth is `GROQ_API_KEY`. The canonical provider layer
represents Groq dynamic model discovery, streaming text/chat, reasoning/coding,
Groq-native TTS/STT adapter paths, artifact-capable execution, and
`asyncJobs: false`. It does not claim canonical Groq image/video generation,
tool-calling, or agent execution because those contracts are not proven in the
current repo.

Free-token-only operation must keep `QWEN_PAID_ENABLED` unset or explicitly set
to `false`. Paid Qwen routing is disabled by default and only turns on when
`QWEN_PAID_ENABLED=true` exactly.

Qwen currently has canonical auth alias support for both `QWEN_API_KEY` and
`DASHSCOPE_API_KEY`, canonical discovery through the DashScope catalog,
compatible-mode chat/reasoning/coding paths, AIGC image/video generation paths,
embeddings support, and canonical Brain local async polling for Wanx task-based
media jobs. Qwen chat is proven in the current conservative matrix; reasoning,
coding, vision, OCR, image, video, image-to-video, embeddings, and translation
remain partial until further live proof upgrades them.

Together currently has canonical auth through `TOGETHER_API_KEY`, dynamic model
discovery from its provider catalog, native image generation through
`/images/generations`, native video generation through `/videos`, canonical
Brain local async video polling through `/api/brain/media-jobs/:jobId`, and
artifact persistence after local Brain polling completion. TTS, STT,
embeddings, and rerank adapters exist but remain partial until further live
proof upgrades them.

PR #117 promoted this layer to production execution truth. The compatibility
`orchestrate()` export now delegates to canonical capability execution. Its old
provider/model routing body was deleted. Provider-native adapters receive the
model selected by discovery and return a failure if no model was selected.

Specialist Brain routes do not implement separate routing, policy, provider, or
artifact systems. They delegate to the capability router. Provider connection
tests may call provider health/catalog endpoints directly because they are
diagnostics, not product generation.

## Media Job Rule

Async provider media jobs must return a Brain local job id and a Brain poll URL.
Provider job ids may be exposed separately for diagnostics, but apps poll only
`/api/brain/media-jobs/:jobId`. The poll route is a Brain runtime surface and
must not require an admin dashboard session. Completion is only true after the
provider returns usable media and the artifact layer persists or references it.

Canonical Brain local media polling currently supports GenX, Qwen, and Together.
Hugging Face does not yet expose canonical Brain local async media polling, so
its provider truth must not claim canonical async job support.

Hugging Face non-chat capability truth is partial unless live provider proof has
been recorded. Local code and tests prove dynamic catalog support plus adapter
paths for several HF specialist families, but not live production completion.

Groq non-chat capability truth is also conservative. Local code and tests prove
Groq TTS/STT adapter paths and conservative discovery metadata, but not live
provider proof for those families.

`/api/brain/video-generate/:jobId` remains a legacy compatibility route. Apps
must treat `/api/brain/media-jobs/:jobId` as the canonical polling surface.

GenX image local completion is now proven in focused contract tests: the Brain
image route returns a local Brain job id plus `providerJobId`, the returned
`pollUrl` targets `/api/brain/media-jobs/:jobId`, and completed GenX polling
persists a canonical artifact. Live GenX provider proof is still required
before the provider matrix can mark GenX image as fully working.
