# AmarktAI Network V1 Operating Truth

This document is the law for AmarktAI Network V1. When code, tickets, prompts,
or older documents disagree with it, stop and resolve the conflict before
shipping.

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

Provider-specific adapters may contain protocol identifiers. Capability callers
must use the canonical registry and router rather than selecting raw providers
or models. Models are dynamic and discovery-driven.

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
provider discovery returns model-level capability evidence. Missing discovery
returns no route; it never creates a default model or fake fallback.

Provider scoring considers quality, speed, cost, availability, adult
permission, research support, streaming, health, and artifact support.
Provider and model preferences constrain scoring but do not authorize an
unknown provider or undiscovered model.

Qwen discovery distinguishes compatible-mode and AIGC endpoint families. Its
standard endpoint retains free-quota truth, and models marked outside free
quota are excluded unless `QWEN_PAID_ENABLED=true`. MiMo uses its token-plan
endpoint. Hugging Face discovery includes public model/task metadata,
inference-provider mappings, and separately configured private or dedicated
endpoints.

Existing execution APIs and business workflows are not switched in Phase 1.
Their compatibility registries remain in place until a dedicated runtime
cutover can prove parity without changing product behavior.
