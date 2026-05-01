# MCP / Tools / Webhooks Go-Live Audit

| Tool/system | Exists | Wired | Visible | Safe | Missing | Fix required |
| --- | --- | --- | --- | --- | --- | --- |
| MCP support | No complete app-level MCP server found | No | No | Unknown | Tool schema/server exposure | Build minimal MCP server over approved internal actions |
| tool registry | `/api/tools`, sdk/tool references | Partial | Not clearly dashboarded | Partial | permissions/audit | Central registry with per-agent scopes |
| tool permissions | scattered | Partial | Not clear | Partial | deny-by-default | Add DB policy: app, agent, action, confirmation |
| app-specific tools | concept only | Partial | Apps pages show tools/rules fields | Unknown | enforcement | Runtime must check app tool policy |
| agent-specific tools | concept only | Partial | Agent pages | Unknown | enforcement | Enforce allowedTools at dispatch |
| webhooks | `/api/webhooks`, integration event routes | Partial | Not clearly configured | Partial | signatures/replay docs | Add webhook secret validation/status UI |
| GitHub tools | GitHub admin + repo workbench routes | Yes | Repo Workbench/Build Studio | Partial | GitHubConfig/vault split | Canonicalize into Repo Workbench |
| VPS tools | `/api/admin/vps`, deploy routes | Partial | System Health/Repo Workbench | Guarded | live deploy proof | Add dry-run and live verification |
| crawler tools | Firecrawl/app crawl routes | Partial | Apps/Agents | Partial | fallback/local crawler | Add crawler status and app-scoped logs |
| social tools | Not evident | No | No | N/A | integration layer | Hide claims until built |
| media tools | brain media routes | Partial | Media Studio | Partial | async jobs/catalog | Wire media tools to job/artifact system |
| destructive confirmations | Repo Workbench has some | Partial | Some buttons | Partial | consistent global approval system | Reuse approvals route for all destructive actions |
| logs/audit trail | events/jobs/artifacts exist | Partial | Several pages | Partial | unified action log | Every tool action writes event + artifact/log |

Answer: MCP is **not actually implemented as a production MCP tool layer**. Minimum safe plan: expose read-only tools first (`list apps`, `list artifacts`, `check jobs`, `repo status`), then gated mutating tools with approval records (`run check`, `apply patch`, `push`, `deploy`).
