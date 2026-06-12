# V1 All AI Capabilities Wired

## Scope

This change connects the canonical 62-capability matrix to one authenticated connected-app execution contract:

- `POST /api/connected-apps/capabilities/execute`
- `GET /api/connected-apps/capabilities/jobs/[jobId]`

It does not add a second capability, provider, model, execution, or artifact registry.

## Coverage

| Measure | Count |
| --- | ---: |
| Canonical capabilities | 62 |
| Approved provider routes | 162 |
| Provider adapters | 6 |
| Connected-app AI scopes | 9 |
| Capability categories | 10 |
| Provider available, not wired | 0 |
| Unavailable | 0 |

Provider route coverage:

| Provider | Routes | Adapter |
| --- | ---: | --- |
| GenX | 34 | `genx_capability_adapter` |
| Hugging Face | 51 | `huggingface_capability_adapter` |
| Qwen / DashScope / Wan | 28 | `qwen_capability_adapter` |
| Xiaomi MiMo | 19 | `mimo_capability_adapter` |
| Groq | 13 | `groq_capability_adapter` |
| Together AI | 17 | `together_capability_adapter` |

## Execution Contract

The execute endpoint verifies the connected app, active status, raw-body HMAC, timestamp replay window, and capability scope before dispatch. It accepts text, structured input, public HTTPS media/document references, tabular data, mixed multimodal input, app context, and brand-kit references.

The provider adapters cover text, multimodal, vision, image, video, audio, music, avatar/voice, document, tabular, time-series, and bounded planning/simulation tasks. Hugging Face custom or uncommon task families use a configured model ID or Inference Endpoint. Missing credentials, endpoint configuration, storage, consent, or provider account access returns an honest non-success state.

All executions receive a durable connected-app job ID. Long-running provider jobs remain `processing` and are polled through the job endpoint. No artifact is created while work is pending. Completed generated output is persisted through the canonical artifact store; artifact persistence failure changes the job to `failed`.

## Safety And Context

- Voice cloning/design requires `consentConfirmed: true`.
- Robotics is restricted to planning or simulation; physical actuation is blocked.
- Reference URLs must be public HTTPS URLs.
- App intelligence contributes brand voice, tone, audience, products/services, domain context, and risks.
- App safety configuration is loaded for every execution context.

## Truly Unsupported Capabilities

None remain at the integration-contract level. Capabilities requiring a specialist Hugging Face model or private endpoint are wired through the Hugging Face adapter and return `needs_configuration` until that approved provider resource is supplied. This is configuration truth, not an unavailable or fake-working result.

## Proof

Final proof:

```text
npx.cmd tsc --noEmit
PASS

npm.cmd run build
PASS - 197 static pages generated; connected-app execute and job routes included

npx.cmd vitest run src/lib/__tests__/v1-ai-capability-truth.test.ts src/lib/__tests__/v1-all-ai-capabilities-wired.test.ts
PASS - 2 files, 16 tests

npm.cmd test -- --testTimeout=15000
PASS - 35 files, 703 tests
```

## Go-Live Blockers

1. Configure approved provider credentials in the vault for the routes intended for production.
2. Configure Hugging Face model IDs or Inference Endpoint URLs for specialist/custom task families.
3. Configure and verify artifact storage plus the production database.
4. Provision each connected app signing secret and least-privilege AI scopes.
5. Run provider-account smoke tests for enabled models because model availability and account entitlements are external deployment state.
