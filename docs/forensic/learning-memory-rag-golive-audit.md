# Self-Learning / Memory / RAG Go-Live Audit

| System | Status | Evidence | Blocker | Fix required |
| --- | --- | --- | --- | --- |
| memory module | Partial | `memory.ts`, admin memory routes | Live persistence/isolation not verified | Per-app/user memory tests |
| Mem0 integration | Partial | `mem0-client.ts`, tests expect unavailable without key | Optional key not in health dashboard | Add status to runtime truth |
| Qdrant/vector DB | Partial | federated memory tests mock qdrant | No live Qdrant config/status | Add vector DB health + migrations |
| document upload | Partial | file/artifact routes exist | RAG ingestion UX unclear | Add upload -> index -> search flow |
| website crawling | Partial | Firecrawl/app crawl routes | Firecrawl key required, no local fallback proof | Add Crawl4AI/local fallback or hide |
| Firecrawl | Partial | `firecrawl.ts`, app agent crawl | No live key check in dashboard health | Add test endpoint/status |
| Crawl4AI/local fallback | Missing/unknown | no clear module found | not implemented | Build or remove claim |
| RAG endpoints | Partial | `/api/rag`, `/api/admin/retrieval` | End-to-end not proven | Add RAG tests with fixture docs |
| repo crawl | Partial | Repo Workbench summarizes selected files | Not full semantic repo index | Add repo indexing job |
| app knowledge base | Partial | app profile knowledge fields | Not searchable/proven scoped | Build KB lifecycle |
| cross-app learning | Partial | `cross-app-learning.ts`, `daily-learning.ts` | Approval and isolation not proven | Add review/approval workflow |
| daily learning | Partial | module exists | Scheduler/cron not proven | Add scheduled job + logs |
| approved global learning | Partial | concept modules | No visible approval UI proven | Wire approvals page |
| per-app memory isolation | Partial | appSlug patterns | No E2E isolation tests | Add scoped memory tests |

Answers:

- What learns automatically now? **Modules exist, but automatic scheduled learning is not proven.**
- What only stores data? **Memory, app profile notes, artifacts/jobs mostly store and display data.**
- What is fake/placeholder? **Claims of self-learning are ahead of verified scheduler, approval, and scoped retrieval.**
- What must be built? **Real ingestion/index/search, daily job runner, approval workflow, per-app memory isolation tests, and health dashboard.**
