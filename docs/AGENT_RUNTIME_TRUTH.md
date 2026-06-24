# Agent Runtime Truth

Date: 2026-06-15
PR: #117

## Canonical Agents

The product truth contains six agent classes:

- research
- creative
- operations
- ceo
- marketing
- custom

Existing internal role names such as planner, validator, retrieval, campaign,
developer, and support remain compatibility labels because active dispatch,
worker, and team contracts use them. `canonicalAgentType()` maps every label to
one of the six classes. They are not additional product agents.

## Execution

`executeAgent()` does not select a provider or model. It calls the canonical
`agents` capability through `capability-router.ts`. Provider truth, discovery,
scoring, health, adapter execution, jobs, and artifacts are owned by the Brain.

The agent audit truth is `PARTIAL`, not `READY`, because:

- task and team stores include process-local state
- compatibility role names remain
- durable multi-instance handoff is incomplete
- live execution still depends on provider catalog evidence

No provider/model default is stored in the agent runtime.

## Legacy Boundaries

- `multi-agent-team.ts` is partial and process-local.
- `workflow-engine.ts` is a durable workflow system but its AI completion step
  still needs a later capability-router cutover.
- `coding-agent.ts` and the Labs route remain active legacy imports. They were
  not deleted without parity and are not part of canonical V1 agent truth.
- `agent-registry.ts` is a dashboard compatibility projection, not execution
  truth.

Future work must improve durability and remove compatibility labels without
adding new agent classes or provider/model selection.
