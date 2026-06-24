# AmarktAI Network

AmarktAI Network is the main capability-first AI runtime. Apps request capabilities; the Brain owns provider discovery, model discovery, routing, fallback, safety, artifacts, jobs, and proof.

This repo is not the Marketing App. Future apps plug into this runtime.

## Source Of Truth

| Area | Current owner |
|---|---|
| Provider contracts | `src/lib/providers/provider-truth.ts` |
| Provider discovery | `src/lib/providers/provider-discovery.ts` |
| Model discovery | `src/lib/providers/model-discovery.ts` |
| Capability aliases/registry | `src/lib/providers/capability-registry.ts` |
| V1 product capability matrix | `src/lib/brain/v1-capability-matrix.ts` |
| Runtime execution/fallback | `src/lib/orchestrator.ts` |
| Provider adapters | `src/lib/ai-capability-adapters.ts` |
| Artifacts | `src/lib/artifact-store.ts` |
| Jobs | `src/lib/control-plane-jobs.ts`, `src/lib/media-job-store.ts` |
| Dashboard readiness | `src/lib/runtime-capability-truth.ts` |
| Proof harness | `scripts/v1-25-capability-proof.ts` |

See `RUNTIME_SOURCE_OF_TRUTH.md`, `ACTIVE_PROVIDER_CONTRACTS.md`, `ACTIVE_CAPABILITY_MATRIX.md`, `ACTIVE_OPEN_SOURCE_STACK.md`, `INCOMPLETE_AND_BLOCKED.md`, and `DELETE_REVIEW_REQUIRED.md`.

## Active Provider Boundary

The active direct V1 provider IDs are:

- `genx`
- `huggingface`
- `qwen`
- `mimo`
- `groq`
- `together`

OpenAI and other provider names may appear as upstream model families, legacy examples, or Hugging Face model namespaces. They are not active direct V1 provider IDs unless added to `src/lib/providers/provider-truth.ts`.

## Artifact Rule

Normal flowing chat does not create a stored artifact per message. Artifacts are for intentional outputs such as image, video, audio, music, voiceover, code, documents, research reports, and exported campaign/brand outputs.

## Quick Start

```powershell
npm install
Copy-Item .env.example .env
npm run db:push
npm run dev
```

Set at least one approved provider key before expecting live AI proof.

## Verification

```powershell
npm test -- --run
npm run build
npx.cmd tsx scripts/v1-25-capability-proof.ts
git diff --check
git diff --stat
```

Do not deploy from this cleanup branch unless a separate deploy task explicitly asks for it.
