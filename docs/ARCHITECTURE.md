# AmarktAI Network V1 Architecture

## Execution Path

```text
APP
  -> BRAIN
  -> Capability Registry
  -> Routing Profile
  -> Provider Registry
  -> Dynamic Model Discovery
  -> Scoring
       - quality
       - speed
       - cost
       - availability
       - adult permission
  -> Execute
  -> Artifact
  -> Storage
  -> APP
```

Apps authenticate to AmarktAI, request a scoped capability, and receive a
result, job reference, artifact reference, or truthful blocker. Apps never
store provider credentials or call provider APIs directly.

## Brain Responsibilities

### Capability Registry

Defines canonical capabilities, inputs, outputs, safety requirements, and
artifact behavior. It does not duplicate provider or model catalogs.

### Routing Profiles

Express intent through `cheap`, `balanced`, `premium`, `mixed`,
`best_available`, or `custom`. The profile feeds scoring and does not hardcode
a provider.

### Provider Registry And Mesh

Defines approved providers, credentials, health, endpoint families, and
provider-native adapters. Discovery and health determine eligible routes.

### Dynamic Model Discovery

Discovers current models and task support where providers allow it. Product UX
must not depend on a permanent raw model list.

### Scoring

Scores eligible candidates by quality, speed, cost, availability, and adult
permission. Policy and required inputs filter candidates before scoring.

## Supporting Systems

- **Research Engine:** plans research, records provenance, and uses the Brain.
- **Agent System:** operates under scopes, approvals, budgets, and policy.
- **Artifact System:** records durable outputs, ownership, provenance, storage,
  previews, jobs, and executions.
- **Memory:** stores authorized context and retrieval data for Brain use.
- **Brand Context:** retrieves authorized voice, style, audience, and campaign
  context owned by apps.
- **Adult:** applies capability-level app, dashboard, request, and provider
  policy gates.
- **Provider Mesh:** connects the six approved providers through native
  adapters without becoming a second router.

## Non-Negotiable Boundaries

- No direct app-to-provider calls.
- No universal hardcoded provider or model.
- No duplicate provider, model, capability, or routing truth.
- No fake success, readiness, artifact, or job state.
- No model is permanent merely because it worked once.
