# AmarktAI V1 Runtime Truth

Date: 2026-06-15
PR: #117
Branch: `v1/final-completion-20260615`

## Final Architecture

```text
APP
  -> BRAIN
  -> CAPABILITY
  -> PROVIDER TRUTH
  -> LIVE DISCOVERY
  -> SCORING
  -> PROVIDER ADAPTER
  -> JOB / ARTIFACT
  -> APP
```

Production ownership:

| Responsibility | Canonical source |
| --- | --- |
| Provider truth, discovery, cache, health, scoring | `src/lib/providers/*` |
| App-facing execution | `src/lib/capability-router.ts` |
| Policy, execution, fallback, jobs, artifacts | `src/lib/orchestrator.ts` |
| Provider protocol calls | `src/lib/ai-capability-adapters.ts` |
| Generated output persistence | `src/lib/artifact-store.ts` |
| Research interface | `src/lib/research-runtime.ts` |
| Agent execution | `src/lib/agent-runtime.ts` |

The exported `orchestrate()` function is now a compatibility adapter into the
capability router. Its old provider/model routing implementation was deleted.
Specialist routes delegate instead of duplicating policy, routing, provider
calls, or artifacts.

## Connection Readiness

1. **Can apps connect now?** Yes. Registered apps can use signed, scoped Brain
   requests. Execution succeeds only when live discovery finds a healthy route.
2. **Can the Marketing App connect now?** Yes for scoped Brain capabilities.
   Full Marketing App integration remains PR #121.
3. **Can apps select providers or models?** No. Raw preferences sent to
   specialist compatibility routes are ignored.

## Capability Truth

`WORKING` means architecture and repository execution are complete with prior
proof. `PARTIAL` means the architecture is final but provider/runtime proof or
a pipeline stage is incomplete. `BROKEN` means the named contract cannot run.

| Capability | Status | Runtime truth |
| --- | --- | --- |
| chat | WORKING | Dynamic discovery, scoring, adapter execution. |
| image | PARTIAL | Canonical path and artifacts exist; live provider catalog evidence is deployment-dependent. |
| video | PARTIAL | Canonical jobs/polling/artifacts exist; broad live proof is incomplete. |
| music | PARTIAL | Music Studio delegates to Brain; provider proof remains incomplete. |
| TTS | WORKING | Canonical route; prior playable artifact proof exists. |
| STT | PARTIAL | Canonical upload route and transcript artifact path exist. |
| avatar | PARTIAL | Discovery route exists; talking-avatar proof is incomplete. |
| adult | PARTIAL | App policy gating is canonical; provider capability evidence varies. |
| research | PARTIAL | Canonical interface and artifact path exist; shared tools/agent completion is PR #118. |
| image edit | PARTIAL | Routes only when discovery proves an eligible adapter/model; otherwise `NO_ROUTE_FOUND`. |
| OCR/documents/embeddings/rerank | PARTIAL | Canonical capabilities exist; live endpoint proof varies. |
| memory | PARTIAL | Existing memory services remain; semantic infrastructure is deployment-dependent. |
| artifacts | WORKING | Storage, records, preview/download, reuse, and archive exist. |
| agents | PARTIAL | Capability-first execution exists; durable team/handoff completion remains. |

No capability is reported `BROKEN` by architecture. A missing provider/model
route is an honest `NO_ROUTE_FOUND`, not fake success.

## Media And Long Form

Canonical media output flows through Brain execution and artifacts. Long-form
video has the final stage contract:

```text
storyboard -> scene list -> scene jobs -> provider generation
-> voice -> music -> assembly -> artifact
```

Scene generation, polling, assembly, and final artifact code exist. Integrated
voice/music composition remains partial.

## Research

Research is explicitly `PARTIAL`. `research-runtime.ts` defines:

```text
research -> shared tools -> agent -> artifact
```

Google, website, YouTube, Reddit, news, PDF, OCR, browser, and social tools are
future tool contracts, not fake completed integrations.

## Deleted Legacy Components

- Runtime-dead legacy orchestrator selection/execution body.
- Unused `src/lib/capability-gaps.ts`.
- Route-local specialist routing/provider/artifact implementations replaced by
  delegates.

Active Labs, LiteLLM diagnostics, workflow compatibility, and old agent role
labels were not deleted without parity. They are not production routing truth.

## Remaining Before 100 Percent Production Ready

1. Deploy all six provider credentials and verify live model catalogs expose
   capability metadata.
2. Run production smoke proof for every capability intended for launch.
3. Complete research tools and citation verification in PR #118.
4. Complete dashboard in PR #119 and website in PR #120.
5. Integrate the Marketing App through signed scoped Brain calls in PR #121.
6. Finish durable multi-instance agent/team state and long-form voice/music
   composition where required.
