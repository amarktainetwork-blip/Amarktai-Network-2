# Phase 1 Route Truth Map

This map is mirrored in `src/lib/platform-route-registry.ts` so tests and dashboard copy can refer to one route classification.

| Family | Status | Auth policy | Notes |
| --- | --- | --- | --- |
| dashboard-pages | KEEP | admin session | Only Studio, Workbench, Apps & Agents, Memory & Learning, Operations, Settings remain as dashboard sections. |
| settings-truth | KEEP | admin session | Provider/tool key truth and test/status routes. |
| model-routing | FIX | admin session | `ai-routing`, `routing`, and `routing-profiles` remain duplicate route families. Consolidate in Phase 2 after Studio wiring. |
| studio-assistant | FIX | admin session | Studio chat/context exists; media tab UI wiring is pending. |
| brain-connected-app | KEEP | connected app token | Public path is acceptable only for app-token authenticated gateway calls. |
| repo-workbench | KEEP | admin session | Guarded prompt-to-PR workflow. Durable job UI rehydration remains Phase 2. |
| apps-agents | KEEP | admin session | Backend registry/package routes exist; create/edit/assignment UI remains Phase 2. |
| operations-storage | KEEP | admin session | Runtime truth, storage, jobs, artifacts, costs, Webdock/system health. |
| tools | PROTECTED | admin session | `/api/tools` is protected for now; connected-app scoped tool calls are later work. |

Duplicate route families to resolve later:

- `ai-routing/routing/routing-profiles`
- `providers/provider-status/model-catalog/genx-status`
- `assistant/brain/conversation-stream`
- `memory/manage/assistant-memory`
- `storage/local-json-store/storage-driver`
