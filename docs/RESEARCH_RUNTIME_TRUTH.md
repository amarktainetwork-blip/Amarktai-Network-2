# Research Runtime Truth

Date: 2026-06-15

| Area | Classification | Implemented truth | Missing or blocked |
| --- | --- | --- | --- |
| Research answer | PARTIAL | `/api/brain/research` uses capability execution, records an execution, and requests an artifact. | It is primarily model synthesis; source acquisition and citation verification are not guaranteed. |
| Local URL research | REAL | `/api/admin/research/url` tries the local crawler, falls back to bounded HTTP extraction, and persists a research-source artifact. | JavaScript-heavy pages require Playwright/browser setup. |
| Research opportunity | REAL | Admin route persists a structured research opportunity as an artifact. | No automatic market-validation claim. |
| Research jobs | PARTIAL | Admin route combines artifact records and local research records. | Local fallback records are not a unified durable job system. |
| Research tool readiness | REAL | Reports Playwright, Scrapy, Trafilatura, local crawler, and Qdrant configuration truthfully. | Packages, browser binaries, Python environment, and Qdrant must exist at deployment. |
| Firecrawl | LEGACY | `firecrawl.ts` is called by orchestration for website crawl and fails honestly without a key. | It is a separate optional external crawler path and does not replace the local crawler truth. Async crawl polling is incomplete. |
| Browser/Playwright | PARTIAL | Playwright dependency and local crawler readiness checks exist. | No general autonomous browser research contract is exposed through the canonical capability router. |
| RAG ingestion | PARTIAL | Chunking, Qwen embeddings, Qdrant upsert, retrieval, namespace filtering, and health checks exist. | Hardcoded embedding model and fixed vector-size assumptions need migration; Qdrant/Redis are deployment dependencies. |
| Basic retrieval | REAL | `retrieval-engine.ts` performs Prisma memory keyword retrieval and reports embeddings/rerank disabled instead of faking them. | It is basic retrieval, not semantic RAG. |
| Embeddings API | PARTIAL | Qwen endpoint returns real vectors or a truthful unavailable response. | It bypasses Phase 1 discovery and is tied to `text-embedding-v3`. |
| Rerank API | PARTIAL | HF route sends query/documents to a configured model and returns failure honestly. | Model discovery and live production proof are incomplete. |
| OCR | NOT IMPLEMENTED | OCR appears in capability/provider declarations. | No canonical file/image upload OCR endpoint with artifact/result contract exists. |
| Document parsing | PARTIAL | URL extraction and text chunking exist. | No unified upload parser for PDF, DOCX, spreadsheet, and scanned documents. |
| Scraping | PARTIAL | Local crawler and bounded fetch extraction work for supported pages. | Crawl scheduling, robots/rate policy, durable crawl jobs, and broad parser proof are incomplete. |

## Recommended Completion Order

1. Route embeddings and rerank through Phase 1 provider/model discovery while
   retaining provider-native adapters.
2. Store embedding model and dimension with each vector collection.
3. Add one canonical document-ingest contract for URL and uploaded files.
4. Make crawl and large-document research durable control-plane jobs.
5. Add source provenance and citation validation to research artifacts.
6. Add OCR only as a file/image capability with truthful provider evidence.

These are recommendations for later PRs. PR #116 adds no research behavior.
