# V1 Final Source-of-Truth and Test Cleanup

Date: 2026-06-12

## Canonical branch

The canonical V1 integration branch is:

`integration/cline-source-of-truth`

Feature, phase, launch, VPS-import, and previous V1 branches are historical inputs only. New V1 work must branch from and merge back into the canonical integration branch.

## Current merged PR chain

The V1 source-of-truth chain currently present on the canonical branch is:

| PR | Scope |
| --- | --- |
| #88 | Phase 0 source-of-truth purge |
| #89 | Phase 1 execution core |
| #90 | Phase 2 Outputs / Artifact Library |
| #91 | Phase 3 Command Center |
| #92 | Phase 4 Media Studio |
| #93 | Connected apps |
| #94 | App registration UI |
| #95 | V1 universal AI capability truth matrix |
| #96 | V1 all AI capabilities wired |
| #97 | V1 deployment readiness |
| #98 | V1 live provider and Studio E2E proof |

PR #98 merged on 2026-06-12 as commit `bec5dd2971fc033e2d83b0b9f193814ad5c5b138`.

## Open PR handling

| PR | Recommendation | Reason |
| --- | --- | --- |
| #87 `integration/cline-source-of-truth` -> `main` | Preserve and keep as the canonical eventual integration-to-main PR | It is the only open PR whose head is the canonical V1 branch. |
| #86 `launch/source-of-truth` -> `main` | Close as superseded; preserve Git history | Its launch branch predates the canonical integration chain. |
| #85 VPS Studio stash -> `main` | Close as superseded; preserve Git history | It is an import/stash branch, not a valid V1 merge base. |
| #84 VPS completion -> `main` | Close as superseded; preserve Git history | It is an older imported implementation superseded by PRs #88-#98. |

This audit does not delete branches or rewrite history.

## Duplicate and stale branch handling

Do not use these as new work bases:

- `launch/source-of-truth`
- `vps/phase1-ai-brain-router-20260609-084925`
- `vps/phase1-ai-brain-router-studio-stash-20260609-085347`
- `codex/v1-universal-ai-capability-truth`
- merged phase branches `codex/phase-0-*` through `codex/phase-4-*`
- merged V1 branches `codex/v1-universal-ai-capability-truth-real`, `codex/v1-wire-all-ai-capabilities`, and `codex/v1-deployment-readiness`
- `cline/v1-live-provider-studio-e2e`

These branches should remain available only as merge and review history.

## Canonical truth files

| Truth | Canonical file | Compatibility projections |
| --- | --- | --- |
| Approved providers | `src/lib/provider-mesh.ts` | `approved-ai-catalog.ts`, `provider-catalog.ts`, and provider governance/settings views derive from the mesh |
| Models and routes | `src/lib/universal-model-catalog.ts` | `model-registry.ts` and `ai-model-catalog.ts` derive their entries from `UNIVERSAL_MODEL_ROUTES` |
| 62 V1 AI capabilities | `src/lib/ai-capability-taxonomy.ts` | Connected-app execution imports `AI_CAPABILITY_TAXONOMY` directly |
| Connected-app execution | `src/lib/connected-app-capability-engine.ts` | API routes delegate authentication, scope validation, routing, jobs, and artifacts to this engine |

No second provider or model declaration set was found in the active V1 execution path. The older `capability-router.ts` and `capability-engine.ts` expose compatibility/product routing labels; they are not the canonical 62-capability provider matrix. Their provider suggestions are now restricted to the approved provider set.

## Approved providers

The only approved direct AI providers are:

1. GenX
2. Hugging Face
3. Qwen / DashScope / Wan
4. Xiaomi MiMo
5. Groq
6. Together AI

Live smoke tests now iterate `APPROVED_DIRECT_PROVIDER_IDS` from `provider-mesh.ts`; they no longer maintain a second six-provider array.

## Runtime leaks corrected

- Removed OpenAI and MiniMax from legacy route fallback filters.
- Removed ElevenLabs and Deepgram from live voice options and preview routing.
- Restricted assistant TTS provider selection with `isApprovedDirectProvider`.
- Replaced legacy capability-engine setup suggestions with approved providers.
- Kept realtime voice routes present, but changed them to return truthful `unavailable` status because no approved-provider realtime session adapter is wired.
- Preserved Hugging Face model namespaces such as `openai/whisper-*`; these are model identifiers executed through Hugging Face, not direct OpenAI provider routes.

## Stale documentation

The authoritative V1 documents are:

- `docs/audits/V1_AI_CAPABILITY_TRUTH_MATRIX.md`
- `docs/audits/V1_ALL_AI_CAPABILITIES_WIRED.md`
- `docs/audits/V1_DEPLOYMENT_READINESS.md`
- `docs/audits/V1_LIVE_PROVIDER_STUDIO_E2E.md`
- this report

Older files under `docs/forensic/` and pre-V1 files under `docs/audits/` contain point-in-time findings, provider research, dashboard proposals, or superseded implementation claims. They are retained as historical evidence and must not override the canonical files above. In particular, old OpenAI, Anthropic, Gemini, DeepSeek, MiniMax, ElevenLabs, Deepgram, OpenRouter, or other provider references are not approval records.

## Test infrastructure failure fixed

The full suite initially reported:

- 37 test files
- 753 passing tests
- 1 failing test

The failure was in `v1-live-provider-smoke-tests.test.ts`. It asserted that the API route file itself contained the implementation name `verifyWebhookSignature`. PR #96 had correctly moved HMAC verification into `authenticateConnectedAppCapabilityRequest` in the canonical connected-app engine, so the assertion tested a stale implementation detail rather than behavior.

The test now verifies the real delegation chain:

1. The execute route calls `authenticateConnectedAppCapabilityRequest`.
2. The canonical connected-app engine calls `verifyWebhookSignature`.
3. Existing behavioral webhook tests continue to cover invalid signatures.

The first full-suite rerun then exposed two older research assertions that required OpenAI and Gemini in `CAPABILITY_MAP.suggestedProviders`. Those tests were retained and updated to require canonical approved providers while continuing to verify both research capability entries and routes.

No useful test was deleted or skipped.

## Safety contracts added

`v1-final-source-truth-cleanup.test.ts` proves:

- approved provider projections equal the provider mesh;
- the legacy model registry is a deterministic projection of the universal model catalog;
- the connected-app engine routes the canonical 62-capability taxonomy;
- every selected connected-app route uses an approved provider;
- live smoke tests use only the canonical approved provider IDs;
- processing jobs start without artifacts;
- artifacts are created only after a real completed adapter result;
- unsupported realtime voice reports `unavailable`;
- live voice choices do not expose prohibited direct providers.

## Proof

Focused source-truth tests:

`4 files passed, 67 tests passed`

Final proof:

- `npx.cmd tsc --noEmit`: passed
- `npm.cmd run build`: passed; compiled successfully and generated 198 static pages
- `npm.cmd test`: passed; 38 files and 761 tests

## Remaining backend blockers before redesign

No source-of-truth or test-suite blocker remains after the final proof commands pass.

Operational readiness still depends on the deployment-owned credentials, specialist Hugging Face endpoints, artifact storage, and connected-app signing configuration documented in `V1_DEPLOYMENT_READINESS.md`. Realtime voice remains honestly unavailable until an approved provider receives a tested session adapter; it must not be advertised as ready during the redesign.

## Exact next PR recommendation

After this cleanup merges, the next PR should be:

`[V1 Frontend] Dashboard redesign against canonical runtime truth`

That PR must consume the existing provider mesh, universal model catalog, 62-capability taxonomy, execution core, jobs, approvals, and artifact APIs. It must not create replacement registries, fake readiness, or parallel execution/output systems.
