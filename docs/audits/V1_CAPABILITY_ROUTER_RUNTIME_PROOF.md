# V1 Capability Router Runtime Proof

## Canonical truth

- Product capability router: `src/lib/capability-router.ts`
- Shared quality policy: `src/lib/capability-routing-policy.ts`
- Canonical provider registry: `src/lib/provider-mesh.ts`
- Canonical 62-capability taxonomy: `src/lib/ai-capability-taxonomy.ts`
- Canonical provider adapters: `src/lib/ai-capability-adapters.ts`
- Canonical model routes: `src/lib/universal-model-catalog.ts`

No second capability, provider, model, job, or artifact truth layer was added.

## Runtime flow

```text
Studio / Connected App / Future App
-> AmarktAI capability request
-> quality and readiness policy
-> approved provider adapter
-> execution or long-running job
-> artifact and result
```

Studio resolves a canonical capability and quality route before dispatch.
Connected apps authenticate HMAC, check active status and scope, resolve the
same policy, execute through canonical adapters, record an audit event, and
return job/artifact/result references.

## Routes calling the product router

Direct `executeCapability` consumers include:

- `/api/brain/execute`
- `/api/brain/image`
- `/api/brain/research`
- `/api/brain/suggestive-image`
- `/api/brain/adult-video`
- `/api/admin/studio/execute` for text, code, and file analysis
- `/api/admin/amarktai-assistant/chat`
- `/api/admin/workspace/run`
- `/api/admin/apps/intelligence`

Connected app execution uses `executeConnectedAppCapability`, which reads the
canonical taxonomy and adapter registry rather than duplicating the product
router.

## Direct provider routes

Acceptable backend adapter or diagnostic boundaries:

- provider health-test, benchmark, and admin diagnostic routes
- `ai-capability-adapters.ts`, `brain.ts`, and provider client modules
- media protocol routes for video, STT, TTS, music, adult text/image,
  embeddings, and reranking when called after capability/policy validation

Migration candidates:

- `/api/brain/stream` remains provider-oriented.
- `/api/admin/ai-partner/chat` calls the provider layer directly.
- media routes still contain provider protocol branches instead of delegating
  every request through one adapter interface.
- Repo Workbench legacy APIs remain despite being hidden from V1.

Future consolidation must move protocol branches behind
`ai-capability-adapters.ts`, not create another router.

## Studio proof

Studio:

- receives capability, prompt, references, app context, and quality tier
- resolves `cheap`, `balanced`, `premium`, or `auto`
- returns `NEEDS_CONFIGURATION` when no configured route exists
- supports current text/reasoning, image, video, music, TTS/STT, avatar, and
  document/file-analysis contracts
- records execution, jobs, artifacts, and safe errors
- hides provider/model details from normal user-facing output

Music supports theme, optional lyrics, up to five genres, blends including
rock + pop + folk, mood, vocal style, duration, quality tier, and a real
artifact, job, or setup-needed result.

## Connected app proof

Connected apps provide app identity, HMAC signature, capability, prompt/input,
quality tier, references, callback metadata, and scopes. Responses provide
accepted/rejected state, execution/job ID, quality tier, artifact/result, and
safe error. Provider, model, and adapter names are not returned by normal
execute or job-poll endpoints.

Accepted executions record `capability.execution` events. Missing credentials
produce `needs_configuration`; no fake success or completed artifact is
created.

## GenX truth

GenX remains an approved adapter and media protocol implementation. It is not
the universal selection: routing tests prove Groq, Qwen, Hugging Face, and
GenX can win for appropriate capabilities and policies. Remaining hardcoded
GenX media branches are adapter-consolidation work, not the app-facing product
contract.
