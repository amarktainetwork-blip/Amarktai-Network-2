# Two-Day Completion Plan

## What Can Realistically Be Completed in 48 Hours

### Day 1

1. Unify `/api/brain/agent-request` with canonical `/api/brain/request`
- reuse separate `agentSystemPrompt`
- reuse retrieval-engine + federated-memory context
- reuse `saveMemory()` and `logRouteOutcome()`
- add BrainEvent parity and telemetry parity

2. Replace fake agent readiness
- remove always-`PARTIAL` behavior in `agent-audit.ts`
- either compute real executable readiness or surface a more honest static status

3. Fix workflow/webhook safety boundaries
- add auth to `/api/workflows`
- route webhook-style external side effects through approval gates
- fix webhook retry job type mismatch

4. Fix highest-confidence runtime correctness bugs
- explicit capability-to-taxonomy mapping gaps
- Studio `scenePlanOnly` payload mismatch
- ensure no route reports stronger proof than it actually executes

### Day 2

5. Add durable run history for multi-agent/team flows
- persist team/task runs instead of in-memory-only stores

6. Add queue/worker/deployment readiness truth
- worker required for queued flows
- expose that requirement clearly in readiness/dashboard truth

7. Tighten provider/capability proof boundaries post-deploy
- run live VPS proofs in the approved order
- downgrade or upgrade capability truth based on actual route outputs only

## What Cannot Be Honestly Completed in 48 Hours

1. A fully safe self-learning network across apps
2. A production-grade emotional relationship layer for companion/adult apps
3. Complete durable workflow orchestration on LangGraph-class persistence and resume semantics
4. Full replay/debugger + eval infrastructure for agents and workflows
5. A governed cross-app knowledge network with UI, approval, expiry, subscription, and audit completeness
6. A clean final dashboard redesign

## Required Database Models

High priority:
- `AgentAssignment`
- `AgentRun`
- `TeamRun`
- `TeamRunStep`
- `SharedKnowledgeItem`
- `SharedKnowledgeSubscription`
- `SharedKnowledgeAuditLog`
- `CrossAppPermissionGrant`
- `EmotionalRelationshipState`
- `EmotionConsentRecord`
- durable workflow step-run model
- webhook retry state if not folded into existing delivery records

## Required APIs

Highest value:
- agent deployment/assignment CRUD with durable state
- agent/team run history
- workflow pause/resume/cancel/approve
- shared-knowledge publish/approve/list
- emotional state export/delete/reset
- queue/DLQ operations

## Required Dashboard Screens Later

- real agent deployment and runs
- workflow runs / queue / retries / DLQ
- shared knowledge approvals and subscriptions
- emotional-state / consent admin
- vector memory explorer
- unified operations/health screen

## Safe Automation Boundary For This Window

Allowed:
- detection
- health checks
- recommendations
- bounded retries and cleanup
- app-local learning analysis with review

Not allowed without approval:
- code mutation
- deploy/restart/rollback
- external publish / arbitrary webhook side effects
- cross-app data sharing
- adult capability expansion
- autonomous relationship progression

## First 20 Fixes in Priority Order

1. Fix explicit capability-to-taxonomy mapping gaps in canonical orchestration
2. Unify `/api/brain/agent-request` with `/api/brain/request`
3. Add auth to `/api/workflows`
4. Route workflow external side effects through approval policy
5. Repair webhook retry queue type and retry state evolution
6. Add worker-required readiness checks
7. Persist multi-agent/team task history
8. Replace fake `agent-audit` readiness
9. Make `/api/admin/agents` honest or rename it to operator catalog
10. Remove or archive hidden dashboard pages not in canonical nav
11. Clean placeholder seeded app data from admin app surfaces
12. Stop labeling Firecrawl-backed website execution as `local-crawler`
13. Persist provider reliability/circuit-breaker state durably
14. Add queue dashboard / operator queue inspection surface
15. Add shared-knowledge DB schema and read-only admin APIs
16. Add consent-aware emotional memory reset/export/delete APIs
17. Add durable workflow step-run persistence
18. Narrow HF rerank to explicit supported contracts instead of broad-catalog routing
19. Tighten Together video eligibility to provider-safe contracts only
20. Run and record post-deploy live VPS provider proofs on the new commit

## Exact Next Implementation Prompt

`Unify /api/brain/agent-request with the canonical /api/brain/request execution path. Reuse native agentSystemPrompt injection, retrieval-engine, federated-memory context, saveMemory, logRouteOutcome, BrainEvent parity, and webhook/event telemetry. Keep app isolation and approval rules. Add focused tests proving agent-request now uses the same memory/retrieval/learning path as brain/request and does not duplicate weaker legacy prompt-concatenation behavior.`
