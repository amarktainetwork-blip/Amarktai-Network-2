# Apps & Agents Go-Live Audit

| Item | UI | API | DB model | Status | Fix required |
| --- | --- | --- | --- | --- | --- |
| app creation | `/apps/new` | `/api/admin/app-discovery`, `/api/admin/app-profiles` | App/profile models in Prisma | Partial | Live Firecrawl/key and app persistence E2E |
| app edit | `/apps/[slug]` | `/api/admin/apps`, `/api/admin/app-profiles` | App/profile | Partial | Validate all tabs save and reload |
| app deletion/archive | not clearly complete | unknown/limited | unknown | Missing/Partial | Add archive/delete lifecycle |
| app repo connection | scattered | GitHub/Repo Workbench separate | RepoWorkspace separate | Partial | Link app -> repo workspace |
| app domain connection | visible fields | app profile APIs | App profile | Partial | Domain health/DNS verification |
| app niche/category | visible fields | profile APIs | profile | Partial | Validate taxonomy |
| app safety profile | visible | `/api/admin/app-safety` | safety profile | Partial | Enforce at execution routes |
| app budget | visible in AI Engine/apps | `/api/admin/app-budgets`, budgets | budgets | Partial | Enforce all costly media/AI routes |
| app knowledge base | partial | RAG/learning/profile routes | memory/RAG models | Partial | Full upload/crawl/index/search UX |
| app memory | partial | memory/learning routes | Memory models | Partial | Per-app isolation tests |
| app tools | unclear | `/api/tools`, app agent routes | unknown | Partial/Missing | Tool registry and permission model |
| app agent creation | `/app-agents/new` | `/api/admin/app-agents` | agent profile | Partial | Live agent run E2E |
| app agent edit | `/app-agents/[slug]` | `/api/admin/app-agents/[slug]` | agent profile | Partial | Save/reload all fields |
| allowed models | visible/fields | app-agent/profile | profile JSON | Partial | Enforce in runtime router |
| allowed tools | visible/fields | unknown | unknown | Partial | Enforce tool permissions |
| repo permissions | not clearly app-scoped | Repo Workbench separate | RepoWorkspace | Missing | Add app/repo/agent permission map |
| app health | dashboard/app detail | `/api/admin/app-health` | app health data | Partial | Live external health probes |
| app usage | visible in places | `/api/admin/usage` | usage models | Partial | Cost/usage enforcement proof |

Answers:

- Can the system run 20-25 apps/PWAs from dashboard? **Not proven.** Registry exists, but deploy/health/budget/agent isolation are not production-proven.
- Can each app have its own agent? **Structurally partial.** App agent pages/routes exist, but runtime isolation and tool/model enforcement need E2E.
- Can agents share approved learning? **Concept exists in learning/cross-app modules, not go-live proven.**
- Can app-specific knowledge stay scoped? **Not proven; needs scoped RAG/memory tests.**
