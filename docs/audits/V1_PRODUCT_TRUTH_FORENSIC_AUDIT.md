# V1 Product Truth Forensic Audit

## Canonical V1

Product name: **AmarktAI**

Dashboard:

1. Command Center
2. Studio
3. Capabilities
4. Connected Apps
5. Artifacts
6. Jobs
7. Settings

Execution:

`User/app -> AmarktAI capability request -> capability router -> provider adapter -> job/artifact/result`

## File Group Decisions

| Group | Classification | Decision |
|---|---|---|
| Public website routes | REWRITE | Replaced provider marketing and network-product copy with AmarktAI capability-first copy |
| Public fake app routes | DELETE | Removed `/apps` and `/network-apps` |
| Dashboard shell | KEEP | Kept the single existing dashboard layout |
| Dashboard navigation | REWRITE | Reduced to exactly seven V1 sections |
| Command Center | REWRITE | Removed App Builder/Repo quick actions and raw provider/model controls |
| Studio | REWRITE | Preserved capability execution; removed provider/model picker UX |
| Capabilities | REWRITE | Renamed from Model Universe and removed provider badges |
| Connected Apps | KEEP | Uses the live connected-app registry and truthful empty state |
| Artifacts | REWRITE | Renamed from Outputs; retained canonical artifact APIs |
| Jobs | REWRITE | Renamed from Operations; retained real job records |
| Settings/readiness | KEEP | Provider details remain only in the diagnostic setup surface |
| App Builder pages/API | DELETE | Removed visible page and unused project endpoint |
| Repo Workbench page | DELETE | Removed visible repository/PR workflow |
| Repo Workbench backend | QUARANTINE / V2 ONLY | Not linked or visible; removal requires a separate backend dependency migration |
| MCP/tool marketplace UI | DELETE | No V1 route or navigation remains |
| Agents, memory, voice, system pages | DELETE | Removed duplicate or non-V1 top-level surfaces |
| Provider registry | KEEP | `provider-mesh.ts` remains canonical |
| Model registry | KEEP | `universal-model-catalog.ts` remains canonical; legacy registry is a projection |
| Capability taxonomy | KEEP | `ai-capability-taxonomy.ts` remains canonical |
| Route truth registry | DELETE | Removed unused phase-era duplicate route map |
| Studio tab map | DELETE | Removed unused provider/Workbench-first map |
| Product command router | DELETE | Removed unused V2 surface router |
| Auth/session | KEEP | Login and admin session remain unchanged |
| Adult policy | KEEP | Adult routes remain backend policy-gated and absent unless opted in |
| Deployment files | KEEP / NEEDS TEST | Existing deploy files retained; environment proof remains operational |
| Tests | REWRITE | Removed V2/stale contracts and added current V1 product truth |
| Docs | DELETE | Removed 84 superseded reports and plans |

## Deleted User-Facing Routes

- App Builder
- Repo Workbench
- Workspace
- Agents / Apps Agents
- Avatar / Voice duplicate page
- Memory / Learning duplicate pages
- Provider Mesh
- Model Universe
- Outputs
- Jobs / Approvals
- Operations
- System
- Network Apps aliases
- Voice Access redirect and settings endpoint

The capabilities behind voice, media, memory-assisted execution, providers, jobs, and artifacts were not removed from runtime. Only obsolete or duplicate product surfaces were removed.

## Backend Risks

- Repo Workbench API and library code remains quarantined because other backend modules still reference its contracts.
- Several historical general-purpose APIs remain outside the seven-page V1 UI and need a separate dependency-led removal audit.
- Provider credentials, external storage, and live provider availability remain deployment concerns.

## Frontend Risks

- Settings intentionally exposes provider diagnostics because credentials must be configured somewhere.
- Capability and job responses can still display routed infrastructure truth after execution; users cannot select raw providers or models.
- Visual browser regression coverage is source-contract based rather than screenshot based.

## Result

The active public site and dashboard now express one V1 AmarktAI product truth. Remaining non-V1 backend modules are not user-facing and are explicitly quarantined, so the repository is not yet physically free of all V2 backend code.
