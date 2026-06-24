# PR118 Provider Runtime And Dashboard Recovery

## Scope

PR #118 repairs provider execution and critical dashboard plumbing without
changing the final Brain architecture established by PRs #114-#117.

## Root Cause

`NO_ROUTE_FOUND` was produced before adapter execution because the dynamic
router required exact model-level task tags. OpenAI-compatible `/models`
catalogs commonly return valid model IDs without capability metadata, so
configured providers produced zero candidates.

Studio and the dashboard assistant also retained obsolete preselection:

- Studio selected from the static capability route layer and passed provider
  and model overrides into canonical execution.
- Assistant chat used `live-ai-routing`.
- Assistant streaming called GenX directly.

Those selections disagreed with the final Brain ownership rules.

## Repair

The runtime evidence order is now:

1. normalized exact task evidence from the live model catalog
2. capability evidence inferred from catalog task/type/descriptor metadata
3. lower-scored provider-contract evidence for discovered models with no task
   metadata
4. configured provider health
5. canonical scoring and provider-native adapter execution

A model already identified as another modality is never relabeled. A provider
with no discovered model still returns `NO_ROUTE_FOUND`.

Hugging Face discovery is filtered by requested pipeline task and uses
`router.huggingface.co/hf-inference`. Together has native video job, STT,
embeddings, and rerank paths. Qwen, MiMo, and GenX connection tests select a
model from live discovery instead of a fixed default.

## Dashboard Recovery

- Provider diagnostics now read canonical provider discovery rather than the
  static universal model catalog.
- Studio no longer preselects a provider or model.
- Command Center records the provider and model actually executed.
- Assistant chat and streaming delegate to the capability router.
- Streaming is labelled `buffered_canonical_execution`; it does not pretend to
  be token-level provider streaming.
- The Capabilities page labels repository status as `Wired`, not live working.

## Capability Proof

This checkout has no production provider credentials or `DATABASE_URL`.
Therefore no production model, live latency, provider charge, or artifact ID is
claimed. The table records repository proof and the required VPS follow-up.

| Capability | Route | Selected model | Latency | Fallback | Artifact | Result |
| --- | --- | --- | --- | --- | --- | --- |
| chat | six-provider discovery | dynamic | not live-tested | candidate fallback tested | optional text artifact | partial |
| streaming | Brain chat route | dynamic | not live-tested | canonical fallback | optional text artifact | partial, buffered |
| image | HF/Together/GenX/Qwen | dynamic | not live-tested | provider/model fallback tested | image | partial |
| video | Together/GenX/Qwen | dynamic | not live-tested | provider/model fallback | video job then artifact | partial |
| TTS | HF/Together/Groq/GenX/MiMo | dynamic | not live-tested | provider/model fallback | voice artifact | partial |
| STT | HF/Together/Groq/GenX | dynamic | not live-tested | provider/model fallback | transcript | partial |
| embeddings | HF/Together/Qwen | dynamic | not live-tested | provider/model fallback | direct vector result | partial |
| rerank | HF/Together | dynamic | not live-tested | provider/model fallback | direct ranked result | partial |
| moderation | Brain policy | none | local | policy fallback | none | working |
| avatar | HF/GenX/Qwen/Together | dynamic | not live-tested | provider/model fallback | avatar | partial |
| adult | Brain policy plus approved route | dynamic | not live-tested | policy-gated | media/text by capability | partial |

## Provider Status

All six providers are `partial` in this PR report because adapter and discovery
paths exist but this checkout cannot run authenticated production proof.
Nothing is marked broken at the provider level. MiMo voice clone/design/omni,
true token streaming, long-form assembly, and live specialist coverage remain
unproven.

## Connected Apps

Signed, active, scoped apps can call the connected-app capability API. The
Marketing App can connect under the same HMAC and scope contract. Apps cannot
select providers, models, or endpoints. Actual execution still requires a
discovered provider route and configured production credentials.

## Production Follow-Up

After deployment, run provider tests and the existing live creative smoke test
from `/var/www/amarktai/platform`. Record provider, discovered model, latency,
fallback attempts, job ID, artifact ID, and preview URL. Do not upgrade any
`partial` entry to `working` until that evidence is persisted.

## Official Protocol References

- Hugging Face Inference Providers:
  https://huggingface.co/docs/inference-providers/index
- Together video API:
  https://docs.together.ai/reference/create-videos
- Together audio transcription:
  https://docs.together.ai/reference/audio-transcriptions
- Together embeddings:
  https://docs.together.ai/reference/embeddings
- Groq model discovery:
  https://console.groq.com/docs/models
