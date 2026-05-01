# MCP / Tools / Webhooks Audit

**Date:** 2026-05-01  
**Branch:** finish-dashboard-adult-mcp-repo-voice-golive  
**Status:** Forensic audit — honest capability report

---

## Summary

Model Context Protocol (MCP) server connections, a unified tool registry, and the webhook infrastructure are **not yet implemented** in this platform. The tool capabilities that do exist are partial and not exposed through a standard tool-call interface. No fake tool calls are made anywhere in the codebase.

---

## Audit Table

| Tool / System | Exists | Wired | UI Visible | Safe | Missing | Next Step |
|---|---|---|---|---|---|---|
| **MCP Servers** | ❌ | ❌ | ❌ | N/A | Full MCP protocol layer | Implement MCP client in `/lib/mcp/` |
| **Tool Registry** | ❌ | ❌ | ❌ | N/A | Centralised tool schema + dispatch | Create `tool-registry.ts` |
| **Per-app allowed tools** | ❌ | ❌ | ❌ | N/A | Tool permission model | Extend App schema |
| **Per-agent allowed tools** | ❌ | ❌ | ❌ | N/A | Agent tool scope | Extend agent dispatch |
| **Destructive tool confirmation** | ❌ | ❌ | ❌ | N/A | Confirmation flow | Implement confirmation hooks |
| **Tool call logs** | ❌ | ❌ | ❌ | N/A | Audit log table | Add `tool_call_log` DB table |
| **Webhooks (inbound)** | ❌ | ❌ | ❌ | N/A | Webhook router + verification | Implement `/api/webhooks/[source]` |
| **Webhooks (outbound)** | ❌ | ❌ | ❌ | N/A | Event → webhook dispatch | Add outbound webhook queue |
| **GitHub Tools** | ⚠️ | ⚠️ | ✅ | ✅ | Not a standard tool call; wired in Repo Workbench only | Extract to shared tool |
| **Repo Tools (clone/tree/diff/patch)** | ⚠️ | ⚠️ | ✅ | ✅ | Exists in Repo Workbench API routes, not generic | Extract to tool interface |
| **Media Tools (image gen)** | ⚠️ | ⚠️ | ✅ | ✅ | `/api/brain/image` exists, not registered as tool | Register in tool registry |
| **Media Tools (video gen)** | ⚠️ | ⚠️ | ✅ | ✅ | `/api/brain/video-generate` exists, async | Register in tool registry |
| **Media Tools (TTS)** | ✅ | ✅ | ✅ | ✅ | Fully wired at `/api/brain/tts` | Document in tool registry |
| **Crawler Tools (Firecrawl)** | ⚠️ | ⚠️ | ❌ | ✅ | Key configurable in Settings, no tool interface | Wire Firecrawl to tool call |
| **Crawler Tools (Crawl4AI)** | ⚠️ | ⚠️ | ❌ | ✅ | Key configurable in Settings, no tool interface | Wire Crawl4AI to tool call |
| **Social Tools** | ❌ | ❌ | ❌ | N/A | Not planned | Define scope first |
| **VPS Tools (server health)** | ⚠️ | ⚠️ | ✅ | ✅ | `/api/admin/vps/metrics` exists, not a tool call | Register as read-only tool |
| **VPS Tools (restart)** | ❌ | ❌ | ❌ | ⚠️ | Not implemented | Requires Webdock API + confirmation |
| **App-specific Tools** | ❌ | ❌ | ❌ | N/A | No per-app tool scoping | Implement with tool registry |
| **Budget/cost tracking** | ⚠️ | ⚠️ | ❌ | ✅ | `budget-tracker.ts` exists, not wired to UI | Wire to model call logs |

**Legend:** ✅ = complete, ⚠️ = partial, ❌ = missing, N/A = not applicable

---

## Minimum Required Tool Architecture

The following must be built before MCP/tools can be considered production-ready:

1. **Tool Registry** (`/lib/tools/registry.ts`)  
   - Schema: `{ id, name, description, input_schema, output_schema, handler, requiresConfirmation, costEstimate }`
   - All tools registered here, discoverable via `/api/tools`

2. **Per-app Allowed Tools**  
   - App schema extended: `allowedTools: string[]`
   - Enforced at dispatch time

3. **Per-agent Allowed Tools**  
   - Agent config extended: `allowedTools: string[]`
   - Merged with app-level allow list

4. **Confirmation for Destructive Tools**  
   - Any tool with `requiresConfirmation: true` must show UI prompt before execution
   - Applied to: delete, deploy, push, merge, VPS restart

5. **Tool Call Logs**  
   - DB table: `tool_call_log (id, appSlug, agentId, toolId, inputJson, outputJson, durationMs, costUsd, createdAt)`
   - Visible in System Health → MCP/Tools tab

6. **Budget/Cost Tracking**  
   - Per-model-call cost tracked in `model_call_log`
   - Surfaced in Artifacts & Jobs and per-workspace

---

## System Health Placeholder

A `MCP / Tools` tab has been added to System Health that truthfully shows:
- MCP not wired yet
- Which tools are partial vs missing
- What's needed before this is production-ready

**No fake MCP functionality is exposed anywhere in the UI.**
