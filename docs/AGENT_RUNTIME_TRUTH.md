# Agent Runtime Truth

Date: 2026-06-15

## Classification

| Surface | Classification | Runtime truth |
| --- | --- | --- |
| `src/lib/agent-runtime.ts` | LEGACY | Real synchronous execution through `callProvider`, but agent definitions hardcode providers/models and active tasks are process memory only. |
| `src/app/api/brain/agent/dispatch` | CANONICAL | Live authenticated dispatch surface with permission checks, audit events, optional queueing, and synchronous fallback. It still delegates to the legacy runtime. |
| `src/lib/agent-audit.ts` | CANONICAL | Used by dispatch to record and inspect agent execution policy/audit data. |
| `src/lib/agent-registry.ts` | LEGACY | Dashboard operator-agent projection. It uses `live-ai-routing`, not the Phase 1 provider truth layer, and includes V1-excluded Repo Workbench language. |
| `src/app/api/admin/agents` | LEGACY | Real read/assignment API over the operator registry; it does not execute agents. |
| `src/lib/manager-agents.ts` | PARTIAL | Real Prisma-backed checks and logs exist. Some checks degrade to status messages when Redis or DB infrastructure is unavailable. |
| `src/app/api/admin/managers` | PARTIAL | Connected to manager checks/status, but this is operational inspection rather than autonomous management. |
| `src/lib/multi-agent-team.ts` | PLACEHOLDER | Team execution calls real agents, but team definitions and task history live in process-local maps and are lost on restart. |
| `src/app/api/admin/teams` | PLACEHOLDER | Live HTTP surface over the process-local team store. Not production-durable. |
| `src/lib/workflow-engine.ts` | PARTIAL | Workflow definitions and runs persist in Prisma and AI completion steps call a provider. The step schema can still select a raw provider/model and does not use canonical discovery. |
| `src/app/api/workflows` | PARTIAL | Real CRUD/execute entry point over the workflow engine. |
| `src/lib/app-agent.ts` | LEGACY | Real app-agent configuration and prompt construction used by Brain routes, but separate from the operator and internal agent registries. |
| `src/lib/coding-agent.ts` | DELETE | Separate app-generation system with process-local sessions, obsolete direct providers, and scaffold output containing placeholder authentication. It is outside V1 operating truth. |

## Real Agents

The internal roles in `agent-runtime.ts` can create and execute provider calls:
planner, router, validator, memory, retrieval, creative, campaign,
trading analyst, app operations, learning, security, voice, travel planner,
developer, support/community, healing, chatbot, and marketing agent.

This is real code, but it is not production-complete:

- Provider and model defaults are hardcoded.
- Task state is process-local.
- Permissions are app-profile based rather than canonical connected-app
  capability scopes.
- The runtime does not use Phase 1 dynamic provider/model discovery.
- A completed provider response is not automatically a canonical artifact.

## Teams

Predefined research, development, support, creative, and other teams exist.
Parallel task execution and handoff chains call `executeAgent`. The store is an
in-memory `Map`, so teams and history are not durable across deployments,
workers, or multiple instances. Classify team APIs as PLACEHOLDER until state,
scope, approval, job, and artifact contracts are durable.

## Workflows

Workflow definitions and run records are durable Prisma records. Sequential,
parallel, conditional, loop, webhook, delay, transform, AI completion, input,
and output steps are implemented. Workflow execution is PARTIAL because raw
provider/model configuration remains possible and workflow results are not
uniformly linked to canonical jobs and artifacts.

## Dead Or Delete Candidates

- `coding-agent.ts`: remove after confirming no production Labs route depends
  on generated scaffolds.
- Operator agents tied to Repo Workbench or app generation: remove or rewrite
  as capability-only roles because those products are excluded from V1.
- Duplicate agent definitions in `agent-registry.ts`, `agent-runtime.ts`, and
  `app-agent.ts`: converge only after a single durable agent contract has parity
  tests.

No code is deleted in PR #116.
