# Hardcoded Models Audit

Date: 2026-06-15

This is a file-level inventory of runtime model and provider literals found
outside tests and documentation. It does not remove or change any runtime
behavior. Line numbers refer to the PR #116 branch at audit time.

Classification:

- `NO`: retain temporarily because the literal is part of a live provider
  protocol, smoke test, compatibility contract, or pricing lookup.
- `YES`: delete only after its caller is removed or migrated.
- `AFTER CUTOVER`: replace through the Phase 1 discovery layer, prove parity,
  then remove the compatibility data.

| Model or provider literal | File | Line | Reason | Replacement | Delete? |
| --- | --- | ---: | --- | --- | --- |
| DeepSeek, Gemini, Mistral provider rows | `prisma/seed.ts` | 416-426 | Stale seed data conflicts with the six approved providers. | Seed from canonical provider truth. | YES |
| Legacy provider comment | `prisma/schema.prisma` | 192 | Comment lists obsolete provider examples. | Canonical provider IDs in `src/lib/providers/provider-types.ts`. | YES |
| `whisper-1` | `src/components/AudioRecorder.tsx` | 27-39 | Client default bypasses capability discovery. | Submit STT capability without a raw model. | AFTER CUTOVER |
| Static adult image models | `src/lib/adult-model-catalog.ts` | 81-270 | Policy catalog also acts as a model catalog. | Adult policy plus discovered eligible image models. | AFTER CUTOVER |
| GPT, Gemini, DeepSeek, Mistral defaults | `src/lib/app-profiles.ts` | 177-448 | App profiles embed obsolete provider/model routing. | Routing profile constraints and discovery scoring. | AFTER CUTOVER |
| `gpt-4o` fallback | `src/lib/app-discovery.ts` | 273 | Unproven universal fallback. | Capability registry plus discovery. | YES |
| Qwen and Groq route models | `src/lib/ai-routing-policy.ts` | 122-131 | Compatibility route table. | `src/lib/providers/registry.ts` dynamic plan. | AFTER CUTOVER |
| OpenAI, DeepSeek, Llama recommendations | `src/lib/capability-packs.ts` | 79-393 | Old app-pack truth includes prohibited direct providers. | Canonical capabilities and app scopes. | AFTER CUTOVER |
| OpenAI and DeepSeek gap requirements | `src/lib/capability-gaps.ts` | 59-71 | Unused stale capability truth. | Canonical capability registry. | YES |
| Provider adapter defaults | `src/lib/ai-capability-adapters.ts` | 225-616 | Live provider-native adapters need protocol defaults today. | Discovered model passed into adapter; retain protocol parsing only. | AFTER CUTOVER |
| GPT and Gemini agent defaults | `src/lib/agent-runtime.ts` | 98-355 | Live agent runtime embeds invalid model/provider pairs. | Agent capability request routed through discovery. | AFTER CUTOVER |
| Static model prices | `src/lib/budget-tracker.ts` | 21-85 | Legacy pricing and models include unapproved providers. | Provider pricing metadata or administered price table. | AFTER CUTOVER |
| Stable Diffusion and Wanx prefix guards | `src/lib/brain.ts` | 193-208 | Low-level compatibility dispatch infers protocols from names. | Provider adapter metadata. | AFTER CUTOVER |
| Anthropic, OpenAI, DeepSeek, Gemini provider order | `src/lib/coding-agent.ts` | 141 | Obsolete direct-provider selection. | Brain coding capability. | YES |
| Qwen image model choice | `src/lib/capability-routing-policy.ts` | 236-240 | Live policy selects model IDs directly. | Discovery scoring with image quality evidence. | AFTER CUTOVER |
| GenX static model families | `src/lib/genx-client.ts` | 168-222 | Live provider adapter catalog and aliases. | GenX model discovery; retain only API contract metadata. | AFTER CUTOVER |
| HF fallback models | `src/lib/hf-fallback.ts` | 29-97 | Duplicate static HF catalog. | HF Hub, task, inference-provider, and endpoint discovery. | AFTER CUTOVER |
| HF specialist defaults | `src/lib/hf-specialist-config.ts` | 4-40 | Deployment overrides fall back to hardcoded models. | Required endpoint/model configuration or discovery evidence. | AFTER CUTOVER |
| Groq/DeepSeek/OpenAI/Gemini LiteLLM lists | `src/lib/litellm-client.ts` | 77-103 | Optional integration exposes noncanonical routing. | Remove LiteLLM route or constrain it behind canonical provider truth. | YES |
| Groq and Qwen music text models | `src/lib/music-studio.ts` | 663-679 | Lyrics fallback selects a raw model. | Text capability discovery. | AFTER CUTOVER |
| OpenAI and DeepSeek creative preference | `src/lib/multimodal-router.ts` | 132 | Live legacy router includes prohibited providers. | Canonical provider scoring. | AFTER CUTOVER |
| Static multimodal pipeline routes | `src/lib/multimodal-pipeline.ts` | 80-116 | Pipeline steps hardcode providers and models. | Capability-only workflow steps. | AFTER CUTOVER |
| Gateway alias models | `src/lib/provider-gateway.ts` | 28-44 | Admin/control-plane compatibility gateway. | Canonical capability route plan. | AFTER CUTOVER |
| Static provider defaults | `src/lib/provider-registry.ts` | 55-99 | Live compatibility provider registry. | Phase 1 discovery registry. | AFTER CUTOVER |
| Static universal model routes | `src/lib/universal-model-catalog.ts` | 118-158 | Main duplicate model catalog used by compatibility runtime. | Dynamic discovered model snapshots. | AFTER CUTOVER |
| `wanx2.1-t2i-turbo` | `src/lib/qwen-wanx-polling.ts` | 19 | Provider job protocol fallback. | Persist the submitted discovered model with the job. | AFTER CUTOVER |
| `llama-3.1-8b-instant` | `src/lib/providers.ts` | 104 | Legacy provider health check default. | Discovered low-cost chat model. | AFTER CUTOVER |
| Qwen/Groq defaults | `src/lib/universal-provider-call.ts` | 21-45 | Compatibility direct execution helper. | Canonical route plan. | AFTER CUTOVER |
| Static video contracts | `src/lib/video-route-specs.ts` | 13-17 | Live provider contract table couples models to request shape. | Discovered model plus provider-native contract metadata. | AFTER CUTOVER |
| GenX fallback chain with prohibited providers | `src/lib/workspace-executor.ts` | 265 | Obsolete workspace execution routing. | Brain capability execution only. | YES |
| Qwen embedding model | `src/lib/rag-pipeline.ts` | 67 | Live RAG is tied to one model and dimension assumption. | Embedding capability discovery and stored vector metadata. | AFTER CUTOVER |
| OpenAI vector-size assumption | `src/lib/vector-store.ts` | 57 | Fixed size can conflict with Qwen embeddings. | Collection dimension from selected embedding model metadata. | AFTER CUTOVER |
| Qwen embedding model | `src/app/api/brain/embeddings/route.ts` | 15-24 | Live endpoint directly selects one model. | Embeddings adapter selected by canonical route plan. | AFTER CUTOVER |
| Groq/Qwen/HF STT defaults | `src/app/api/brain/stt/route.ts` | 66-106 | Live provider-native fallbacks. | Discovered STT model passed to each adapter. | AFTER CUTOVER |
| MiMo/Together/Groq/GenX/HF TTS defaults | `src/app/api/brain/tts/route.ts` | 162-239 | Live TTS route has proven providers but static models. | Discovered TTS route with adapter validation. | AFTER CUTOVER |
| Qwen and Groq video planning defaults | `src/app/api/brain/video-generate/route.ts` | 72-75, 241 | Live video route mixes job execution and static planning fallback. | Discovered video route and separate capability-only planner. | AFTER CUTOVER |
| Voice option models | `src/app/api/admin/voice/options/route.ts` | 19 | UI options expose a static unverified model. | Verified voice profiles from route discovery. | AFTER CUTOVER |
| Voice preview model | `src/app/api/admin/voice/preview/route.ts` | 23 | Preview directly selects GenX model. | TTS capability plus selected verified voice profile. | AFTER CUTOVER |
| Qwen provider test model | `src/app/api/admin/settings/test-qwen/route.ts` | 40 | Connectivity probe needs a concrete model. | Admin-configured smoke model or first discovered compatible model. | NO |
| Wanx capability test model | `src/app/api/admin/provider-capability-test/route.ts` | 45 | Explicit provider smoke contract. | Admin-configured smoke model or discovery result. | NO |
| Qwen and Groq smoke defaults | `src/lib/live-smoke-tests.ts` | 155-175 | Production proof requires deterministic fallback probes. | Environment override already exists; later select from discovery. | NO |

## Runtime Conclusion

The repository contains 293 non-test, non-documentation matches for common
model/provider identifiers. Not every match is a routing decision, but the
inventory proves that model selection is not yet fully dynamic. The highest
risk duplicates are `app-profiles.ts`, `capability-packs.ts`,
`agent-runtime.ts`, `universal-model-catalog.ts`, `provider-registry.ts`,
`provider-gateway.ts`, and the specialist media routes.

PR #116 changes none of them. The next runtime PR must migrate one capability
family at a time into `src/lib/providers/`, add parity tests, and only then
remove the superseded table.
