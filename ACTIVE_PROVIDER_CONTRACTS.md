# Active Provider Contracts

## Canonical provider IDs

- `genx`
- `qwen`
- `huggingface`
- `together`
- `groq`
- `mimo`

## Provider contract owner

- `src/lib/providers/provider-truth.ts`

## Provider notes from current runtime truth

### GenX

- Contract lives in `provider-truth.ts` plus GenX-specific client normalization.
- Active endpoint families in truth:
  - `async_generation`
  - `streaming_text`
- Required cleanup rule in effect: public/app routes no longer bypass runtime provider choice.

### Qwen

- Contract uses provider ID `qwen` only.
- Accepted key aliases are defined in `provider-truth.ts` and existing provider config paths.
- Paid gating remains tied to `QWEN_PAID_ENABLED`.

### Hugging Face

- Contract is task-first and discovery-backed.
- Settings test is only an account/token check.
- Capability proof must come from a wired task route or admin provider-capability proof route.

### Together

- Provider ID is `together` only.
- Model IDs may contain vendor prefixes such as `minimax/...`.
- Those model IDs are not treated as a provider identity.

### Groq

- Current provider truth claims only chat/reasoning/coding/vision/tts/stt.
- Settings test remains key/catalog only.

### MiMo

- Provider ID is `mimo` only.
- MiMo is distinct from MiniMax.

## Admin-only proof surfaces

- `/api/admin/provider-capability-test`
- `/api/admin/settings/test-provider`
- `/api/admin/settings/test-genx`
- `/api/admin/settings/test-qwen`
- `/api/admin/settings/test-huggingface`
- `/api/admin/settings/test-together`
- `/api/admin/settings/test-groq`

These are not canonical runtime execution owners.
