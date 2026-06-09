# Session 0 Source-of-Truth Audit

- Date: 2026-06-09T10:25:30+00:00
- Branch: launch/source-of-truth
- PR: https://github.com/amarktainetwork-blip/Amarktai-Network-2/pull/86
- Goal: audit before repairs; no feature implementation.

## 1. Git state
```text
## launch/source-of-truth
?? reports/launch/

747dca8 fix: wire provider mesh truth imports and capability keys
64a25fe wip: import Studio command center stash for review
bcb047f fix: simplify dashboard foundation and home flow
4867993 fix: make outputs media library live and artifact-aware
ebc3d61 fix: preserve vocal song options in studio music generation
e6a14b4 fix: serve media artifacts with browser-ready MIME types
ea0d4da fix: persist authenticated GenX media artifacts locally
876b146 fix: normalize studio media routing and prove music jobs
25eb342 fix: bridge assistant stream route to working chat execution
4ec9e37 feat: stabilize AI brain and provider universe truth
03da8ae Merge pull request #83 from amarktainetwork-blip/fix-live-media-execution-artifacts-jobs
823f1eb Fix live media job and artifact contracts
```

## 2. PR #86 metadata
```json
{"additions":21904,"baseRefName":"main","changedFiles":30,"deletions":1168,"headRefName":"launch/source-of-truth","isDraft":false,"mergeable":"MERGEABLE","number":86,"state":"OPEN","title":"Launch source of truth: AmarktAI Network completion branch","url":"https://github.com/amarktainetwork-blip/Amarktai-Network-2/pull/86"}
```

## 3. Branch ancestry and PR comparisons
```text
main..launch/source-of-truth:
747dca8 fix: wire provider mesh truth imports and capability keys
64a25fe wip: import Studio command center stash for review
bcb047f fix: simplify dashboard foundation and home flow
4867993 fix: make outputs media library live and artifact-aware
ebc3d61 fix: preserve vocal song options in studio music generation
e6a14b4 fix: serve media artifacts with browser-ready MIME types
ea0d4da fix: persist authenticated GenX media artifacts locally
876b146 fix: normalize studio media routing and prove music jobs
25eb342 fix: bridge assistant stream route to working chat execution
4ec9e37 feat: stabilize AI brain and provider universe truth

Changed files vs main:
A	reports/audits/amarktai-platform-capability-audit-20260608-090611.txt
A	reports/audits/dashboard-design-foundation-20260608-112439.txt
A	reports/audits/dashboard-section-map-20260608-111717.txt
A	reports/audits/focused-provider-agent-doc-truth-20260608-165711.txt
A	reports/audits/model-provider-orchestration-audit-20260608-164408.txt
A	reports/audits/playground-section-truth-20260608-093109.txt
A	reports/audits/playground-studio-section-audit-20260608-141254.txt
M	src/app/admin/dashboard/layout.tsx
M	src/app/admin/dashboard/outputs/page.tsx
M	src/app/admin/dashboard/page.tsx
M	src/app/admin/dashboard/studio/page.tsx
M	src/app/api/admin/ai-model-catalog/route.ts
M	src/app/api/admin/amarktai-assistant/chat/route.ts
M	src/app/api/admin/amarktai-assistant/stream/route.ts
A	src/app/api/admin/provider-mesh/truth/route.ts
A	src/app/api/admin/provider-universe-truth/route.ts
M	src/app/api/admin/studio/execute/route.ts
M	src/app/api/artifacts/file/[...key]/route.ts
A	src/lib/ai-brain-router.ts
M	src/lib/ai-model-catalog.ts
M	src/lib/artifact-store.ts
M	src/lib/brain.ts
M	src/lib/capability-router.ts
M	src/lib/dashboard-nav.ts
M	src/lib/live-ai-routing.ts
A	src/lib/provider-mesh/index.ts
A	src/lib/provider-mesh/registry.ts
A	src/lib/provider-mesh/types.ts
A	src/lib/provider-universe-truth.ts
M	src/lib/universal-model-catalog.ts

Diff stat vs main:
 ...i-platform-capability-audit-20260608-090611.txt | 6185 ++++++++++++++++++++
 ...dashboard-design-foundation-20260608-112439.txt | 2847 +++++++++
 .../dashboard-section-map-20260608-111717.txt      | 1328 +++++
 ...ed-provider-agent-doc-truth-20260608-165711.txt | 1637 ++++++
 ...rovider-orchestration-audit-20260608-164408.txt | 3199 ++++++++++
 .../playground-section-truth-20260608-093109.txt   |  923 +++
 ...ground-studio-section-audit-20260608-141254.txt | 2672 +++++++++
 src/app/admin/dashboard/layout.tsx                 |  212 +-
 src/app/admin/dashboard/outputs/page.tsx           |  121 +-
 src/app/admin/dashboard/page.tsx                   |  171 +-
 src/app/admin/dashboard/studio/page.tsx            | 1403 ++---
 src/app/api/admin/ai-model-catalog/route.ts        |    9 +-
 src/app/api/admin/amarktai-assistant/chat/route.ts |   62 +-
 .../api/admin/amarktai-assistant/stream/route.ts   |  175 +-
 src/app/api/admin/provider-mesh/truth/route.ts     |   37 +
 src/app/api/admin/provider-universe-truth/route.ts |   19 +
 src/app/api/admin/studio/execute/route.ts          |  127 +-
 src/app/api/artifacts/file/[...key]/route.ts       |    9 +
 src/lib/ai-brain-router.ts                         |  476 ++
 src/lib/ai-model-catalog.ts                        |  180 +-
 src/lib/artifact-store.ts                          |   24 +-
 src/lib/brain.ts                                   |   19 +-
 src/lib/capability-router.ts                       |  151 +-
 src/lib/dashboard-nav.ts                           |   80 +-
 src/lib/live-ai-routing.ts                         |  115 +-
 src/lib/provider-mesh/index.ts                     |    2 +
 src/lib/provider-mesh/registry.ts                  |  549 ++
 src/lib/provider-mesh/types.ts                     |  147 +
 src/lib/provider-universe-truth.ts                 |  190 +
 src/lib/universal-model-catalog.ts                 |    3 +-
 30 files changed, 21904 insertions(+), 1168 deletions(-)
```

## 4. Duplicate truth layers inventory
```text
src/app/api/admin/agents/route.ts
src/app/api/admin/ai-capabilities/route.ts
src/app/api/admin/ai-model-catalog/route.ts
src/app/api/admin/ai-partner/chat/route.ts
src/app/api/admin/ai-partner/context/route.ts
src/app/api/admin/ai-routing/route.ts
src/app/api/admin/ai-routing/smart/route.ts
src/app/api/admin/ai/apply/route.ts
src/app/api/admin/ai/diff/route.ts
src/app/api/admin/alerts/route.ts
src/app/api/admin/amarktai-assistant/chat/route.ts
src/app/api/admin/amarktai-assistant/context/route.ts
src/app/api/admin/amarktai-assistant/memory/route.ts
src/app/api/admin/amarktai-assistant/stream/route.ts
src/app/api/admin/amarktai-assistant/tts/route.ts
src/app/api/admin/app-agents/[slug]/crawl/route.ts
src/app/api/admin/app-agents/[slug]/learning/route.ts
src/app/api/admin/app-agents/[slug]/route.ts
src/app/api/admin/app-agents/route.ts
src/app/api/admin/app-ai-package/recommend/route.ts
src/app/api/admin/app-ai-package/route.ts
src/app/api/admin/app-budgets/route.ts
src/app/api/admin/app-builder/projects/route.ts
src/app/api/admin/app-discovery/route.ts
src/app/api/admin/app-health/route.ts
src/app/api/admin/app-profiles/route.ts
src/app/api/admin/app-safety/route.ts
src/app/api/admin/approvals/[id]/approve/route.ts
src/app/api/admin/approvals/[id]/reject/route.ts
src/app/api/admin/approvals/route.ts
src/app/api/admin/apps/intelligence/route.ts
src/app/api/admin/apps/route.ts
src/app/api/admin/artifacts/media/route.ts
src/app/api/admin/artifacts/route.ts
src/app/api/admin/benchmark/route.ts
src/app/api/admin/brain/events/route.ts
src/app/api/admin/brain/test/route.ts
src/app/api/admin/budgets/route.ts
src/app/api/admin/command/route.ts
src/app/api/admin/compare/route.ts
src/app/api/admin/contacts/route.ts
src/app/api/admin/conversation/stream/route.ts
src/app/api/admin/costs/route.ts
src/app/api/admin/dashboard/route.ts
src/app/api/admin/deploy/direct-vps/route.ts
src/app/api/admin/emotions/route.ts
src/app/api/admin/events/[traceId]/route.ts
src/app/api/admin/events/route.ts
src/app/api/admin/genx/status/route.ts
src/app/api/admin/geo/route.ts
src/app/api/admin/global-adult-mode/route.ts
src/app/api/admin/healing/route.ts
src/app/api/admin/integration-hub/route.ts
src/app/api/admin/integration-keys/route.ts
src/app/api/admin/integrations-status/route.ts
src/app/api/admin/integrations/[id]/route.ts
src/app/api/admin/integrations/route.ts
src/app/api/admin/jobs/route.ts
src/app/api/admin/labs/route.ts
src/app/api/admin/learning/route.ts
src/app/api/admin/login/route.ts
src/app/api/admin/logout/route.ts
src/app/api/admin/managers/route.ts
src/app/api/admin/media-studio/models/route.ts
src/app/api/admin/memory/manage/route.ts
src/app/api/admin/memory/route.ts
src/app/api/admin/models/route.ts
src/app/api/admin/monetization/route.ts
src/app/api/admin/multimodal/route.ts
src/app/api/admin/music-studio/jobs/[jobId]/route.ts
src/app/api/admin/music-studio/route.ts
src/app/api/admin/network-apps/route.ts
src/app/api/admin/onboarding/route.ts
src/app/api/admin/playground/[id]/route.ts
src/app/api/admin/playground/route.ts
src/app/api/admin/products/[id]/route.ts
src/app/api/admin/products/route.ts
src/app/api/admin/provider-capability-test/route.ts
src/app/api/admin/provider-contracts/route.ts
src/app/api/admin/provider-governance/route.ts
src/app/api/admin/provider-mesh/truth/route.ts
src/app/api/admin/provider-scores/route.ts
src/app/api/admin/provider-stream-test/route.ts
src/app/api/admin/provider-universe-truth/route.ts
src/app/api/admin/providers/[id]/health-check/route.ts
src/app/api/admin/providers/[id]/route.ts
src/app/api/admin/providers/catalog/route.ts
src/app/api/admin/providers/health-check-all/route.ts
src/app/api/admin/providers/route.ts
src/app/api/admin/quick-access/route.ts
src/app/api/admin/readiness/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/apply-patch/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/audit/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/branch/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/branches/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/checks/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/clear-logs/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/commit/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/deploy/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/deploy/status/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/diff/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/file/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/merge/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/patch/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/plan/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/pr-status/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/pr/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/pull/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/push/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/reset/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/run-check/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/run/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/status/route.ts
src/app/api/admin/repo-workbench/[workspaceId]/tree/route.ts
src/app/api/admin/repo-workbench/github/branches/route.ts
src/app/api/admin/repo-workbench/github/prs/route.ts
src/app/api/admin/repo-workbench/github/repos/route.ts
src/app/api/admin/repo-workbench/github/status/route.ts
src/app/api/admin/repo-workbench/import/route.ts
src/app/api/admin/repo-workbench/jobs/[jobId]/logs/route.ts
src/app/api/admin/repo-workbench/jobs/[jobId]/route.ts
src/app/api/admin/repo-workbench/jobs/latest/route.ts
src/app/api/admin/repo-workbench/models/route.ts
src/app/api/admin/repo-workbench/repos/route.ts
src/app/api/admin/repo-workbench/safe-test/route.ts
src/app/api/admin/repo-workbench/simple/route.ts
src/app/api/admin/repo-workbench/status/route.ts
src/app/api/admin/research/assist/route.ts
src/app/api/admin/research/jobs/route.ts
src/app/api/admin/research/opportunity/route.ts
src/app/api/admin/research/send-to-repo-workbench/route.ts
src/app/api/admin/research/status/route.ts
src/app/api/admin/research/url/route.ts
src/app/api/admin/retrieval/route.ts
src/app/api/admin/routing-profiles/route.ts
src/app/api/admin/routing/route.ts
src/app/api/admin/runtime-truth/route.ts
src/app/api/admin/sdk/download/route.ts
src/app/api/admin/sdk/route.ts
src/app/api/admin/settings/integrations/route.ts
src/app/api/admin/settings/key/route.ts
src/app/api/admin/settings/reset-approved-keys/route.ts
src/app/api/admin/settings/status/route.ts
src/app/api/admin/settings/test-adult/route.ts
src/app/api/admin/settings/test-genx/route.ts
src/app/api/admin/settings/test-github/route.ts
src/app/api/admin/settings/test-groq/route.ts
src/app/api/admin/settings/test-huggingface/route.ts
src/app/api/admin/settings/test-minimax/route.ts
src/app/api/admin/settings/test-openai/route.ts
src/app/api/admin/settings/test-provider/route.ts
src/app/api/admin/settings/test-qwen/route.ts
src/app/api/admin/settings/test-redis/route.ts
src/app/api/admin/settings/test-smtp/route.ts
src/app/api/admin/settings/test-storage/route.ts
src/app/api/admin/settings/test-together/route.ts
src/app/api/admin/settings/test-webdock/route.ts
src/app/api/admin/skill-templates/route.ts
src/app/api/admin/smart-home/route.ts
src/app/api/admin/specialist/huggingface/route.ts
src/app/api/admin/specialist/minimax-tts/route.ts
src/app/api/admin/specialist/qwen-wanx-image/route.ts
src/app/api/admin/specialist/qwen-wanx-task/route.ts
src/app/api/admin/strategy/route.ts
src/app/api/admin/studio/execute/route.ts
src/app/api/admin/studio/stt/route.ts
src/app/api/admin/studio/workbench-handoff/route.ts
src/app/api/admin/system/capabilities/route.ts
src/app/api/admin/system/jobs/route.ts
src/app/api/admin/system/live-readiness/route.ts
src/app/api/admin/system/logs/route.ts
src/app/api/admin/system/readiness/route.ts
src/app/api/admin/system/services/route.ts
src/app/api/admin/system/status/route.ts
src/app/api/admin/system/vps/route.ts
src/app/api/admin/teams/route.ts
src/app/api/admin/tool-registry/route.ts
src/app/api/admin/truth/route.ts
src/app/api/admin/usage/route.ts
src/app/api/admin/voice-access-settings/route.ts
src/app/api/admin/voice-login/route.ts
src/app/api/admin/voice-persona/route.ts
src/app/api/admin/voice/options/route.ts
src/app/api/admin/voice/preview/route.ts
src/app/api/admin/vps/route.ts
src/app/api/admin/waitlist/route.ts
src/app/api/admin/workspace/config/route.ts
src/app/api/admin/workspace/run/route.ts
src/app/api/apps/route.ts
src/app/api/artifacts/file/[...key]/route.ts
src/app/api/batch/route.ts
src/app/api/brain/adult-image/route.ts
src/app/api/brain/adult-text/route.ts
src/app/api/brain/agent-request/route.ts
src/app/api/brain/agent/dispatch/route.ts
src/app/api/brain/avatar-video/route.ts
src/app/api/brain/embeddings/route.ts
src/app/api/brain/execute/route.ts
src/app/api/brain/image-edit/route.ts
src/app/api/brain/image/route.ts
src/app/api/brain/media-jobs/[jobId]/route.ts
src/app/api/brain/moderation/route.ts
src/app/api/brain/relay/route.ts
src/app/api/brain/request/route.ts
src/app/api/brain/rerank/route.ts
src/app/api/brain/research/route.ts
src/app/api/brain/stream/route.ts
src/app/api/brain/stt/route.ts
src/app/api/brain/suggestive-image/route.ts
src/app/api/brain/suggestive-video-gen/route.ts
src/app/api/brain/suggestive-video/route.ts
src/app/api/brain/tts/route.ts
src/app/api/brain/video-generate/[jobId]/route.ts
src/app/api/brain/video-generate/route.ts
src/app/api/brain/video/route.ts
src/app/api/contact/route.ts
src/app/api/emotions/route.ts
src/app/api/fine-tune/route.ts
src/app/api/guardrails/route.ts
src/app/api/health/ping/route.ts
src/app/api/health/route.ts
src/app/api/integrations/events/route.ts
src/app/api/integrations/heartbeat/route.ts
src/app/api/integrations/metrics/route.ts
src/app/api/integrations/vps-resources/route.ts
src/app/api/prompts/route.ts
src/app/api/rag/route.ts
src/app/api/realtime/health/route.ts
src/app/api/realtime/session/route.ts
src/app/api/system/events/route.ts
src/app/api/system/health-deep/route.ts
src/app/api/tools/route.ts
src/app/api/voice/stt/route.ts
src/app/api/voice/tts/route.ts
src/app/api/waitlist/route.ts
src/app/api/webhooks/route.ts
src/app/api/workflows/route.ts
src/lib/__tests__/adult-capability.test.ts
src/lib/__tests__/adult-media-routing.test.ts
src/lib/__tests__/adult-model-catalog.test.ts
src/lib/__tests__/adult-text-route.test.ts
src/lib/__tests__/api-routes-and-labs.test.ts
src/lib/__tests__/backend-truth.test.ts
src/lib/__tests__/command-router.test.ts
src/lib/__tests__/model-registry.test.ts
src/lib/__tests__/multimodal-router.test.ts
src/lib/__tests__/phase1-backend-source-of-truth.test.ts
src/lib/__tests__/phase1-platform-truth-stabilization.test.ts
src/lib/__tests__/provider-capability-governance.test.ts
src/lib/__tests__/provider-governance.test.ts
src/lib/__tests__/research-capability.test.ts
src/lib/__tests__/routing-engine.test.ts
src/lib/__tests__/runtime-capability-truth.test.ts
src/lib/__tests__/settings-provider-source-of-truth.test.ts
src/lib/__tests__/standalone-provider-truth.test.ts
src/lib/__tests__/suggestive-capability.test.ts
src/lib/__tests__/video-capability.test.ts
src/lib/adult-model-catalog.ts
src/lib/ai-brain-router.ts
src/lib/ai-capability-taxonomy.ts
src/lib/ai-model-catalog.ts
src/lib/ai-provider-governance.ts
src/lib/ai-routing-policy.ts
src/lib/approved-ai-catalog.ts
src/lib/brain.ts
src/lib/capability-engine.ts
src/lib/capability-gaps.ts
src/lib/capability-packs.ts
src/lib/capability-router.ts
src/lib/command-router.ts
src/lib/dashboard-truth.ts
src/lib/genx-model-resolver.ts
src/lib/live-ai-routing.ts
src/lib/media-capability-registry.ts
src/lib/model-registry.ts
src/lib/multimodal-router.ts
src/lib/platform-route-registry.ts
src/lib/platform-settings-truth.ts
src/lib/provider-capability-governance.ts
src/lib/provider-catalog.ts
src/lib/provider-config.ts
src/lib/provider-intelligence.ts
src/lib/provider-mesh-status.ts
src/lib/provider-mesh.ts
src/lib/provider-mesh/index.ts
src/lib/provider-mesh/registry.ts
src/lib/provider-mesh/types.ts
src/lib/provider-reliability.ts
src/lib/provider-result-log.ts
src/lib/provider-universe-truth.ts
src/lib/providers.ts
src/lib/routing-engine.ts
src/lib/routing-profiles.ts
src/lib/runtime-capability-truth.ts
src/lib/runtime-truth.ts
src/lib/smart-router.ts
src/lib/specialist-provider-routes.ts
src/lib/studio-route-map.ts
src/lib/sync-provider-health.ts
src/lib/universal-model-catalog.ts
src/lib/universal-provider-call.ts
```

## 5. Provider mesh files
```text
src/lib/__tests__/provider-capability-governance.test.ts
src/lib/__tests__/provider-governance.test.ts
src/lib/__tests__/runtime-capability-truth.test.ts
src/lib/ai-provider-governance.ts
src/lib/provider-capability-governance.ts
src/lib/provider-config.ts
src/lib/provider-mesh-status.ts
src/lib/provider-mesh.ts
src/lib/provider-mesh/index.ts
src/lib/provider-mesh/registry.ts
src/lib/provider-mesh/types.ts
src/lib/provider-universe-truth.ts
src/lib/runtime-capability-truth.ts
```

## 6. Model/catalog files
```text
src/app/api/admin/ai-model-catalog/route.ts
src/app/api/admin/media-studio/models/route.ts
src/app/api/admin/models/route.ts
src/app/api/admin/providers/catalog/route.ts
src/app/api/admin/repo-workbench/models/route.ts
src/lib/__tests__/adult-model-catalog.test.ts
src/lib/__tests__/model-registry.test.ts
src/lib/adult-model-catalog.ts
src/lib/ai-model-catalog.ts
src/lib/approved-ai-catalog.ts
src/lib/genx-model-resolver.ts
src/lib/model-registry.ts
src/lib/provider-catalog.ts
src/lib/universal-model-catalog.ts
src/lib/universal-provider-call.ts
```

## 7. Imports using provider-mesh/provider universe/model catalog
```text
src/app/admin/dashboard/studio/page.tsx:20:import { APPROVED_AI_PROVIDERS, providerLabel } from '@/lib/approved-ai-catalog'
src/app/admin/dashboard/studio/page.tsx:21:import type { UniversalModelCatalog } from '@/lib/universal-model-catalog'
src/app/admin/dashboard/operations/page.tsx:5:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/admin/dashboard/operations/page.tsx:6:import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
src/app/admin/dashboard/workbench/page.tsx:5:import { type CostMode, providerLabel } from '@/lib/approved-ai-catalog'
src/app/admin/dashboard/workbench/page.tsx:6:import type { UniversalModelCatalog } from '@/lib/universal-model-catalog'
src/app/admin/dashboard/system/page.tsx:2:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/media-studio/models/route.ts:11:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/ai-routing/route.ts:4:import { LIVE_ROUTING_CAPABILITIES, routeLiveModel } from '@/lib/live-ai-routing'
src/app/api/admin/ai-routing/route.ts:6:import { getAdultCapabilityGate, getRuntimeProviderStatus } from '@/lib/runtime-capability-truth'
src/app/api/admin/ai-routing/smart/route.ts:6:import { routeLiveModel } from '@/lib/live-ai-routing'
src/app/api/admin/ai-routing/smart/route.ts:8:import { getRuntimeProviderStatus } from '@/lib/runtime-capability-truth'
src/app/api/admin/global-adult-mode/route.ts:4:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/workspace/run/route.ts:4:import { executeCapability } from '@/lib/capability-router'
src/app/api/admin/settings/test-provider/route.ts:3:import { getProviderMeshNode, sanitizeProviderError, type ProviderMeshId } from '@/lib/provider-mesh'
src/app/api/admin/settings/test-provider/route.ts:4:import { getMeshCredential, recordMeshTestResult } from '@/lib/provider-mesh-status'
src/app/api/admin/settings/key/route.ts:6:import { PROVIDER_MESH } from '@/lib/provider-mesh'
src/app/api/admin/studio/execute/route.ts:6:import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'
src/app/api/admin/studio/execute/route.ts:7:import { type AdultPolicyValue } from '@/lib/universal-model-catalog'
src/app/api/admin/amarktai-assistant/chat/route.ts:2:import { APPROVED_ASSISTANT_MODELS, isApprovedAIProvider } from '@/lib/approved-ai-catalog'
src/app/api/admin/amarktai-assistant/chat/route.ts:3:import { executeCapability } from '@/lib/capability-router'
src/app/api/admin/amarktai-assistant/chat/route.ts:6:import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'
src/app/api/admin/amarktai-assistant/context/route.ts:4:import { APPROVED_AI_PROVIDERS, APPROVED_ASSISTANT_MODELS } from '@/lib/approved-ai-catalog'
src/app/api/admin/amarktai-assistant/context/route.ts:10:import { getAllProviderModelCatalogs } from '@/lib/ai-model-catalog'
src/app/api/admin/amarktai-assistant/tts/route.ts:3:import { routeLiveModel } from '@/lib/live-ai-routing'
src/app/api/admin/runtime-truth/route.ts:14:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/app-ai-package/route.ts:5:import { isApprovedAIProvider } from '@/lib/approved-ai-catalog'
src/app/api/admin/apps/intelligence/route.ts:4:import { executeCapability } from '@/lib/capability-router'
src/app/api/admin/ai-model-catalog/route.ts:3:import { getAllProviderModelCatalogs, getProviderModelCatalog } from '@/lib/ai-model-catalog'
src/app/api/admin/ai-model-catalog/route.ts:4:import { getUniversalModelCatalog } from '@/lib/universal-model-catalog'
src/app/api/admin/voice/options/route.ts:3:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/voice/preview/route.ts:4:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/research/assist/route.ts:4:import { routeLiveModel } from '@/lib/live-ai-routing'
src/app/api/admin/provider-governance/route.ts:4:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/provider-mesh/truth/route.ts:3:import { buildProviderMeshTruth, createRoutePlanPreview } from '@/lib/provider-mesh/registry'
src/app/api/admin/provider-mesh/truth/route.ts:4:import type { AppCostProfile, CapabilityKey } from '@/lib/provider-mesh/types'
src/app/api/admin/provider-universe-truth/route.ts:2:import { getProviderUniverseTruth } from '@/lib/provider-universe-truth'
src/app/api/admin/system/readiness/route.ts:3:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/admin/system/capabilities/route.ts:3:import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
src/app/api/admin/system/capabilities/route.ts:4:import { getAllProviderModelCatalogs } from '@/lib/ai-model-catalog'
src/app/api/admin/system/live-readiness/route.ts:4:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/app/api/brain/execute/route.ts:34:import { executeCapability, type CapabilityResponse } from '@/lib/capability-router'
src/lib/platform-settings-truth.ts:2:import { PROVIDER_MESH, type ProviderMeshId } from '@/lib/provider-mesh'
src/lib/platform-settings-truth.ts:3:import { getMeshCredential, getMeshTestNotes } from '@/lib/provider-mesh-status'
src/lib/repo-workbench.ts:17:} from '@/lib/approved-ai-catalog'
src/lib/universal-model-catalog.ts:5:} from '@/lib/approved-ai-catalog'
src/lib/universal-model-catalog.ts:16:import { getAllProviderModelCatalogs, type ProviderModelOption } from '@/lib/ai-model-catalog'
src/lib/media-capability-registry.ts:8:import type { ProviderMeshId } from '@/lib/provider-mesh'
src/lib/approved-ai-catalog.ts:1:import { AI_PROVIDER_MESH, type ProviderMeshId } from '@/lib/provider-mesh'
src/lib/__tests__/adult-media-routing.test.ts:3:import { routeLiveModel } from '@/lib/live-ai-routing'
src/lib/__tests__/phase1-backend-source-of-truth.test.ts:7:import { getProviderMeshNode, PROVIDER_MESH } from '@/lib/provider-mesh'
src/lib/__tests__/live-media-execution-contract.test.ts:50:import { routeLiveModel } from '@/lib/live-ai-routing'
src/lib/__tests__/phase1-platform-truth-stabilization.test.ts:5:import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
src/lib/__tests__/phase1-platform-truth-stabilization.test.ts:6:import { ADULT_POLICY_VALUES, normalizeAdultPolicy } from '@/lib/universal-model-catalog'
src/lib/__tests__/dashboard-go-live-wiring.test.ts:5:import { PROVIDER_MESH } from '@/lib/provider-mesh'
src/lib/__tests__/provider-capability-governance.test.ts:15:import { routeLiveModel } from '@/lib/live-ai-routing'
src/lib/ai-routing-policy.ts:2:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/lib/ai-model-catalog.ts:8:} from '@/lib/approved-ai-catalog'
src/lib/app-ai-package.ts:2:import { getAllProviderModelCatalogs, type ProviderModelCatalog } from '@/lib/ai-model-catalog'
src/lib/app-ai-package.ts:3:import { isApprovedAIProvider, type CostMode } from '@/lib/approved-ai-catalog'
src/lib/app-ai-package.ts:4:import { routeLiveModel, type AiCapability, type ModelStrategy } from '@/lib/live-ai-routing'
src/lib/app-ai-package.ts:5:import { normalizeAdultPolicy, type AdultPolicyValue } from '@/lib/universal-model-catalog'
src/lib/brain.ts:18:import { getProviderMeshNode, type ProviderMeshId } from '@/lib/provider-mesh'
src/lib/brain.ts:19:import { getMeshCredential } from '@/lib/provider-mesh-status'
src/lib/tool-registry.ts:1:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/lib/ai-brain-router.ts:4:} from '@/lib/universal-model-catalog'
src/lib/ai-brain-router.ts:11:import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
src/lib/provider-config.ts:1:import { getMeshCredential } from '@/lib/provider-mesh-status'
src/lib/provider-config.ts:2:import { getProviderMeshNode, type ProviderMeshId } from '@/lib/provider-mesh'
src/lib/ai-provider-governance.ts:1:import { PROVIDER_MESH } from '@/lib/provider-mesh'
src/lib/provider-catalog.ts:1:import { APPROVED_AI_PROVIDERS, type ApprovedProviderKey } from '@/lib/approved-ai-catalog'
src/lib/provider-capability-governance.ts:1:import { STATIC_PROVIDER_MODELS } from '@/lib/ai-model-catalog'
src/lib/provider-capability-governance.ts:2:import { PROVIDER_MESH, type ProviderMeshId } from '@/lib/provider-mesh'
src/lib/product-contract.ts:1:import { PROVIDER_MESH } from '@/lib/provider-mesh'
src/lib/provider-mesh-status.ts:3:import { getProviderMeshNode, sanitizeProviderError, type ProviderMeshId } from '@/lib/provider-mesh'
src/lib/agent-registry.ts:1:import { routeLiveModel, type AiCapability, type ModelStrategy } from '@/lib/live-ai-routing'
src/lib/agent-registry.ts:2:import type { CostMode } from '@/lib/approved-ai-catalog'
src/lib/cost-tracking.ts:3:import { isApprovedAIProvider, type CostMode } from '@/lib/approved-ai-catalog'
src/lib/command-router.ts:3:import { providersForCapability, type ProviderCapability } from '@/lib/provider-mesh'
src/lib/runtime-capability-truth.ts:6:import type { ProviderCapability } from '@/lib/provider-mesh'
src/lib/provider-universe-truth.ts:1:import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
src/lib/provider-universe-truth.ts:2:import { getAllProviderModelCatalogs } from '@/lib/ai-model-catalog'
src/lib/provider-universe-truth.ts:3:import { getUniversalModelCatalog } from '@/lib/universal-model-catalog'
src/lib/live-ai-routing.ts:7:} from '@/lib/approved-ai-catalog'
src/lib/live-ai-routing.ts:8:import { STATIC_PROVIDER_MODELS, type ProviderModelOption } from '@/lib/ai-model-catalog'
src/lib/live-ai-routing.ts:16:import { adultPolicyAllows, normalizeAdultPolicy, type AdultPolicyValue } from '@/lib/universal-model-catalog'
```

## 8. Current test result summary
```text

> amarktai-network@1.0.0 test
> vitest run


[1m[46m RUN [49m[22m [36mv4.1.1 [39m[90m/tmp/amarktai-pr85-worktree-20260609-085509[39m

 [31m❯[39m src/lib/__tests__/backend-truth.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[33m 526[2mms[22m[39m
     [32m✓[39m GenX status separates configured from available[32m 246[2mms[22m[39m
     [32m✓[39m GenX configured does not mean available when catalog probe fails[32m 15[2mms[22m[39m
[31m     [31m×[31m /api/brain/video-generate returns a truthful blocker when no renderer exists[39m[32m 262[2mms[22m[39m
[90mstdout[2m | src/lib/__tests__/routing-engine.test.ts[2m > [22m[2mRouting Engine[2m > [22m[2mimage modality routing[2m > [22m[2mroutes image tasks to image-capable models only — never a chat model
[22m[39m[routing-engine] Eligible models for image: [
  [32m'stabilityai/stable-diffusion-xl-base-1.0'[39m,
  [32m'black-forest-labs/FLUX.1-schnell'[39m,
  [32m'stabilityai/stable-diffusion-3.5-large'[39m,
  [32m'stabilityai/stable-diffusion-xl-base-1.0'[39m,
  [32m'black-forest-labs/FLUX.1-dev'[39m,
  [32m'black-forest-labs/FLUX.1-schnell'[39m,
  [32m'black-forest-labs/FLUX.1-schnell-Free'[39m,
  [32m'SG161222/RealVisXL_V5.0'[39m,
  [32m'RunDiffusion/Juggernaut-XL-v9'[39m,
  [32m'Lykon/dreamshaper-xl-1-0'[39m,
  [32m'dreamlike-art/dreamlike-photoreal-2.0'[39m
]

 [31m❯[39m src/lib/__tests__/routing-engine.test.ts [2m([22m[2m20 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[33m 318[2mms[22m[39m
       [32m✓[39m returns a valid routing decision[32m 146[2mms[22m[39m
       [32m✓[39m routes simple tasks to direct mode[32m 1[2mms[22m[39m
       [32m✓[39m routes complex tasks appropriately[32m 1[2mms[22m[39m
       [32m✓[39m selects premium escalation for complex financial tasks[32m 1[2mms[22m[39m
       [32m✓[39m routes multimodal requests to multimodal_chain[32m 69[2mms[22m[39m
       [32m✓[39m routes retrieval requests to retrieval_chain[32m 0[2mms[22m[39m
       [32m✓[39m selects a primary model[32m 1[2mms[22m[39m
       [32m✓[39m provides cost and latency estimates[32m 1[2mms[22m[39m
       [32m✓[39m provides fallback models for simple requests[32m 1[2mms[22m[39m
       [32m✓[39m handles moderate complexity with specialist or direct mode[32m 1[2mms[22m[39m
       [32m✓[39m routes image tasks to image-capable models only — never a chat model[32m 82[2mms[22m[39m
       [32m✓[39m returns no eligible models when all providers are unconfigured for image[32m 0[2mms[22m[39m
       [32m✓[39m respects maxCostTier constraint[32m 0[2mms[22m[39m
       [32m✓[39m routes crypto app differently than marketing app[32m 0[2mms[22m[39m
       [32m✓[39m routes normally when provider health cache is empty[32m 0[2mms[22m[39m
[31m       [31m×[31m skips models from unconfigured providers when health cache is populated[39m[32m 4[2mms[22m[39m
[31m       [31m×[31m skips models from error providers[39m[32m 1[2mms[22m[39m
       [32m✓[39m returns no models when all providers are unhealthy[32m 0[2mms[22m[39m
[31m       [31m×[31m demotes degraded providers in fallback list[39m[32m 1[2mms[22m[39m
       [32m✓[39m escalation skips unhealthy provider[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/runtime-capability-truth.test.ts [2m([22m[2m23 tests[22m[2m | [22m[31m15 failed[39m[2m)[22m[33m 731[2mms[22m[39m
     [33m[2m✓[22m[39m does NOT add GenX blocker when Qwen is configured [33m 406[2mms[22m[39m
     [32m✓[39m does NOT add GenX blocker when Groq is configured[32m 20[2mms[22m[39m
[31m     [31m×[31m Text/Chat is available when Qwen is configured (no GenX)[39m[32m 31[2mms[22m[39m
[31m     [31m×[31m Text/Chat is available when MiniMax is configured (no GenX)[39m[32m 12[2mms[22m[39m
[31m     [31m×[31m Text/Chat is available when DeepSeek is configured (no GenX)[39m[32m 11[2mms[22m[39m
[31m     [31m×[31m GenX IS a blocker when no providers are configured at all[39m[32m 12[2mms[22m[39m
[31m     [31m×[31m Image available when Qwen is configured[39m[32m 31[2mms[22m[39m
[31m     [31m×[31m Image available when MiniMax is configured[39m[32m 9[2mms[22m[39m
[31m     [31m×[31m Video available when Qwen is configured[39m[32m 9[2mms[22m[39m
[31m     [31m×[31m Video available when MiniMax is configured[39m[32m 16[2mms[22m[39m
[31m     [31m×[31m TTS available when MiniMax is configured[39m[32m 12[2mms[22m[39m
[31m     [31m×[31m STT available when Deepgram is configured[39m[32m 9[2mms[22m[39m
[31m     [31m×[31m STT available when MiniMax is configured[39m[32m 10[2mms[22m[39m
[31m     [31m×[31m music is blocked until GenX Lyria is configured even when MiniMax is configured[39m[32m 14[2mms[22m[39m
[31m     [31m×[31m music is available for live testing with GenX configured[39m[32m 11[2mms[22m[39m
     [32m✓[39m adult gate uses connected Together AI without a separate adult live-test flag[32m 19[2mms[22m[39m
     [32m✓[39m adult gate uses connected HuggingFace provider key[32m 22[2mms[22m[39m
     [32m✓[39m adult gate is not_wired when no adult-capable provider is configured[32m 8[2mms[22m[39m
     [32m✓[39m remains ready when the provider passed but the legacy adult test failed[32m 18[2mms[22m[39m
     [32m✓[39m cohere/mistral (deprecated) not in runtime provider governance[32m 9[2mms[22m[39m
     [32m✓[39m backlog providers (suno/udio) are not in runtime provider status[32m 11[2mms[22m[39m
[31m     [31m×[31m research available when Firecrawl is configured[39m[32m 10[2mms[22m[39m
[31m     [31m×[31m research available when Gemini is configured[39m[32m 13[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/model-registry.test.ts [2m([22m[2m37 tests[22m[2m | [22m[31m7 failed[39m[2m)[22m[32m 91[2mms[22m[39m
       [32m✓[39m returns a non-empty array of model entries[32m 2[2mms[22m[39m
       [32m✓[39m every model entry has required fields[32m 29[2mms[22m[39m
[31m       [31m×[31m includes models from expected providers[39m[32m 14[2mms[22m[39m
[31m       [31m×[31m filters models by provider key[39m[32m 2[2mms[22m[39m
       [32m✓[39m returns empty array for unknown provider[32m 1[2mms[22m[39m
       [32m✓[39m finds models with chat capability[32m 0[2mms[22m[39m
       [32m✓[39m finds models with reasoning capability[32m 0[2mms[22m[39m
       [32m✓[39m finds models with reasoning role[32m 1[2mms[22m[39m
       [32m✓[39m finds models with chat role[32m 1[2mms[22m[39m
[31m       [31m×[31m finds a specific model by provider and model_id[39m[32m 1[2mms[22m[39m
       [32m✓[39m returns undefined for non-existent model[32m 0[2mms[22m[39m
       [32m✓[39m returns only enabled models[32m 0[2mms[22m[39m
       [32m✓[39m returns only validator-eligible models[32m 0[2mms[22m[39m
       [32m✓[39m validator models support reasoning[32m 0[2mms[22m[39m
[31m       [31m×[31m finds specialist models for finance domain[39m[32m 1[2mms[22m[39m
       [32m✓[39m returns empty for very niche domain[32m 0[2mms[22m[39m
       [32m✓[39m returns cheapest chat model[32m 0[2mms[22m[39m
       [32m✓[39m returns premium reasoning model[32m 1[2mms[22m[39m
       [32m✓[39m returns default model for each known provider[32m 1[2mms[22m[39m
       [32m✓[39m throws for unknown provider[32m 1[2mms[22m[39m
       [32m✓[39m has at least one TTS-capable model[32m 0[2mms[22m[39m
       [32m✓[39m TTS models use tts role[32m 2[2mms[22m[39m
       [32m✓[39m getModelsByRole returns tts models[32m 0[2mms[22m[39m
       [32m✓[39m getProviderHealth returns unconfigured when cache is empty[32m 1[2mms[22m[39m
       [32m✓[39m setProviderHealth stores and retrieves health status[32m 0[2mms[22m[39m
       [32m✓[39m clearProviderHealthCache resets all entries[32m 0[2mms[22m[39m
       [32m✓[39m getProviderHealthSnapshot returns all cached entries[32m 0[2mms[22m[39m
       [32m✓[39m isProviderUsable returns false when cache is empty (strict — prevents false availability)[32m 0[2mms[22m[39m
       [32m✓[39m isProviderUsable returns true for healthy or configured providers[32m 0[2mms[22m[39m
       [32m✓[39m isProviderUsable returns false for unconfigured, error, or disabled providers[32m 0[2mms[22m[39m
       [32m✓[39m isProviderUsable returns false for degraded providers (not usable, just not excluded)[32m 0[2mms[22m[39m
       [32m✓[39m isProviderDegraded correctly identifies degraded providers[32m 0[2mms[22m[39m
[31m       [31m×[31m getModelEffectiveHealth returns unconfigured when cache is empty[39m[32m 19[2mms[22m[39m
[31m       [31m×[31m getModelEffectiveHealth returns provider health when cache is populated[39m[32m 1[2mms[22m[39m
       [32m✓[39m getUsableModels returns zero models when cache is empty (strict mode)[32m 1[2mms[22m[39m
       [32m✓[39m getUsableModels excludes models from unhealthy providers[32m 0[2mms[22m[39m
[31m       [31m×[31m getUsableModels includes models from both healthy and configured providers[39m[32m 2[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/phase1-platform-truth-stabilization.test.ts [2m([22m[2m10 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[32m 120[2mms[22m[39m
[31m     [31m×[31m keeps the dashboard to the seven command operating-system sections[39m[32m 35[2mms[22m[39m
     [32m✓[39m Settings uses approved visible AI providers and the status truth route[32m 2[2mms[22m[39m
     [32m✓[39m provider connected count only counts configured entries with test/status routes[32m 20[2mms[22m[39m
     [32m✓[39m unifies storage roots across local JSON, storage driver, and Workbench workspace[32m 26[2mms[22m[39m
     [32m✓[39m documents route truth, duplicate route families, and auth policy[32m 2[2mms[22m[39m
     [32m✓[39m protects /api/tools behind the admin session while brain routes remain app-token routes[32m 1[2mms[22m[39m
     [32m✓[39m keeps Workbench guards and token-safe Git auth in place[32m 1[2mms[22m[39m
     [32m✓[39m makes Command routing truthful instead of claiming complete execution[32m 1[2mms[22m[39m
[31m     [31m×[31m keeps adult policy app-level with no separate adult key requirement[39m[32m 25[2mms[22m[39m
     [32m✓[39m fixes Firecrawl as a research tool endpoint, not an AI provider endpoint[32m 4[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/integration-verification.test.ts [2m([22m[2m22 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 225[2mms[22m[39m
       [32m✓[39m model registry provides defaults for all providers used in brain.ts[32m 5[2mms[22m[39m
       [32m✓[39m model registry does NOT hardcode health_status as healthy[32m 1[2mms[22m[39m
[31m       [31m×[31m model registry covers all providers in preference order lists[39m[32m 10[2mms[22m[39m
       [32m✓[39m routing engine returns valid decisions for all complexity levels[32m 118[2mms[22m[39m
       [32m✓[39m orchestrator decideExecution delegates to routing engine[32m 80[2mms[22m[39m
       [32m✓[39m routing engine handles retrieval_chain mode[32m 1[2mms[22m[39m
       [32m✓[39m routing engine handles multimodal_chain mode[32m 0[2mms[22m[39m
       [32m✓[39m routing engine applies app profile escalation rules[32m 2[2mms[22m[39m
       [32m✓[39m orchestrator classification aligns with routing engine expectations[32m 1[2mms[22m[39m
       [32m✓[39m all 18 agents have definitions[32m 1[2mms[22m[39m
       [32m✓[39m network app has full agent permissions[32m 1[2mms[22m[39m
       [32m✓[39m crypto app has restricted agent permissions[32m 0[2mms[22m[39m
       [32m✓[39m freshness scoring works correctly[32m 0[2mms[22m[39m
       [32m✓[39m keyword relevance scoring works[32m 0[2mms[22m[39m
       [32m✓[39m supports expected content types[32m 1[2mms[22m[39m
       [32m✓[39m VERIFIED: orchestrator imports and uses routing-engine[32m 1[2mms[22m[39m
       [32m✓[39m VERIFIED: agent runtime is importable from orchestrator[32m 0[2mms[22m[39m
       [32m✓[39m VERIFIED: multimodal router is connected to orchestrator[32m 0[2mms[22m[39m
       [32m✓[39m VERIFIED: retrieval engine replaces memory.ts in brain route[32m 0[2mms[22m[39m
       [32m✓[39m getUsableModels returns zero when health cache is empty (strict mode)[32m 0[2mms[22m[39m
       [32m✓[39m getUsableModels returns all enabled models when all providers are healthy[32m 0[2mms[22m[39m
       [32m✓[39m routing engine uses getUsableModels for health-aware selection[32m 0[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/phase2-real-studio-workbench.test.ts [2m([22m[2m9 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[32m 71[2mms[22m[39m
[31m     [31m×[31m keeps the dashboard to the seven final sections only[39m[32m 18[2mms[22m[39m
     [32m✓[39m Settings connected count requires a passed live test, not only a saved key[32m 28[2mms[22m[39m
[31m     [31m×[31m maps every Studio tab to the protected route that owns its real execution state[39m[32m 3[2mms[22m[39m
     [32m✓[39m Command routes into real Studio surfaces and persists command jobs[32m 1[2mms[22m[39m
     [32m✓[39m Adult Studio routes text, image, video, and voice through real capability routes[32m 1[2mms[22m[39m
[31m     [31m×[31m non-GenX streaming still returns an honest pending status instead of fake output[39m[32m 14[2mms[22m[39m
     [32m✓[39m Workbench loads branches on first repo selection and rehydrates the latest persisted job[32m 1[2mms[22m[39m
     [32m✓[39m Workbench lifecycle remains the simple guarded repo flow[32m 1[2mms[22m[39m
     [32m✓[39m GitHub tokens are not exposed in Workbench UI/log output code paths[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/provider-capability-governance.test.ts [2m([22m[2m7 tests[22m[2m | [22m[31m7 failed[39m[2m)[22m[32m 53[2mms[22m[39m
[31m     [31m×[31m defines the root admin workspace and keeps Add App external-only[39m[32m 14[2mms[22m[39m
[31m     [31m×[31m pins the GenX 58 model catalog and fixes Seedance 2 naming drift[39m[32m 3[2mms[22m[39m
[31m     [31m×[31m classifies Lyria as music and routes Studio music through music_generation, not voice_tts[39m[32m 2[2mms[22m[39m
[31m     [31m×[31m filters Workbench to coding/reasoning models and rejects media mismatches[39m[32m 2[2mms[22m[39m
[31m     [31m×[31m rejects invalid manual model/capability combinations in live routing[39m[32m 3[2mms[22m[39m
[31m     [31m×[31m keeps voice truth, underused provider truth, and adult governance explicit[39m[32m 2[2mms[22m[39m
[31m     [31m×[31m surfaces governance truth in Settings, Operations, and model catalog routes[39m[32m 24[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts [2m([22m[2m10 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[32m 56[2mms[22m[39m
     [32m✓[39m normalizes URL and base64 provider responses[32m 4[2mms[22m[39m
     [32m✓[39m reports job output without pretending media is complete[32m 1[2mms[22m[39m
     [32m✓[39m redacts secret-bearing artifact metadata[32m 2[2mms[22m[39m
[31m     [31m×[31m contains the six required primary sections[39m[32m 31[2mms[22m[39m
[31m     [31m×[31m keeps adult text, image, video, and voice visible[39m[32m 5[2mms[22m[39m
     [32m✓[39m renders real output players and metadata[32m 1[2mms[22m[39m
[31m     [31m×[31m does not integrate external product apps[39m[32m 6[2mms[22m[39m
     [32m✓[39m does not count blueprint-only music as a completed song[32m 1[2mms[22m[39m
     [32m✓[39m gives video jobs a terminal timeout[32m 1[2mms[22m[39m
     [32m✓[39m returns an honest avatar unavailable blocker[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/phase1-backend-source-of-truth.test.ts [2m([22m[2m11 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 172[2mms[22m[39m
     [32m✓[39m contains only the approved provider and tool mesh[32m 5[2mms[22m[39m
     [32m✓[39m guards Settings tests with provider mesh IDs[32m 1[2mms[22m[39m
     [32m✓[39m uses the GenX default URL when no URL override exists[32m 147[2mms[22m[39m
     [32m✓[39m returns the truthful Network Apps empty state[32m 1[2mms[22m[39m
[31m     [31m×[31m uses Workspace navigation and keeps Command as compatibility only[39m[32m 7[2mms[22m[39m
     [32m✓[39m routes "create an image of a lighthouse" through Workspace as create_image[32m 3[2mms[22m[39m
     [32m✓[39m routes "create a song about the ocean" through Workspace as create_song[32m 2[2mms[22m[39m
     [32m✓[39m routes "create a voice narration" through Workspace as create_voice[32m 1[2mms[22m[39m
     [32m✓[39m routes "audit this repo" through Workspace as audit_repo[32m 1[2mms[22m[39m
     [32m✓[39m routes "create a pull request" through Workspace as create_pr[32m 0[2mms[22m[39m
     [32m✓[39m routes "check system status" through Workspace as check_system[32m 0[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/adult-agent-audit.test.ts [2m([22m[2m27 tests[22m[2m | [22m[31m3 failed[39m[2m)[22m[32m 69[2mms[22m[39m
       [32m✓[39m audits all 16 registered agents[32m 11[2mms[22m[39m
       [32m✓[39m returns correct summary counts[32m 2[2mms[22m[39m
       [32m✓[39m every agent has required audit fields[32m 11[2mms[22m[39m
       [32m✓[39m agents with callable + registered providers are at least PARTIAL[32m 1[2mms[22m[39m
       [32m✓[39m agents with uncallable providers are NOT_CONNECTED[32m 1[2mms[22m[39m
       [32m✓[39m READY agents have zero diagnostic reasons[32m 0[2mms[22m[39m
       [32m✓[39m non-READY agents have at least one diagnostic reason[32m 1[2mms[22m[39m
       [32m✓[39m includes auditedAt timestamp in summary[32m 0[2mms[22m[39m
       [32m✓[39m returns audit entry for known agent type[32m 1[2mms[22m[39m
       [32m✓[39m returns null for unknown agent type[32m 0[2mms[22m[39m
       [32m✓[39m planner agent uses openai (callable) provider[32m 0[2mms[22m[39m
[31m       [31m×[31m retrieval agent uses openai (callable) provider[39m[32m 8[2mms[22m[39m
[31m       [31m×[31m creative agent uses gemini (callable) provider[39m[32m 2[2mms[22m[39m
       [32m✓[39m security agent is openai-based (callable)[32m 0[2mms[22m[39m
       [32m✓[39m travel_planner agent uses gemini (callable)[32m 0[2mms[22m[39m
[31m       [31m×[31m classifies openai-based agents correctly[39m[32m 4[2mms[22m[39m
       [32m✓[39m agents with handoff targets reference valid agents[32m 1[2mms[22m[39m
       [32m✓[39m defaults to safe mode ON, adult mode OFF[32m 6[2mms[22m[39m
       [32m✓[39m can disable safe mode[32m 1[2mms[22m[39m
       [32m✓[39m can enable adult mode when safe mode is off[32m 1[2mms[22m[39m
       [32m✓[39m adult mode is automatically disabled when safe mode is on[32m 5[2mms[22m[39m
       [32m✓[39m per-app configs are isolated[32m 2[2mms[22m[39m
       [32m✓[39m adult_18plus_image backend route NOW EXISTS (/api/brain/adult-image)[32m 1[2mms[22m[39m
       [32m✓[39m blocks adult capability without adultMode flag (adult mode guard fires)[32m 2[2mms[22m[39m
       [32m✓[39m blocks adult capability without adultMode flag[32m 1[2mms[22m[39m
       [32m✓[39m blocks adult capability without explicit adultMode (undefined)[32m 1[2mms[22m[39m
       [32m✓[39m non-adult capabilities are not affected by adultMode flag[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/provider-governance.test.ts [2m([22m[2m49 tests[22m[2m | [22m[31m26 failed[39m[2m)[22m[32m 44[2mms[22m[39m
     [32m✓[39m returns providers with setupGroup === primary[32m 2[2mms[22m[39m
[31m     [31m×[31m includes all required primary providers[39m[32m 9[2mms[22m[39m
     [32m✓[39m does NOT include xai/grok in primary (it is advanced)[32m 0[2mms[22m[39m
     [32m✓[39m does NOT include openrouter in primary (it is advanced)[32m 0[2mms[22m[39m
     [32m✓[39m does NOT include moonshot in primary (it is advanced)[32m 0[2mms[22m[39m
     [32m✓[39m does NOT include zhipu in primary (it is advanced)[32m 0[2mms[22m[39m
     [32m✓[39m returns providers with setupGroup === specialist[32m 0[2mms[22m[39m
[31m     [31m×[31m includes replicate, elevenlabs, and deepgram[39m[32m 1[2mms[22m[39m
     [32m✓[39m returns providers with setupGroup === advanced[32m 1[2mms[22m[39m
[31m     [31m×[31m keeps OpenAI hidden and includes advanced routing providers[39m[32m 1[2mms[22m[39m
     [32m✓[39m returns providers with setupGroup === hidden[32m 0[2mms[22m[39m
[31m     [31m×[31m includes cohere and mistral as hidden[39m[32m 1[2mms[22m[39m
     [32m✓[39m returns providers with setupGroup === backlog from both sources[32m 0[2mms[22m[39m
[31m     [31m×[31m includes suno and udio from main governance backlog[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m includes perplexity, tavily, jina from PROPOSED_PROVIDER_BACKLOG[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m includes runpod, fal, fireworks, cerebras from PROPOSED_PROVIDER_BACKLOG[39m[32m 1[2mms[22m[39m
     [32m✓[39m none of the hidden/backlog providers appear in primary setup[32m 0[2mms[22m[39m
     [32m✓[39m none of the hidden/backlog providers appear in specialist setup[32m 0[2mms[22m[39m
     [32m✓[39m hidden providers have showInPrimarySetup=false[32m 0[2mms[22m[39m
     [32m✓[39m advanced providers have showInPrimarySetup=false[32m 0[2mms[22m[39m
     [32m✓[39m getIntegrationKey("qwen") returns "qwen"[32m 0[2mms[22m[39m
     [32m✓[39m getIntegrationKey("dashscope") resolves to "qwen"[32m 0[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("qwen") checks QWEN_API_KEY[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("dashscope") resolves via DASHSCOPE_API_KEY alias[39m[32m 1[2mms[22m[39m
     [32m✓[39m getIntegrationKey("minimax") returns "minimax"[32m 0[2mms[22m[39m
     [32m✓[39m getIntegrationKey("mimo") remains independent[32m 0[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("minimax") checks MINIMAX_API_KEY[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("mimo") uses MIMO_API_KEY[39m[32m 1[2mms[22m[39m
     [32m✓[39m getIntegrationKey("xai") returns "xai"[32m 0[2mms[22m[39m
[31m     [31m×[31m getIntegrationKey("grok") resolves to "xai"[39m[32m 2[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("xai") checks XAI_API_KEY[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("grok") resolves via GROK_API_KEY alias[39m[32m 1[2mms[22m[39m
     [32m✓[39m getIntegrationKey("huggingface") returns "huggingface"[32m 0[2mms[22m[39m
     [32m✓[39m getIntegrationKey("hf") resolves to "huggingface"[32m 0[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("huggingface") checks HUGGINGFACE_API_KEY[39m[32m 0[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("huggingface") also checks HUGGINGFACEHUB_API_TOKEN[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("huggingface") also checks HF_TOKEN[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("hf") resolves via HF_TOKEN alias[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("replicate") checks REPLICATE_API_TOKEN first[39m[32m 0[2mms[22m[39m
[31m     [31m×[31m getEnvKeyForProvider("replicate") falls back to REPLICATE_API_KEY[39m[32m 0[2mms[22m[39m
[31m     [31m×[31m includes together, huggingface, replicate, xai[39m[32m 1[2mms[22m[39m
     [32m✓[39m does not include backlog providers[32m 0[2mms[22m[39m
     [32m✓[39m does not include proposed providers[32m 0[2mms[22m[39m
[31m     [31m×[31m includes active primary and specialist providers[39m[32m 1[2mms[22m[39m
     [32m✓[39m all entries have a setupGroup[32m 1[2mms[22m[39m
[31m     [31m×[31m all entries have envVarAliases defined for aliased providers[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m Qwen notes mentions DASHSCOPE_API_KEY alias[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m MiniMax notes keeps Xiaomi MiMo separate[39m[32m 5[2mms[22m[39m
[31m     [31m×[31m HuggingFace notes mentions HUGGINGFACEHUB_API_TOKEN alias[39m[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/live-media-execution-contract.test.ts [2m([22m[2m6 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 59[2mms[22m[39m
     [32m✓[39m returns a local job ID and poll URL for provider async work[32m 4[2mms[22m[39m
     [32m✓[39m persists completed provider media as a canonical artifact[32m 3[2mms[22m[39m
     [32m✓[39m fails stale jobs instead of leaving them processing forever[32m 1[2mms[22m[39m
     [32m✓[39m recognizes avatar video without advertising a fake provider[32m 1[2mms[22m[39m
     [32m✓[39m does not advertise Groq as a canonical TTS provider[32m 2[2mms[22m[39m
[31m     [31m×[31m uses canonical video capability and exposes local polling in Studio[39m[32m 42[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/settings-provider-source-of-truth.test.ts [2m([22m[2m22 tests[22m[2m | [22m[31m14 failed[39m[2m)[22m[32m 47[2mms[22m[39m
     [32m✓[39m Qwen is labeled "Qwen / DashScope"[32m 3[2mms[22m[39m
[31m     [31m×[31m MiniMax and Xiaomi MiMo are separate providers[39m[32m 10[2mms[22m[39m
[31m     [31m×[31m xAI is labeled "xAI / Grok"[39m[32m 2[2mms[22m[39m
[31m     [31m×[31m Moonshot is labeled "Moonshot / Kimi"[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m OpenAI compatibility fallback remains hidden[39m[32m 1[2mms[22m[39m
     [32m✓[39m none of the do-not-show providers appear in primary setup[32m 1[2mms[22m[39m
     [32m✓[39m none of the do-not-show providers appear in specialist setup[32m 1[2mms[22m[39m
     [32m✓[39m none of the do-not-show providers appear in advanced setup[32m 1[2mms[22m[39m
[31m     [31m×[31m cohere is in hidden providers[39m[32m 6[2mms[22m[39m
[31m     [31m×[31m mistral is in hidden providers[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m suno, udio are in backlog providers[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m has the 13 current primary providers including MiMo and local crawler[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m has exactly 3 specialist providers (replicate, elevenlabs, deepgram)[39m[32m 2[2mms[22m[39m
[31m     [31m×[31m has exactly 4 visible advanced providers[39m[32m 1[2mms[22m[39m
     [32m✓[39m Qwen lists DASHSCOPE_API_KEY as accepted env alias[32m 1[2mms[22m[39m
[31m     [31m×[31m Xiaomi MiMo owns MIMO_API_KEY[39m[32m 2[2mms[22m[39m
     [32m✓[39m HuggingFace lists HUGGINGFACEHUB_API_TOKEN and HF_TOKEN as accepted env aliases[32m 1[2mms[22m[39m
[31m     [31m×[31m xAI lists GROK_API_KEY as accepted env alias[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m Replicate lists REPLICATE_API_TOKEN as accepted env alias[39m[32m 1[2mms[22m[39m
     [32m✓[39m GenX is in primary group (it is configurable in Settings)[32m 0[2mms[22m[39m
[31m     [31m×[31m GenX notes describes it as gateway infrastructure only[39m[32m 4[2mms[22m[39m
     [32m✓[39m GenX is not in advanced, specialist, hidden, or backlog groups[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/video-capability.test.ts [2m([22m[2m33 tests[22m[2m | [22m[31m10 failed[39m[2m)[22m[32m 60[2mms[22m[39m
     [32m✓[39m video_planning has a backend route[32m 3[2mms[22m[39m
     [32m✓[39m video_planning is labeled as planning, not generation[32m 1[2mms[22m[39m
     [32m✓[39m video_planning resolution returns planning capability[32m 2[2mms[22m[39m
[31m     [31m×[31m video_planning models exist with supports_video_planning flag[39m[32m 16[2mms[22m[39m
[31m     [31m×[31m video_planning models span multiple providers[39m[32m 4[2mms[22m[39m
     [32m✓[39m video_planning suggested providers include gemini, openai, deepseek[32m 2[2mms[22m[39m
[31m     [31m×[31m Gemini models with video planning have specialist domain flag[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m OpenAI models with video planning include GPT-4o[39m[32m 3[2mms[22m[39m
     [32m✓[39m video_generation has a backend route (async job pipeline)[32m 2[2mms[22m[39m
     [32m✓[39m video_generation is labeled as generation, not planning[32m 0[2mms[22m[39m
     [32m✓[39m video_generation is unavailable without a configured video provider[32m 1[2mms[22m[39m
     [32m✓[39m video_generation shows routeExists=true but unavailable without provider[32m 4[2mms[22m[39m
     [32m✓[39m video_planning and video_generation are separate capabilities[32m 1[2mms[22m[39m
     [32m✓[39m classifies "generate a video" as video_generation[32m 4[2mms[22m[39m
     [32m✓[39m classifies "create a video" as video_generation[32m 3[2mms[22m[39m
     [32m✓[39m classifies "plan a video" as video_planning[32m 0[2mms[22m[39m
     [32m✓[39m classifies "storyboard" as video_planning[32m 0[2mms[22m[39m
     [32m✓[39m classifies "video script" as video_planning[32m 0[2mms[22m[39m
     [32m✓[39m classifies "reel" as video_planning[32m 1[2mms[22m[39m
     [32m✓[39m classifies "animation" as video_planning[32m 0[2mms[22m[39m
     [32m✓[39m video_planning and video_generation both have backend routes (both implemented)[32m 0[2mms[22m[39m
     [32m✓[39m video_planning and video_generation have different labels[32m 0[2mms[22m[39m
     [32m✓[39m video_generation requires supports_video_generation flag (not supports_video_planning)[32m 1[2mms[22m[39m
     [32m✓[39m video_planning requires only supports_video_planning (no chat fallback)[32m 0[2mms[22m[39m
     [32m✓[39m detailed status shows both planning and generation have routes[32m 3[2mms[22m[39m
     [32m✓[39m HF fallback catalog includes video_generation (HF has zeroscope and text-to-video models)[32m 0[2mms[22m[39m
     [32m✓[39m HF fallback catalog does NOT include video_planning[32m 0[2mms[22m[39m
[31m     [31m×[31m GPT-4o has supports_video_planning[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m Gemini 1.5 Pro has supports_video_planning[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m Gemini 2.0 Flash has supports_video_planning[39m[32m 0[2mms[22m[39m
[31m     [31m×[31m Gemini 2.5 Pro Preview has supports_video_planning[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m o4-mini has supports_video_planning[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m total models with supports_video_planning >= 6[39m[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/platform-expansion.test.ts [2m([22m[2m38 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 41[2mms[22m[39m
     [32m✓[39m returns all 4 profiles[32m 4[2mms[22m[39m
     [32m✓[39m defaults to balanced when id is missing[32m 1[2mms[22m[39m
     [32m✓[39m low_cost profile has correct cost ceiling[32m 0[2mms[22m[39m
     [32m✓[39m ultra_resilient profile distributes load and auto-fallthroughs[32m 0[2mms[22m[39m
     [32m✓[39m premium profile allows premium cost tier[32m 0[2mms[22m[39m
     [32m✓[39m buildFallbackChain returns primary → fallback → emergency order[32m 1[2mms[22m[39m
     [32m✓[39m profileToRoutingOverrides returns maxCostTier and maxLatencyTier[32m 1[2mms[22m[39m
     [32m✓[39m shouldRetry returns false when attempt >= maxRetries[32m 0[2mms[22m[39m
     [32m✓[39m shouldRetry returns true with positive delay for attempt < maxRetries[32m 1[2mms[22m[39m
     [32m✓[39m shouldRetry applies exponential backoff correctly[32m 0[2mms[22m[39m
     [32m✓[39m buildLyricsPrompt contains genre and theme[32m 1[2mms[22m[39m
     [32m✓[39m parseLyricsOutput creates a valid LyricsResult[32m 2[2mms[22m[39m
     [32m✓[39m parseLyricsOutput auto-generates title from theme when not in output[32m 0[2mms[22m[39m
     [32m✓[39m AVAILABLE_GENRES includes all required genres[32m 1[2mms[22m[39m
     [32m✓[39m AVAILABLE_VOCAL_STYLES includes instrumental_only[32m 0[2mms[22m[39m
     [32m✓[39m getMusicStudioStatus returns a valid status object[32m 0[2mms[22m[39m
     [32m✓[39m getMusicStudioSummary returns valid summary before any artifacts[32m 0[2mms[22m[39m
     [32m✓[39m getMusicArtifact returns undefined for unknown id[32m 0[2mms[22m[39m
     [32m✓[39m getAllTiers returns all 4 tiers[32m 1[2mms[22m[39m
     [32m✓[39m each tier has correct pricing structure[32m 0[2mms[22m[39m
     [32m✓[39m estimateCost uses token pricing for GPT models[32m 0[2mms[22m[39m
     [32m✓[39m estimateCost uses flat pricing for image/music[32m 0[2mms[22m[39m
     [32m✓[39m trackUsage creates a valid event with auto-calculated cost[32m 0[2mms[22m[39m
     [32m✓[39m recordRevenue creates a valid revenue event[32m 0[2mms[22m[39m
     [32m✓[39m upsertSubscription creates subscription with correct tier limits[32m 0[2mms[22m[39m
     [32m✓[39m getSubscription retrieves the correct subscription[32m 0[2mms[22m[39m
     [32m✓[39m isWithinGenerationLimit returns true for fresh app[32m 0[2mms[22m[39m
     [32m✓[39m getAppRevenueSummary returns correct structure[32m 1[2mms[22m[39m
     [32m✓[39m getPlatformMonetizationSummary returns valid summary[32m 12[2mms[22m[39m
     [32m✓[39m recordPipelineRun and getPipelineHistory work correctly[32m 1[2mms[22m[39m
[31m     [31m×[31m includes suno-v3.5, musicgen-melody, udio-v1[39m[32m 7[2mms[22m[39m
     [32m✓[39m music models have supports_music_generation flag[32m 0[2mms[22m[39m
     [32m✓[39m default profile does not error when routing_profile is undefined[32m 0[2mms[22m[39m
     [32m✓[39m includes music_generation capability[32m 0[2mms[22m[39m
     [32m✓[39m includes lyrics_generation capability[32m 0[2mms[22m[39m
     [32m✓[39m includes music_cover_art capability[32m 0[2mms[22m[39m
     [32m✓[39m includes monetization capability[32m 0[2mms[22m[39m
     [32m✓[39m includes usage_analytics capability[32m 0[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/voice-expansion.test.ts [2m([22m[2m35 tests[22m[2m | [22m[31m6 failed[39m[2m)[22m[32m 52[2mms[22m[39m
     [32m✓[39m has >= 7 total STT models across all providers[32m 3[2mms[22m[39m
     [32m✓[39m has 3 Groq STT models (whisper-large-v3, distil-whisper, whisper-large-v3-turbo)[32m 2[2mms[22m[39m
     [32m✓[39m whisper-large-v3-turbo has correct properties[32m 1[2mms[22m[39m
     [32m✓[39m has 2 HuggingFace STT models (whisper-large-v3, whisper-small)[32m 1[2mms[22m[39m
     [32m✓[39m whisper-small HF model is lightweight fallback[32m 1[2mms[22m[39m
[31m     [31m×[31m STT models span 6 providers[39m[32m 18[2mms[22m[39m
[31m     [31m×[31m has >= 7 total TTS models across all providers[39m[32m 2[2mms[22m[39m
     [32m✓[39m has 2 Groq TTS models (playai-tts, playai-tts-arabic)[32m 1[2mms[22m[39m
     [32m✓[39m playai-tts-arabic has correct properties[32m 1[2mms[22m[39m
     [32m✓[39m has 2 HuggingFace TTS models (mms-tts-eng, mms-tts-fra)[32m 1[2mms[22m[39m
     [32m✓[39m mms-tts-fra HF model is French language fallback[32m 1[2mms[22m[39m
[31m     [31m×[31m TTS models span 5 providers[39m[32m 1[2mms[22m[39m
[31m     [31m×[31m STT fallback chain covers 4 providers: Groq → OpenAI → Gemini → HuggingFace[39m[32m 2[2mms[22m[39m
[31m     [31m×[31m TTS fallback chain covers 4 providers: Groq → OpenAI → Gemini → HuggingFace[39m[32m 1[2mms[22m[39m
     [32m✓[39m Groq STT models have lowest fallback_priority (preferred)[32m 0[2mms[22m[39m
     [32m✓[39m HuggingFace voice models have highest fallback_priority (last resort)[32m 0[2mms[22m[39m
     [32m✓[39m realtime_voice has a backend route (session endpoint + WS service implemented)[32m 0[2mms[22m[39m
     [32m✓[39m realtime_voice is blocked when REALTIME_SERVICE_URL not set[32m 1[2mms[22m[39m
     [32m✓[39m realtime_voice classification patterns match via taskType[32m 4[2mms[22m[39m
     [32m✓[39m voice_input and voice_output ARE available (not blocked)[32m 0[2mms[22m[39m
     [32m✓[39m all Groq voice models are backbone tier with low cost[32m 1[2mms[22m[39m
     [32m✓[39m all OpenAI voice models are premium tier[32m 0[2mms[22m[39m
     [32m✓[39m all Gemini voice models are premium tier with low cost[32m 0[2mms[22m[39m
     [32m✓[39m all HuggingFace voice models are free or very low cost[32m 1[2mms[22m[39m
     [32m✓[39m voice_input has >= 3 HF fallback models in catalog[32m 0[2mms[22m[39m
     [32m✓[39m voice_output has >= 2 HF fallback models in catalog[32m 0[2mms[22m[39m
     [32m✓[39m HF voice_input fallback includes whisper-base, whisper-small, and whisper-large-v3[32m 0[2mms[22m[39m
     [32m✓[39m HF voice_output fallback includes mms-tts-eng and mms-tts-fra[32m 0[2mms[22m[39m
     [32m✓[39m HF fallback resolution returns capability for voice_input[32m 0[2mms[22m[39m
     [32m✓[39m HF fallback resolution returns capability for voice_output[32m 0[2mms[22m[39m
     [32m✓[39m voice_input suggests 5 providers[32m 1[2mms[22m[39m
     [32m✓[39m voice_output suggests 4 providers[32m 0[2mms[22m[39m
     [32m✓[39m realtime_voice suggests openai only[32m 0[2mms[22m[39m
[31m     [31m×[31m total voice models (STT + TTS) is >= 14[39m[32m 1[2mms[22m[39m
     [32m✓[39m no duplicate voice model IDs within same provider[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/dashboard-go-live-wiring.test.ts [2m([22m[2m6 tests[22m[2m | [22m[31m2 failed[39m[2m)[22m[32m 38[2mms[22m[39m
[31m     [31m×[31m keeps exactly the five truthful dashboard routes[39m[32m 16[2mms[22m[39m
     [32m✓[39m uses one provider mesh with all required connections[32m 2[2mms[22m[39m
     [32m✓[39m Settings saves, tests, refreshes, and never paints configured keys green[32m 1[2mms[22m[39m
     [32m✓[39m Workspace selects connected providers and starts real media routes[32m 1[2mms[22m[39m
[31m     [31m×[31m keeps technical details in Settings and System[39m[32m 15[2mms[22m[39m
     [32m✓[39m retains protected repository and system routes behind attached workspaces[32m 1[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/final-dashboard-ux.test.ts [2m([22m[2m3 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 57[2mms[22m[39m
     [32m✓[39m has the required command quick actions[32m 5[2mms[22m[39m
     [32m✓[39m uses normal page flow without internal dashboard scroll panels[32m 1[2mms[22m[39m
[31m     [31m×[31m renders the standalone core sections in primary navigation[39m[32m 48[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/public-website-rebuild.test.ts [2m([22m[2m6 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 18[2mms[22m[39m
     [32m✓[39m uses the exact public navigation source of truth[32m 4[2mms[22m[39m
     [32m✓[39m contains the required alternating homepage story[32m 1[2mms[22m[39m
     [32m✓[39m explains the complete platform without backend report language[32m 0[2mms[22m[39m
[31m     [31m×[31m shows the eleven required connected apps with honest statuses[39m[32m 9[2mms[22m[39m
     [32m✓[39m removes banned public wording[32m 1[2mms[22m[39m
     [32m✓[39m keeps the final audit document[32m 0[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/app-profiles.test.ts [2m([22m[2m13 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 25[2mms[22m[39m
       [32m✓[39m has profiles for expected apps[32m 3[2mms[22m[39m
       [32m✓[39m every profile has required fields[32m 3[2mms[22m[39m
       [32m✓[39m returns specific profile for known app[32m 1[2mms[22m[39m
       [32m✓[39m returns default profile for unknown app[32m 0[2mms[22m[39m
[31m       [31m×[31m allows configured providers for crypto app[39m[32m 9[2mms[22m[39m
       [32m✓[39m handles allowed_providers from app profile[32m 0[2mms[22m[39m
       [32m✓[39m allows configured models[32m 0[2mms[22m[39m
       [32m✓[39m returns preferred models for app[32m 4[2mms[22m[39m
       [32m✓[39m returns matching rule for complex financial tasks on crypto app[32m 1[2mms[22m[39m
       [32m✓[39m returns null for simple chat on default app[32m 0[2mms[22m[39m
       [32m✓[39m returns matching rule or null for crypto app tasks[32m 0[2mms[22m[39m
       [32m✓[39m returns correct namespace for known app[32m 0[2mms[22m[39m
       [32m✓[39m returns correct namespace for known app[32m 0[2mms[22m[39m
 [31m❯[39m src/lib/__tests__/adult-media-routing.test.ts [2m([22m[2m7 tests[22m[2m | [22m[31m1 failed[39m[2m)[22m[32m 17[2mms[22m[39m
     [32m✓[39m routes adult_text to a real text provider route[32m 3[2mms[22m[39m
     [32m✓[39m routes adult_image to image generation[32m 0[2mms[22m[39m
     [32m✓[39m routes adult_video only to real video executors[32m 1[2mms[22m[39m
[31m     [31m×[31m routes adult_voice through audio/TTS executors[39m[32m 9[2mms[22m[39m
     [32m✓[39m blocks adult capabilities when policy is disabled[32m 1[2mms[22m[39m
     [32m✓[39m returns a clear provider error for providers outside the mesh[32m 0[2mms[22m[39m
     [32m✓[39m declares every required capability as first class[32m 0[2mms[22m[39m
[90mstderr[2m | src/lib/__tests__/backend-wiring-core-network.test.ts[2m > [22m[2mMemory save/read works locally (Phase D)[2m > [22m[2msaveMemory returns false gracefully when DB is unavailable
[22m[39m[memory] saveMemory failed: connection refused

[90mstdout[2m | src/lib/__tests__/adult-text-route.test.ts[2m > [22m[2m/api/brain/adult-text[2m > [22m[2mroutes adult_text capability through specialist providers without GenX fallback
[22m[39m[capability-router] capability=adult_text provider=together model=NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO fallback=false artifact=false error=null

 [32m✓[39m src/lib/__tests__/adult-text-route.test.ts [2m([22m[2m4 tests[22m[2m)[22m[33m 374[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/backend-wiring-core-network.test.ts [2m([22m[2m65 tests[22m[2m)[22m[33m 327[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/app-agent-golive.test.ts [2m([22m[2m35 tests[22m[2m)[22m[33m 539[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/config-validator.test.ts [2m([22m[2m31 tests[22m[2m)[22m[32m 232[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/video-job-artifact-link.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 128[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/platform-systems.test.ts [2m([22m[2m98 tests[22m[2m)[22m[32m 199[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/infrastructure-items.test.ts [2m([22m[2m42 tests[22m[2m)[22m[33m 749[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/genx-client.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 84[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/api-routes-and-labs.test.ts [2m([22m[2m107 tests[22m[2m)[22m[32m 98[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/core-intelligence.test.ts [2m([22m[2m85 tests[22m[2m)[22m[32m 89[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/emotion-engine.test.ts [2m([22m[2m88 tests[22m[2m)[22m[32m 65[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/suggestive-capability.test.ts [2m([22m[2m45 tests[22m[2m)[22m[32m 52[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/new-systems.test.ts [2m([22m[2m20 tests[22m[2m)[22m[33m 444[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/adult-capability.test.ts [2m([22m[2m35 tests[22m[2m)[22m[32m 57[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/standalone-provider-truth.test.ts [2m([22m[2m1 test[22m[2m)[22m[32m 59[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/new-platform-modules.test.ts [2m([22m[2m36 tests[22m[2m)[22m[32m 46[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/storage-persistence.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 48[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/image-dispatch-guard.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/research-capability.test.ts [2m([22m[2m20 tests[22m[2m)[22m[32m 29[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/orchestrator.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 27[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/emotion-persistence-enrichment.test.ts [2m([22m[2m27 tests[22m[2m)[22m[32m 23[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/agent-runtime.test.ts [2m([22m[2m19 tests[22m[2m)[22m[32m 18[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/retrieval-engine.test.ts [2m([22m[2m9 tests[22m[2m)[22m[32m 15[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/command-router.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 16[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/multimodal-router.test.ts [2m([22m[2m14 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/dashboard-productization-fix.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/adult-model-catalog.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 11[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/public-website-3d-product-showcase.test.ts [2m([22m[2m4 tests[22m[2m)[22m[32m 7[2mms[22m[39m
 [32m✓[39m src/lib/__tests__/repo-workbench-safety.test.ts [2m([22m[2m5 tests[22m[2m)[22m[32m 9[2mms[22m[39m

[31m⎯⎯⎯⎯⎯⎯[39m[1m[41m Failed Tests 110 [49m[22m[31m⎯⎯⎯⎯⎯⎯[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/adult-agent-audit.test.ts[2m > [22mAgent Audit System[2m > [22mgetAgentReadiness[2m > [22mretrieval agent uses openai (callable) provider
[31m[1mAssertionError[22m: expected [ 'READY', 'PARTIAL' ] to include 'NOT_CONNECTED'[39m
[36m [2m❯[22m src/lib/__tests__/adult-agent-audit.test.ts:[2m120:36[22m[39m
    [90m118|[39m       [34mexpect[39m(entry[33m![39m[33m.[39mproviderCallable)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m119|[39m       [90m// Previously used cohere (NOT callable); upgraded to openai[39m
    [90m120|[39m       [34mexpect[39m([[32m'READY'[39m[33m,[39m [32m'PARTIAL'[39m])[33m.[39m[34mtoContain[39m(entry[33m![39m[33m.[39mreadiness)
    [90m   |[39m                                    [31m^[39m
    [90m121|[39m     })
    [90m122|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/adult-agent-audit.test.ts[2m > [22mAgent Audit System[2m > [22mgetAgentReadiness[2m > [22mcreative agent uses gemini (callable) provider
[31m[1mAssertionError[22m: expected [ 'READY', 'PARTIAL' ] to include 'NOT_CONNECTED'[39m
[36m [2m❯[22m src/lib/__tests__/adult-agent-audit.test.ts:[2m128:36[22m[39m
    [90m126|[39m       [34mexpect[39m(entry[33m![39m[33m.[39mproviderCallable)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m127|[39m       [90m// Previously used anthropic (NOT callable); upgraded to gemini[39m
    [90m128|[39m       [34mexpect[39m([[32m'READY'[39m[33m,[39m [32m'PARTIAL'[39m])[33m.[39m[34mtoContain[39m(entry[33m![39m[33m.[39mreadiness)
    [90m   |[39m                                    [31m^[39m
    [90m129|[39m     })
    [90m130|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/adult-agent-audit.test.ts[2m > [22mAgent Audit System[2m > [22mspecific agent classifications[2m > [22mclassifies openai-based agents correctly
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/adult-agent-audit.test.ts:[2m154:44[22m[39m
    [90m152|[39m         [35mif[39m (entry[33m?.[39mdefaultProvider [33m===[39m [32m'openai'[39m) {
    [90m153|[39m           [34mexpect[39m(entry[33m.[39mproviderCallable)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m154|[39m           [34mexpect[39m(entry[33m.[39mproviderRegistered)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                            [31m^[39m
    [90m155|[39m         }
    [90m156|[39m       }

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/adult-media-routing.test.ts[2m > [22madult and media capability routing[2m > [22mroutes adult_voice through audio/TTS executors
[31m[1mAssertionError[22m: expected [ 'genx', 'huggingface' ] to deeply equal ArrayContaining{…}[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- ArrayContaining [[39m
[31m+ [[39m
[2m    "genx",[22m
[32m-   "groq",[39m
[2m    "huggingface",[22m
[2m  ][22m

[36m [2m❯[22m src/lib/__tests__/adult-media-routing.test.ts:[2m31:61[22m[39m
    [90m 29|[39m     [34mexpect[39m(route[33m?.[39mroute)[33m.[39m[34mtoBe[39m([32m'/api/brain/tts'[39m)
    [90m 30|[39m     [34mexpect[39m(route[33m?.[39martifactType)[33m.[39m[34mtoBe[39m([32m'audio'[39m)
    [90m 31|[39m     expect(route?.providers.map((entry) => entry.provider)).toEqual(ex…
    [90m   |[39m                                                             [31m^[39m
    [90m 32|[39m   })
    [90m 33|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/app-profiles.test.ts[2m > [22mApp Profiles[2m > [22misProviderAllowed[2m > [22mallows configured providers for crypto app
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/app-profiles.test.ts:[2m55:52[22m[39m
    [90m 53|[39m     [34mit[39m([32m'allows configured providers for crypto app'[39m[33m,[39m () [33m=>[39m {
    [90m 54|[39m       [35mconst[39m profile [33m=[39m [34mgetAppProfile[39m([32m'amarktai-crypto'[39m)
    [90m 55|[39m       [34mexpect[39m([34misProviderAllowed[39m(profile[33m,[39m [32m'openai'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                                    [31m^[39m
    [90m 56|[39m     })
    [90m 57|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/backend-truth.test.ts[2m > [22mbackend capability truth[2m > [22m/api/brain/video-generate returns a truthful blocker when no renderer exists
[31m[1mAssertionError[22m: expected 'No tested approved video provider cou…' to contain 'No real video generation provider is …'[39m

Expected: [32m"No [7mreal video generation provider is configured[27m"[39m
Received: [31m"No [7mtested approved video provider could start a real job.[27m"[39m

[36m [2m❯[22m src/lib/__tests__/backend-truth.test.ts:[2m79:26[22m[39m
    [90m 77|[39m     [34mexpect[39m(data[33m.[39mexecuted)[33m.[39m[34mtoBe[39m([35mfalse[39m)
    [90m 78|[39m     [34mexpect[39m(data[33m.[39mgeneration_available)[33m.[39m[34mtoBe[39m([35mfalse[39m)
    [90m 79|[39m     expect(data.blocker).toContain('No real video generation provider …
    [90m   |[39m                          [31m^[39m
    [90m 80|[39m   })
    [90m 81|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/dashboard-go-live-wiring.test.ts[2m > [22mfinal dashboard source-of-truth wiring[2m > [22mkeeps exactly the five truthful dashboard routes
[31m[1mAssertionError[22m: expected [ '/admin/dashboard', …(6) ] to deeply equal [ '/admin/dashboard/workspace', …(4) ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[32m-   "/admin/dashboard/workspace",[39m
[31m+   "/admin/dashboard",[39m
[31m+   "/admin/dashboard/studio",[39m
[31m+   "/admin/dashboard/workbench",[39m
[31m+   "/admin/dashboard/app-builder",[39m
[2m    "/admin/dashboard/outputs",[22m
[32m-   "/admin/dashboard/memory",[39m
[31m+   "/admin/dashboard/network-apps",[39m
[2m    "/admin/dashboard/settings",[22m
[32m-   "/admin/dashboard/system",[39m
[2m  ][22m

[36m [2m❯[22m src/lib/__tests__/dashboard-go-live-wiring.test.ts:[2m12:58[22m[39m
    [90m 10|[39m [34mdescribe[39m([32m'final dashboard source-of-truth wiring'[39m[33m,[39m () [33m=>[39m {
    [90m 11|[39m   [34mit[39m([32m'keeps exactly the five truthful dashboard routes'[39m[33m,[39m () [33m=>[39m {
    [90m 12|[39m     [34mexpect[39m([33mDASHBOARD_NAV_ITEMS[39m[33m.[39m[34mmap[39m((item) [33m=>[39m item[33m.[39mhref))[33m.[39m[34mtoEqual[39m([
    [90m   |[39m                                                          [31m^[39m
    [90m 13|[39m       [32m'/admin/dashboard/workspace'[39m[33m,[39m
    [90m 14|[39m       [32m'/admin/dashboard/outputs'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/dashboard-go-live-wiring.test.ts[2m > [22mfinal dashboard source-of-truth wiring[2m > [22mkeeps technical details in Settings and System
[31m[1mAssertionError[22m: expected 'import { getVpsSnapshot } from \'@/li…' to contain 'Advanced diagnostics'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- Advanced diagnostics[39m
[31m+ import { getVpsSnapshot } from '@/lib/vps-monitor'[39m
[31m+ import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'[39m
[31m+[39m
[31m+ export default async function SystemPage() {[39m
[31m+   const [vps, runtime] = await Promise.all([getVpsSnapshot().catch(() => null), getDashboardRuntimeTruth().catch(() => null)])[39m
[31m+   const serviceRows = vps ? Object.entries(vps.services) : [][39m
[31m+   return ([39m
[31m+     <div className="space-y-5">[39m
[31m+       <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">[39m
[31m+         <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Advanced Admin</p>[39m
[31m+         <h1 className="mt-2 text-3xl font-black text-white">System, operations, VPS, queues, logs, and runtime diagnostics.</h1>[39m
[31m+         <p className="mt-2 text-sm leading-6 text-slate-400">Technical detail stays here, outside the normal product workflow. Destructive repairs, restarts, merges, and deployments remain approval-gated.</p>[39m
[31m+       </section>[39m
[31m+       <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">[39m
[31m+         <Metric label="Host" value={vps?.host.hostname || 'Unknown'} />[39m
[31m+         <Metric label="Memory used" value={vps ? `${vps.host.memory.usedPercent}%` : 'Unknown'} />[39m
[31m+         <Metric label="Uptime" value={vps ? `${Math.floor(vps.host.uptimeSeconds / 3600)} hours` : 'Unknown'} />[39m
[31m+         <Metric label="Queue" value={vps?.queue.healthy ? 'Ready' : 'Needs attention'} />[39m
[31m+       </section>[39m
[31m+       <section className="grid gap-4 xl:grid-cols-2">[39m
[31m+         <Panel title="Services">{serviceRows.map(([name, value]) => <Row key={name} label={name} value={formatService(value)} />)}</Panel>[39m
[31m+         <Panel title="Runtime truth">{(runtime?.providers ?? []).slice(0, 14).map((provider) => <Row key={provider.key} label={provider.displayName} value={provider.connected ? 'Connected' : provider.reason} />)}</Panel>[39m
[31m+       </section>[39m
[31m+       <details className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">[39m
[31m+         <summary className="cursor-pointer text-sm font-black text-slate-300">Raw diagnostics</summary>[39m
[31m+         <div className="mt-4 grid gap-2 md:grid-cols-2">[39m
[31m+           {(runtime?.blockers ?? []).map((blocker) => <Row key={blocker} label="Action" value={blocker} />)}[39m
[31m+           {!runtime?.blockers?.length && <p className="text-sm text-slate-400">No runtime blockers reported.</p>}[39m
[31m+         </div>[39m
[31m+       </details>[39m
[31m+     </div>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ function formatService(value: unknown) {[39m
[31m+   if (!value) return 'Unknown'[39m
[31m+   if (typeof value === 'string') return value[39m
[31m+   if (typeof value === 'object' && value && 'available' in value) return (value as { available: boolean; output?: string }).available ? ((value as { output?: string }).output || 'Available').split('\n')[0] : 'Needs attention'[39m
[31m+   if (typeof value === 'object' && value && 'status' in value) return String((value as { status?: unknown }).status)[39m
[31m+   return 'Checked'[39m
[31m+ }[39m
[31m+[39m
[31m+ function Metric({ label, value }: { label: string; value: string }) {[39m
[31m+   return <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-xl font-black text-white">{value}</p></div>[39m
[31m+ }[39m
[31m+[39m
[31m+ function Panel({ title, children }: { title: string; children: React.ReactNode }) {[39m
[31m+   return <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5"><h2 className="font-black text-white">{title}</h2><div className="mt-4 space-y-2">{children}</div></section>[39m
[31m+ }[39m
[31m+[39m
[31m+ function Row({ label, value }: { label: string; value: string }) {[39m
[31m+   return <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-2 text-xs last:border-0"><span className="font-bold text-slate-500">{label}</span><span className="max-w-[65%] text-right font-bold text-slate-300">{value}</span></div>[39m
[31m+ }[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/dashboard-go-live-wiring.test.ts:[2m57:57[22m[39m
    [90m 55|[39m     [34mexpect[39m(command)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'model catalog dump'[39m)
    [90m 56|[39m     [34mexpect[39m(overview)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'JSON.stringify'[39m)
    [90m 57|[39m     expect(read('app/admin/dashboard/system/page.tsx')).toContain('Adv…
    [90m   |[39m                                                         [31m^[39m
    [90m 58|[39m   })
    [90m 59|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/final-dashboard-ux.test.ts[2m > [22mfinal dashboard UX[2m > [22mrenders the standalone core sections in primary navigation
[31m[1mAssertionError[22m: expected 'import {\n  GitPullRequest,\n  Home,\…' to contain 'label: \'Media Studio / Playground\''[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- label: 'Media Studio / Playground'[39m
[31m+ import {[39m
[31m+   GitPullRequest,[39m
[31m+   Home,[39m
[31m+   Library,[39m
[31m+   Rocket,[39m
[31m+   Settings2,[39m
[31m+   Sparkles,[39m
[31m+   Workflow,[39m
[31m+ } from 'lucide-react'[39m
[31m+ import type { ComponentType, SVGProps } from 'react'[39m
[31m+[39m
[31m+ export type DashboardSectionId =[39m
[31m+   | 'home'[39m
[31m+   | 'playground'[39m
[31m+   | 'repo-workbench'[39m
[31m+   | 'app-builder'[39m
[31m+   | 'outputs'[39m
[31m+   | 'connected-apps'[39m
[31m+   | 'control-center'[39m
[31m+[39m
[31m+ export type DashboardNavItem = {[39m
[31m+   id: DashboardSectionId[39m
[31m+   href: string[39m
[31m+   label: string[39m
[31m+   description: string[39m
[31m+   icon: ComponentType<SVGProps<SVGSVGElement>>[39m
[31m+ }[39m
[31m+[39m
[31m+ export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [[39m
[31m+   {[39m
[31m+     id: 'home',[39m
[31m+     href: '/admin/dashboard',[39m
[31m+     label: 'Home',[39m
[31m+     description: 'Start here.',[39m
[31m+     icon: Home,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'playground',[39m
[31m+     href: '/admin/dashboard/studio',[39m
[31m+     label: 'Playground',[39m
[31m+     description: 'Generate with AI.',[39m
[31m+     icon: Sparkles,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'repo-workbench',[39m
[31m+     href: '/admin/dashboard/workbench',[39m
[31m+     label: 'Repo Workbench',[39m
[31m+     description: 'Fix and deploy code.',[39m
[31m+     icon: GitPullRequest,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'app-builder',[39m
[31m+     href: '/admin/dashboard/app-builder',[39m
[31m+     label: 'App Builder',[39m
[31m+     description: 'Build connected apps.',[39m
[31m+     icon: Rocket,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'outputs',[39m
[31m+     href: '/admin/dashboard/outputs',[39m
[31m+     label: 'Outputs',[39m
[31m+     description: 'View created work.',[39m
[31m+     icon: Library,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'connected-apps',[39m
[31m+     href: '/admin/dashboard/network-apps',[39m
[31m+     label: 'Connected Apps',[39m
[31m+     description: 'Manage app access.',[39m
[31m+     icon: Workflow,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'control-center',[39m
[31m+     href: '/admin/dashboard/settings',[39m
[31m+     label: 'Control Center',[39m
[31m+     description: 'Providers, system, logs.',[39m
[31m+     icon: Settings2,[39m
[31m+   },[39m
[31m+ ] as const[39m
[31m+[39m
[31m+ export const CONTROL_CENTER_ROUTES = [[39m
[31m+   '/admin/dashboard/settings',[39m
[31m+   '/admin/dashboard/operations',[39m
[31m+   '/admin/dashboard/system',[39m
[31m+ ] as const[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/final-dashboard-ux.test.ts:[2m29:17[22m[39m
    [90m 27|[39m     [34mexpect[39m(nav)[33m.[39m[34mtoContain[39m([32m"label: 'App Builder'"[39m)
    [90m 28|[39m     [34mexpect[39m(nav)[33m.[39m[34mtoContain[39m([32m"label: 'Repo Workbench'"[39m)
    [90m 29|[39m     [34mexpect[39m(nav)[33m.[39m[34mtoContain[39m([32m"label: 'Media Studio / Playground'"[39m)
    [90m   |[39m                 [31m^[39m
    [90m 30|[39m     [34mexpect[39m(nav)[33m.[39m[34mtoContain[39m([32m"label: 'Outputs'"[39m)
    [90m 31|[39m     [34mexpect[39m(nav)[33m.[39m[34mtoContain[39m([32m"label: 'Settings'"[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/integration-verification.test.ts[2m > [22mIntegration Verification[2m > [22mModel Registry as Single Source of Truth[2m > [22mmodel registry covers all providers in preference order lists
[31m[1mAssertionError[22m: Registry missing provider: openai: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/integration-verification.test.ts:[2m60:69[22m[39m
    [90m 58|[39m       const orchestratorProviders = ['openai', 'groq', 'deepseek', 'op…
    [90m 59|[39m       [35mfor[39m ([35mconst[39m p [35mof[39m orchestratorProviders) {
    [90m 60|[39m         expect(providers.has(p), `Registry missing provider: ${p}`).to…
    [90m   |[39m                                                                     [31m^[39m
    [90m 61|[39m       }
    [90m 62|[39m     })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/live-media-execution-contract.test.ts[2m > [22mlive media route contracts[2m > [22muses canonical video capability and exposes local polling in Studio
[31m[1mAssertionError[22m: expected 'import { NextRequest, NextResponse } …' to contain 'vocalStyle: \'instrumental_only\''[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- vocalStyle: 'instrumental_only'[39m
[31m+ import { NextRequest, NextResponse } from 'next/server'[39m
[31m+ import { getSession } from '@/lib/session'[39m
[31m+ import { createArtifact, type ArtifactType } from '@/lib/artifact-store'[39m
[31m+ import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'[39m
[31m+ import { createLocalMediaJob, localMediaJobResponse } from '@/lib/media-job-store'[39m
[31m+ import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'[39m
[31m+ import { type AdultPolicyValue } from '@/lib/universal-model-catalog'[39m
[31m+ import { getStudioRouteConfig, type StudioTab } from '@/lib/studio-route-map'[39m
[31m+ import { POST as researchAssistPost } from '@/app/api/admin/research/assist/route'[39m
[31m+ import { POST as imagePost } from '@/app/api/brain/image/route'[39m
[31m+ import { POST as videoPost } from '@/app/api/brain/video-generate/route'[39m
[31m+ import { POST as ttsPost } from '@/app/api/brain/tts/route'[39m
[31m+ import { POST as adultTextPost } from '@/app/api/brain/adult-text/route'[39m
[31m+ import { POST as adultImagePost } from '@/app/api/brain/adult-image/route'[39m
[31m+ import { POST as avatarVideoPost } from '@/app/api/brain/avatar-video/route'[39m
[31m+ import { POST as musicPost } from '@/app/api/admin/music-studio/route'[39m
[31m+[39m
[31m+ type StudioExecuteTab =[39m
[31m+   | 'Chat'[39m
[31m+   | 'Coding'[39m
[31m+   | 'Research'[39m
[31m+   | 'Image'[39m
[31m+   | 'Video'[39m
[31m+   | 'Music / Audio'[39m
[31m+   | 'Voice / TTS'[39m
[31m+   | 'STT / Transcription'[39m
[31m+   | 'Avatar / Talking Video'[39m
[31m+   | 'Adult'[39m
[31m+   | 'Artifacts'[39m
[31m+[39m
[31m+ type ExecuteBody = {[39m
[31m+   tab?: StudioTab[39m
[31m+   prompt?: string[39m
[31m+   provider?: string[39m
[31m+   model?: string[39m
[31m+   costMode?: 'cheap' | 'balanced' | 'premium'[39m
[31m+   appSlug?: string[39m
[31m+   adultPolicy?: string[39m
[31m+   mode?: 'text' | 'image' | 'video' | 'voice'[39m
[31m+   voiceId?: string[39m
[31m+   size?: string[39m
[31m+   style?: string[39m
[31m+   capability?: string[39m
[31m+   adultMode?: string[39m
[31m+   genre?: string[39m
[31m+   vocalStyle?: string[39m
[31m+   durationSeconds?: number[39m
[31m+   instrumental?: boolean[39m
[31m+   lyrics?: string[39m
[31m+ }[39m
[31m+[39m
[31m+ function jsonRequest(path: string, body: Record<string, unknown>) {[39m
[31m+   return new NextRequest(new URL(path, 'http://studio.local'), {[39m
[31m+     method: 'POST',[39m
[31m+     headers: { 'Content-Type': 'application/json' },[39m
[31m+     body: JSON.stringify(body),[39m
[31m+   })[39m
[31m+ }[39m
[31m+[39m
[31m+ async function readJson(response: Response): Promise<Record<string, unknown>> {[39m
[31m+   return await response.json().catch(() => ({})) as Record<string, unknown>[39m
[31m+ }[39m
[31m+[39m
[31m+ async function persistArtifact(input: {[39m
[31m+   appSlug: string[39m
[31m+   type: ArtifactType[39m
[31m+   subType: string[39m
[31m+   title: string[39m
[31m+   description?: string[39m
[31m+   provider?: string[39m
[31m+   model?: string[39m
[31m+   content?: Buffer | string[39m
[31m+   contentUrl?: string[39m
[31m+   mimeType?: string[39m
[31m+   metadata?: Record<string, unknown>[39m
[31m+ }) {[39m
[31m+   try {[39m
[31m+     return await createArtifact({[39m
[31m+       appSlug: input.appSlug,[39m
[31m+       type: input.type,[39m
[31m+       subType: input.subType,[39m
[31m+       title: input.title,[39m
[31m+       description: input.description,[39m
[31m+       provider: input.provider,[39m
[31m+       model: input.model,[39m
[31m+       content: typeof input.content === 'string' ? Buffer.from(input.content, 'utf8') : input.content,[39m
[31m+       contentUrl: input.contentUrl,[39m
[31m+       mimeType: input.mimeType,[39m
[31m+       metadata: input.metadata ?? {},[39m
[31m+     })[39m
[31m+   } catch (error) {[39m
[31m+     return {[39m
[31m+       id: null,[39m
[31m+       warning: error instanceof Error ? error.message : 'Artifact persistence failed',[39m
[31m+     }[39m
[31m+   }[39m
[31m+ }[39m
[31m+[39m
[31m+ function normalizeCapability(tab: StudioTab, adultMode?: string): AiCapability {[39m
[31m+   if (tab === 'Research') return 'research'[39m
[31m+   if (tab === 'Image') return 'image_generation'[39m
[31m+   if (tab === 'Video') return 'video_generation'[39m
[31m+   if (tab === 'Music / Audio') return 'music_generation'[39m
[31m+   if (tab === 'Voice / TTS') return 'tts'[39m
[31m+   if (tab === 'Avatar / Talking Video') return 'avatar_video'[39m
[31m+   if (tab === 'Adult') {[39m
[31m+     if (adultMode === 'image') return 'adult_image'[39m
[31m+     if (adultMode === 'video') return 'adult_video'[39m
[31m+     if (adultMode === 'voice') return 'adult_voice'[39m
[31m+     return 'adult_text'[39m
[31m+   }[39m
[31m+   return 'chat'[39m
[31m+ }[39m
[31m+[39m
[31m+[39m
[31m+ function normalizeStudioTab(input: unknown, body?: ExecuteBody): StudioExecuteTab | null {[39m
[31m+   const normalize = (value: unknown) =>[39m
[31m+     typeof value === 'string'[39m
[31m+       ? value.trim().toLowerCase().replace(/[_-]/g, ' ').replace(/\s+/g, ' ')[39m
[31m+       : ''[39m
[31m+[39m
[31m+   const candidates = [[39m
[31m+     normalize(input),[39m
[31m+     normalize(body?.tab),[39m
[31m+     normalize(body?.mode),[39m
[31m+     normalize(body?.capability),[39m
[31m+     normalize(body?.adultMode),[39m
[31m+   ].filter(Boolean)[39m
[31m+[39m
[31m+   for (const value of candidates) {[39m
[31m+     if (value === 'chat') return 'Chat'[39m
[31m+     if (value === 'research') return 'Research'[39m
[31m+     if (value === 'coding' || value === 'code' || value === 'code generation') return 'Coding'[39m
[31m+[39m
[31m+     if ([39m
[31m+       value === 'image' ||[39m
[31m+       value === 'image generation' ||[39m
[31m+       value === 'image gen' ||[39m
[31m+       value === 'generate image'[39m
[31m+     ) return 'Image'[39m
[31m+[39m
[31m+     if ([39m
[31m+       value === 'video' ||[39m
[31m+       value === 'video generation' ||[39m
[31m+       value === 'video gen' ||[39m
[31m+       value === 'generate video'[39m
[31m+     ) return 'Video'[39m
[31m+[39m
[31m+     if ([39m
[31m+       value === 'music' ||[39m
[31m+       value === 'song' ||[39m
[31m+       value === 'audio' ||[39m
[31m+       value === 'music audio' ||[39m
[31m+       value === 'music generation' ||[39m
[31m+       value === 'audio generation'[39m
[31m+     ) return 'Music / Audio'[39m
[31m+[39m
[31m+     if ([39m
[31m+       value === 'tts' ||[39m
[31m+       value === 'voice' ||[39m
[31m+       value === 'voice tts' ||[39m
[31m+       value === 'text to speech' ||[39m
[31m+       value === 'voice generation'[39m
[31m+     ) return 'Voice / TTS'[39m
[31m+[39m
[31m+     if ([39m
[31m+       value === 'stt' ||[39m
[31m+       value === 'speech to text' ||[39m
[31m+       value === 'transcription' ||[39m
[31m+       value === 'stt transcription'[39m
[31m+     ) return 'STT / Transcription'[39m
[31m+[39m
[31m+     if ([39m
[31m+       value === 'avatar' ||[39m
[31m+       value === 'avatar video' ||[39m
[31m+       value === 'talking video' ||[39m
[31m+       value === 'avatar talking video'[39m
[31m+     ) return 'Avatar / Talking Video'[39m
[31m+[39m
[31m+     if ([39m
[31m+       value === 'adult' ||[39m
[31m+       value === 'adult text' ||[39m
[31m+       value === 'adult image' ||[39m
[31m+       value === 'adult video' ||[39m
[31m+       value === 'adult voice' ||[39m
[31m+       value === 'text' ||[39m
[31m+       value === 'image adult' ||[39m
[31m+       value === 'video adult' ||[39m
[31m+       value === 'voice adult'[39m
[31m+     ) return 'Adult'[39m
[31m+   }[39m
[31m+[39m
[31m+   return null[39m
[31m+ }[39m
[31m+[39m
[31m+[39m
[31m+ function inferMusicGenre(prompt: string): string {[39m
[31m+   const p = prompt.toLowerCase()[39m
[31m+   if (p.includes('reggae') || p.includes('rasta')) return 'reggae pop rock r&b'[39m
[31m+   if (p.includes('r&b') || p.includes('rnb')) return 'r&b pop'[39m
[31m+   if (p.includes('rock')) return 'pop rock'[39m
[31m+   return 'pop'[39m
[31m+ }[39m
[31m+[39m
[31m+ function inferMusicVocalStyle(prompt: string, explicit?: string, instrumental?: boolean): string {[39m
[31m+   if (explicit?.trim()) return explicit.trim()[39m
[31m+   if (instrumental === true) return 'instrumental_only'[39m
[31m+[39m
[31m+   const p = prompt.toLowerCase()[39m
[31m+   if (p.includes('female') || p.includes('woman') || p.includes('girl')) return 'female lead vocal, sung lyrics, natural harmonies'[39m
[31m+   if (p.includes('male') || p.includes('man')) return 'male lead vocal, sung lyrics'[39m
[31m+   if (p.includes('vocal') || p.includes('sing') || p.includes('lyrics')) return 'lead vocal, sung lyrics'[39m
[31m+   return 'female lead vocal, sung lyrics'[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function POST(request: NextRequest) {[39m
[31m+   const session = await getSession()[39m
[31m+   if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })[39m
[31m+[39m
[31m+   const body = await request.json().catch(() => ({})) as ExecuteBody[39m
[31m+   const tab = normalizeStudioTab(body.tab ?? body.mode ?? body.capability, body)[39m
[31m+   const prompt = body.prompt?.trim() ?? ''[39m
[31m+   const appSlug = body.appSlug?.trim() || 'amarktai-network'[39m
[31m+   if (!tab) return NextResponse.json({ success: false, error: 'tab is required' }, { status: 400 })[39m
[31m+   if (!prompt) return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 })[39m
[31m+[39m
[31m+   const config = getStudioRouteConfig(tab)[39m
[31m+   if (config.status === 'missing') {[39m
[31m+     return NextResponse.json({[39m
[31m+       success: false, executed: false, capability: config.capability, provider: null, model: null,[39m
[31m+       jobStatus: 'needs_setup', artifactId: null, storageUrl: null, error: config.detail, blocker: config.detail, route: config,[39m
[31m+     }, { status: 501 })[39m
[31m+   }[39m
[31m+[39m
[31m+   const capability = normalizeCapability(tab, body.mode)[39m
[31m+   if (tab === 'Avatar / Talking Video') {[39m
[31m+     const response = await avatarVideoPost(jsonRequest('/api/brain/avatar-video', { prompt, appSlug }))[39m
[31m+     const data = await readJson(response)[39m
[31m+     return NextResponse.json({ ...data, result: data, artifact: null }, { status: response.status })[39m
[31m+   }[39m
[31m+[39m
[31m+   const route = routeLiveModel({[39m
[31m+     capability,[39m
[31m+     appSlug,[39m
[31m+     selectedProvider: body.provider ?? 'auto',[39m
[31m+     selectedModel: body.model === 'auto' ? undefined : body.model,[39m
[31m+     costMode: body.costMode ?? 'balanced',[39m
[31m+     adultPolicy: (body.adultPolicy ?? 'off') as AdultPolicyValue,[39m
[31m+     requiresMedia: ['image', 'video', 'adult_image', 'adult_video', 'adult_voice', 'music_generation', 'tts'].includes(capability),[39m
[31m+   })[39m
[31m+[39m
[31m+   if (route.blockedReason) {[39m
[31m+     return NextResponse.json({[39m
[31m+       success: false, executed: false, capability, provider: null, model: null,[39m
[31m+       jobStatus: 'blocked', artifactId: null, storageUrl: null,[39m
[31m+       error: route.blockedReason, blocker: route.blockedReason, route,[39m
[31m+     }, { status: 409 })[39m
[31m+   }[39m
[31m+[39m
[31m+   try {[39m
[31m+     if (tab === 'Research') {[39m
[31m+       const response = await researchAssistPost(jsonRequest('/api/admin/research/assist', { prompt, appSlug }))[39m
[31m+       const data = await readJson(response)[39m
[31m+       const artifact = await persistArtifact({[39m
[31m+         appSlug,[39m
[31m+         type: 'document',[39m
[31m+         subType: 'research_brief',[39m
[31m+         title: `Research: ${prompt.slice(0, 80)}`,[39m
[31m+         description: 'Studio Research Agent result',[39m
[31m+         provider: String(route.selectedProvider ?? 'research'),[39m
[31m+         model: String(route.selectedModel ?? ''),[39m
[31m+         content: JSON.stringify(data, null, 2),[39m
[31m+         mimeType: 'application/json',[39m
[31m+         metadata: { tab, route },[39m
[31m+       })[39m
[31m+       return NextResponse.json({ success: response.ok, executed: response.ok, result: data, artifact, route }, { status: response.status })[39m
[31m+     }[39m
[31m+[39m
[31m+     if (tab === 'Image') {[39m
[31m+       if (route.selectedProvider === 'huggingface') {[39m
[31m+         return NextResponse.json({ success: false, executed: false, error: 'Hugging Face image generation is task-based and is not wired to this image execution route yet.', route }, { status: 409 })[39m
[31m+       }[39m
[31m+       const response = await imagePost(jsonRequest('/api/brain/image', {[39m
[31m+         prompt,[39m
[31m+         size: body.size ?? '1024x1024',[39m
[31m+         providerOverride: route.selectedProvider,[39m
[31m+         modelOverride: route.selectedModel,[39m
[31m+       }))[39m
[31m+       const data = await readJson(response)[39m
[31m+       const persisted = response.ok && data.executed[39m
[31m+         ? await persistCanonicalMediaResult({[39m
[31m+           result: data,[39m
[31m+           appSlug,[39m
[31m+           type: 'image',[39m
[31m+           subType: 'studio_image',[39m
[31m+           title: `Image: ${prompt.slice(0, 80)}`,[39m
[31m+           provider: String(data.provider ?? route.selectedProvider ?? ''),[39m
[31m+           model: String(data.model ?? route.selectedModel ?? ''),[39m
[31m+           metadata: { tab, route },[39m
[31m+         })[39m
[31m+         : null[39m
[31m+       const localJob = persisted?.status === 'processing'[39m
[31m+         && persisted.jobId[39m
[31m+         && String(data.provider ?? route.selectedProvider) === 'genx'[39m
[31m+         ? createLocalMediaJob({[39m
[31m+           capability: 'image_generation',[39m
[31m+           appSlug,[39m
[31m+           type: 'image',[39m
[31m+           subType: 'studio_image',[39m
[31m+           title: `Image: ${prompt.slice(0, 80)}`,[39m
[31m+           prompt,[39m
[31m+           provider: String(data.provider ?? route.selectedProvider ?? ''),[39m
[31m+           model: String(data.model ?? route.selectedModel ?? ''),[39m
[31m+           providerJobId: persisted.jobId,[39m
[31m+           metadata: { tab, route, responseShapeKeys: persisted.responseShapeKeys },[39m
[31m+         })[39m
[31m+         : null[39m
[31m+       const tracked = localJob ? localMediaJobResponse(localJob) : null[39m
[31m+       const success = Boolean(persisted?.success || tracked?.success)[39m
[31m+       return NextResponse.json({[39m
[31m+         ...tracked,[39m
[31m+         success,[39m
[31m+         executed: success,[39m
[31m+         capability,[39m
[31m+         provider: persisted?.provider ?? data.provider ?? route.selectedProvider,[39m
[31m+         model: persisted?.model ?? data.model ?? route.selectedModel,[39m
[31m+         jobStatus: tracked?.jobStatus ?? persisted?.status ?? 'failed',[39m
[31m+         jobId: tracked?.jobId ?? persisted?.jobId ?? null,[39m
[31m+         providerJobId: tracked?.providerJobId ?? persisted?.jobId ?? null,[39m
[31m+         pollUrl: tracked?.pollUrl ?? null,[39m
[31m+         artifactId: persisted?.artifactId ?? null,[39m
[31m+         storageUrl: persisted?.storageUrl ?? null,[39m
[31m+         imageUrl: persisted?.mediaUrl ?? null,[39m
[31m+         blocker: tracked ? null : persisted?.blocker ?? data.error ?? null,[39m
[31m+         error: tracked ? null : persisted?.blocker ?? data.error ?? null,[39m
[31m+         responseShapeKeys: persisted?.responseShapeKeys ?? Object.keys(data).sort(),[39m
[31m+         result: data,[39m
[31m+         artifact: persisted?.artifact ?? null,[39m
[31m+         route,[39m
[31m+       }, { status: tracked ? 202 : success ? 200 : response.ok ? 502 : response.status })[39m
[31m+     }[39m
[31m+[39m
[31m+     if (tab === 'Video' || capability === 'adult_video') {[39m
[31m+       const provider = route.selectedProvider === 'qwen' || route.selectedProvider === 'genx'[39m
[31m+         ? route.selectedProvider[39m
[31m+         : 'genx'[39m
[31m+       const response = await videoPost(jsonRequest('/api/brain/video-generate', {[39m
[31m+         prompt,[39m
[31m+         style: body.style ?? 'cinematic',[39m
[31m+         duration: 4,[39m
[31m+         aspectRatio: '16:9',[39m
[31m+         appSlug,[39m
[31m+         provider,[39m
[31m+         model: route.selectedModel,[39m
[31m+         capability,[39m
[31m+       }) as Request)[39m
[31m+       const data = await readJson(response)[39m
[31m+       const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null[39m
[31m+       return NextResponse.json({[39m
[31m+         success: Boolean(data.success),[39m
[31m+         executed: Boolean(data.executed),[39m
[31m+         capability,[39m
[31m+         provider: data.provider ?? route.selectedProvider,[39m
[31m+         model: data.model ?? route.selectedModel,[39m
[31m+         jobStatus: data.jobStatus ?? data.status ?? 'processing',[39m
[31m+         artifactId: data.artifactId ?? null,[39m
[31m+         storageUrl: data.storageUrl ?? null,[39m
[31m+         error: data.error ?? null,[39m
[31m+         blocker: data.blocker ?? data.error ?? null,[39m
[31m+         result: data,[39m
[31m+         artifact,[39m
[31m+         route,[39m
[31m+       }, { status: response.status })[39m
[31m+     }[39m
[31m+[39m
[31m+     if (tab === 'Music / Audio') {[39m
[31m+       const response = await musicPost(jsonRequest('/api/admin/music-studio', {[39m
[31m+         action: 'create_async',[39m
[31m+         request: {[39m
[31m+           appSlug,[39m
[31m+           theme: prompt,[39m
[31m+           genre: body.genre?.trim() || inferMusicGenre(prompt),[39m
[31m+           genres: ['cinematic'],[39m
[31m+           vocalStyle: inferMusicVocalStyle(prompt, body.vocalStyle, body.instrumental),[39m
[31m+           prompt,[39m
[31m+           provider: route.selectedProvider,[39m
[31m+           model: route.selectedModel,[39m
[31m+         },[39m
[31m+       }))[39m
[31m+       const data = await readJson(response)[39m
[31m+       return NextResponse.json({[39m
[31m+         ...data,[39m
[31m+         success: Boolean(data.success),[39m
[31m+         executed: Boolean(data.executed),[39m
[31m+         capability,[39m
[31m+         provider: data.provider ?? route.selectedProvider,[39m
[31m+         model: data.model ?? route.selectedModel,[39m
[31m+         jobStatus: data.jobStatus ?? data.status ?? 'failed',[39m
[31m+         jobId: data.jobId ?? null,[39m
[31m+         pollUrl: data.pollUrl ?? null,[39m
[31m+         artifactId: data.artifactId ?? null,[39m
[31m+         storageUrl: data.storageUrl ?? null,[39m
[31m+         error: data.error ?? null,[39m
[31m+         blocker: data.blocker ?? data.error ?? null,[39m
[31m+         result: data,[39m
[31m+         artifact: data.artifact ?? null,[39m
[31m+         route,[39m
[31m+       }, { status: response.status })[39m
[31m+     }[39m
[31m+[39m
[31m+     if (tab === 'Voice / TTS' || capability === 'adult_voice') {[39m
[31m+       const provider = ['genx', 'huggingface'].includes(String(route.selectedProvider))[39m
[31m+         ? route.selectedProvider[39m
[31m+         : 'auto'[39m
[31m+       const response = await ttsPost(jsonRequest('/api/brain/tts', {[39m
[31m+         text: prompt,[39m
[31m+         provider,[39m
[31m+         model: provider === 'auto' ? undefined : route.selectedModel,[39m
[31m+         voiceId: body.voiceId,[39m
[31m+         appSlug,[39m
[31m+         capability,[39m
[31m+       }))[39m
[31m+       const data = await readJson(response)[39m
[31m+       const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null[39m
[31m+       return NextResponse.json({[39m
[31m+         ...data,[39m
[31m+         result: data,[39m
[31m+         artifact,[39m
[31m+         route,[39m
[31m+       }, { status: response.status })[39m
[31m+     }[39m
[31m+[39m
[31m+     if (tab === 'Adult') {[39m
[31m+       if (body.mode === 'image') {[39m
[31m+         const response = await adultImagePost(jsonRequest('/api/brain/adult-image', {[39m
[31m+           prompt,[39m
[31m+           appSlug,[39m
[31m+           size: body.size ?? '768x768',[39m
[31m+           provider: route.selectedProvider,[39m
[31m+           model: route.selectedModel,[39m
[31m+         }))[39m
[31m+         const data = await readJson(response)[39m
[31m+         const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null[39m
[31m+         return NextResponse.json({ ...data, result: data, artifact, route }, { status: response.status })[39m
[31m+       }[39m
[31m+       const response = await adultTextPost(jsonRequest('/api/brain/adult-text', {[39m
[31m+         prompt,[39m
[31m+         appSlug,[39m
[31m+         provider: route.selectedProvider,[39m
[31m+         model: route.selectedModel,[39m
[31m+       }))[39m
[31m+       const data = await readJson(response)[39m
[31m+       const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null[39m
[31m+       return NextResponse.json({ ...data, result: data, artifact, route }, { status: response.status })[39m
[31m+     }[39m
[31m+[39m
[31m+     return NextResponse.json({ success: false, executed: false, error: `${tab} execution is not available through this route.`, route }, { status: 400 })[39m
[31m+   } catch (error) {[39m
[31m+     return NextResponse.json({[39m
[31m+       success: false,[39m
[31m+       executed: false,[39m
[31m+       error: error instanceof Error ? error.message : 'Studio execution failed',[39m
[31m+       route,[39m
[31m+     }, { status: 500 })[39m
[31m+   }[39m
[31m+ }[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/live-media-execution-contract.test.ts:[2m164:20[22m[39m
    [90m162|[39m     expect(studio).toContain("if (tab === 'Video') return 'video_gener…
    [90m163|[39m     [34mexpect[39m(studio)[33m.[39m[34mtoContain[39m([32m'pollUrl: tracked?.pollUrl ?? null'[39m)
    [90m164|[39m     [34mexpect[39m(studio)[33m.[39m[34mtoContain[39m([32m"vocalStyle: 'instrumental_only'"[39m)
    [90m   |[39m                    [31m^[39m
    [90m165|[39m   })
    [90m166|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/model-registry.test.ts[2m > [22mModel Registry[2m > [22mgetModelRegistry[2m > [22mincludes models from expected providers
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/model-registry.test.ts:[2m57:39[22m[39m
    [90m 55|[39m       [35mconst[39m registry [33m=[39m [34mgetModelRegistry[39m()
    [90m 56|[39m       [35mconst[39m providers [33m=[39m [35mnew[39m [33mSet[39m(registry[33m.[39m[34mmap[39m(m [33m=>[39m m[33m.[39mprovider))
    [90m 57|[39m       [34mexpect[39m(providers[33m.[39m[34mhas[39m([32m'openai'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                       [31m^[39m
    [90m 58|[39m       [34mexpect[39m(providers[33m.[39m[34mhas[39m([32m'grok'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m 59|[39m       [34mexpect[39m(providers[33m.[39m[34mhas[39m([32m'nvidia'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/model-registry.test.ts[2m > [22mModel Registry[2m > [22mgetModelsByProvider[2m > [22mfilters models by provider key
[31m[1mAssertionError[22m: expected 0 to be greater than 0[39m
[36m [2m❯[22m src/lib/__tests__/model-registry.test.ts:[2m69:35[22m[39m
    [90m 67|[39m     [34mit[39m([32m'filters models by provider key'[39m[33m,[39m () [33m=>[39m {
    [90m 68|[39m       [35mconst[39m openaiModels [33m=[39m [34mgetModelsByProvider[39m([32m'openai'[39m)
    [90m 69|[39m       [34mexpect[39m(openaiModels[33m.[39mlength)[33m.[39m[34mtoBeGreaterThan[39m([34m0[39m)
    [90m   |[39m                                   [31m^[39m
    [90m 70|[39m       expect(openaiModels.every(m => m.provider === 'openai')).toBe(tr…
    [90m 71|[39m     })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/model-registry.test.ts[2m > [22mModel Registry[2m > [22mgetModelById[2m > [22mfinds a specific model by provider and model_id
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/model-registry.test.ts:[2m107:21[22m[39m
    [90m105|[39m     [34mit[39m([32m'finds a specific model by provider and model_id'[39m[33m,[39m () [33m=>[39m {
    [90m106|[39m       [35mconst[39m model [33m=[39m [34mgetModelById[39m([32m'openai'[39m[33m,[39m [32m'gpt-4o'[39m)
    [90m107|[39m       [34mexpect[39m(model)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                     [31m^[39m
    [90m108|[39m       [34mexpect[39m(model[33m?.[39mprovider)[33m.[39m[34mtoBe[39m([32m'openai'[39m)
    [90m109|[39m       [34mexpect[39m(model[33m?.[39mmodel_id)[33m.[39m[34mtoBe[39m([32m'gpt-4o'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/model-registry.test.ts[2m > [22mModel Registry[2m > [22mgetModelsForDomain[2m > [22mfinds specialist models for finance domain
[31m[1mAssertionError[22m: expected 0 to be greater than 0[39m
[36m [2m❯[22m src/lib/__tests__/model-registry.test.ts:[2m142:36[22m[39m
    [90m140|[39m     [34mit[39m([32m'finds specialist models for finance domain'[39m[33m,[39m () [33m=>[39m {
    [90m141|[39m       [35mconst[39m financeModels [33m=[39m [34mgetModelsForDomain[39m([32m'finance'[39m)
    [90m142|[39m       [34mexpect[39m(financeModels[33m.[39mlength)[33m.[39m[34mtoBeGreaterThan[39m([34m0[39m)
    [90m   |[39m                                    [31m^[39m
    [90m143|[39m     })
    [90m144|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/model-registry.test.ts[2m > [22mModel Registry[2m > [22mProvider Health Cache[2m > [22mgetModelEffectiveHealth returns unconfigured when cache is empty
[31m[1mTypeError[22m: Cannot read properties of undefined (reading 'provider')[39m
[36m [2m❯[22m getModelEffectiveHealth src/lib/model-registry.ts:[2m6239:34[22m[39m
    [90m6237|[39m  */
    [90m6238|[39m export function getModelEffectiveHealth(model: ModelEntry): ProviderHe…
    [90m6239|[39m   return getProviderHealth(model.provider);
    [90m   |[39m                                  [31m^[39m
    [90m6240|[39m }
    [90m6241|[39m
[90m [2m❯[22m src/lib/__tests__/model-registry.test.ts:[2m276:14[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/model-registry.test.ts[2m > [22mModel Registry[2m > [22mProvider Health Cache[2m > [22mgetModelEffectiveHealth returns provider health when cache is populated
[31m[1mTypeError[22m: Cannot read properties of undefined (reading 'provider')[39m
[36m [2m❯[22m getModelEffectiveHealth src/lib/model-registry.ts:[2m6239:34[22m[39m
    [90m6237|[39m  */
    [90m6238|[39m export function getModelEffectiveHealth(model: ModelEntry): ProviderHe…
    [90m6239|[39m   return getProviderHealth(model.provider);
    [90m   |[39m                                  [31m^[39m
    [90m6240|[39m }
    [90m6241|[39m
[90m [2m❯[22m src/lib/__tests__/model-registry.test.ts:[2m282:14[22m[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/model-registry.test.ts[2m > [22mModel Registry[2m > [22mProvider Health Cache[2m > [22mgetUsableModels includes models from both healthy and configured providers
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/model-registry.test.ts:[2m324:39[22m[39m
    [90m322|[39m       [35mconst[39m usable [33m=[39m [34mgetUsableModels[39m()
    [90m323|[39m       [35mconst[39m providers [33m=[39m [35mnew[39m [33mSet[39m(usable[33m.[39m[34mmap[39m(m [33m=>[39m m[33m.[39mprovider))
    [90m324|[39m       [34mexpect[39m(providers[33m.[39m[34mhas[39m([32m'openai'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                       [31m^[39m
    [90m325|[39m       [34mexpect[39m(providers[33m.[39m[34mhas[39m([32m'groq'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m326|[39m       [34mexpect[39m(providers[33m.[39m[34mhas[39m([32m'deepseek'[39m))[33m.[39m[34mtoBe[39m([35mfalse[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/phase1-backend-source-of-truth.test.ts[2m > [22mPhase 1 backend source of truth[2m > [22muses Workspace navigation and keeps Command as compatibility only
[31m[1mAssertionError[22m: expected [ 'Home', 'Playground', …(5) ] to deeply equal [ 'Workspace', 'Outputs', …(3) ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[32m-   "Workspace",[39m
[31m+   "Home",[39m
[31m+   "Playground",[39m
[31m+   "Repo Workbench",[39m
[31m+   "App Builder",[39m
[2m    "Outputs",[22m
[32m-   "Memory",[39m
[32m-   "Settings",[39m
[32m-   "System",[39m
[31m+   "Connected Apps",[39m
[31m+   "Control Center",[39m
[2m  ][22m

[36m [2m❯[22m src/lib/__tests__/phase1-backend-source-of-truth.test.ts:[2m54:59[22m[39m
    [90m 52|[39m
    [90m 53|[39m   it('uses Workspace navigation and keeps Command as compatibility onl…
    [90m 54|[39m     [34mexpect[39m([33mDASHBOARD_NAV_ITEMS[39m[33m.[39m[34mmap[39m((item) [33m=>[39m item[33m.[39mlabel))[33m.[39m[34mtoEqual[39m([
    [90m   |[39m                                                           [31m^[39m
    [90m 55|[39m       [32m'Workspace'[39m[33m,[39m [32m'Outputs'[39m[33m,[39m [32m'Memory'[39m[33m,[39m [32m'Settings'[39m[33m,[39m [32m'System'[39m[33m,[39m
    [90m 56|[39m     ])

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/phase1-platform-truth-stabilization.test.ts[2m > [22mPhase 1 platform truth stabilization[2m > [22mkeeps the dashboard to the seven command operating-system sections
[31m[1mAssertionError[22m: expected [ 'Home', 'Playground', …(5) ] to deeply equal [ 'Overview', 'Command', …(5) ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[32m-   "Overview",[39m
[32m-   "Command",[39m
[32m-   "Network Apps",[39m
[31m+   "Home",[39m
[31m+   "Playground",[39m
[31m+   "Repo Workbench",[39m
[31m+   "App Builder",[39m
[2m    "Outputs",[22m
[32m-   "Memory",[39m
[32m-   "Settings",[39m
[32m-   "System",[39m
[31m+   "Connected Apps",[39m
[31m+   "Control Center",[39m
[2m  ][22m

[36m [2m❯[22m src/lib/__tests__/phase1-platform-truth-stabilization.test.ts:[2m26:59[22m[39m
    [90m 24|[39m
    [90m 25|[39m   it('keeps the dashboard to the seven command operating-system sectio…
    [90m 26|[39m     [34mexpect[39m([33mDASHBOARD_NAV_ITEMS[39m[33m.[39m[34mmap[39m((item) [33m=>[39m item[33m.[39mlabel))[33m.[39m[34mtoEqual[39m([
    [90m   |[39m                                                           [31m^[39m
    [90m 27|[39m       [32m'Overview'[39m[33m,[39m
    [90m 28|[39m       [32m'Command'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/phase1-platform-truth-stabilization.test.ts[2m > [22mPhase 1 platform truth stabilization[2m > [22mkeeps adult policy app-level with no separate adult key requirement
[31m[1mAssertionError[22m: expected 'import { getPlatformSettingsTruth } f…' to contain 'No approved adult-capable provider key'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- No approved adult-capable provider key[39m
[31m+ import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'[39m
[31m+ import { getProviderKeyWithSource } from '@/lib/provider-config'[39m
[31m+ import { getServiceConfigField } from '@/lib/service-vault'[39m
[31m+ import { checkWritable, listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'[39m
[31m+ import { LIVE_GENX_MODEL_COUNT } from '@/lib/provider-capability-governance'[39m
[31m+ import type { ProviderCapability } from '@/lib/provider-mesh'[39m
[31m+ import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'[39m
[31m+[39m
[31m+ export interface GenXRuntimeStatus {[39m
[31m+   configured: boolean[39m
[31m+   available: boolean[39m
[31m+   keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'[39m
[31m+   modelCount: number[39m
[31m+   capabilities: string[][39m
[31m+   apiUrl: string | null[39m
[31m+ }[39m
[31m+[39m
[31m+ export type ProviderStatus =[39m
[31m+   | 'configured_wired'[39m
[31m+   | 'configured_not_wired'[39m
[31m+   | 'not_configured_optional'[39m
[31m+   | 'covered_by_genx'[39m
[31m+   | 'blocked'[39m
[31m+[39m
[31m+ export interface ProviderRuntimeEntry {[39m
[31m+   key: string[39m
[31m+   displayName: string[39m
[31m+   reason: string[39m
[31m+   configured: boolean[39m
[31m+   connected?: boolean[39m
[31m+   coveredByGenX: boolean[39m
[31m+   keySource: 'vault' | 'ai_provider' | 'legacy_github' | 'env' | 'missing'[39m
[31m+   status: ProviderStatus[39m
[31m+   governanceStatus?: string[39m
[31m+   showInPrimarySetup?: boolean[39m
[31m+   defaultCostRole?: string[39m
[31m+   capabilities?: string[][39m
[31m+ }[39m
[31m+[39m
[31m+ export type CapabilityStatus = 'available' | 'blocked' | 'not_implemented'[39m
[31m+[39m
[31m+ export interface CapabilityRuntimeEntry {[39m
[31m+   name: string[39m
[31m+   status: CapabilityStatus[39m
[31m+   blocker: string | null[39m
[31m+   models: string[][39m
[31m+   nextAction: string | null[39m
[31m+ }[39m
[31m+[39m
[31m+ export interface LocalCoreStatus {[39m
[31m+   memory: { writable: boolean; driver: string; file: string }[39m
[31m+   approvals: { writable: boolean; driver: string; file: string }[39m
[31m+   artifacts: { writable: boolean; driver: string; file: string }[39m
[31m+   research: { writable: boolean; driver: string; file: string }[39m
[31m+   apps: { writable: boolean; driver: string; file: string; count: number }[39m
[31m+   agents: { writable: boolean; driver: string; file: string; count: number }[39m
[31m+   allWorking: boolean[39m
[31m+ }[39m
[31m+[39m
[31m+ export type AdultCapabilityGateStatus =[39m
[31m+   | 'ready'[39m
[31m+   | 'configured_with_last_error'[39m
[31m+   | 'needs_provider_test'[39m
[31m+   | 'provider_failed'[39m
[31m+   | 'app_permission_disabled'[39m
[31m+   | 'global_flag_disabled'[39m
[31m+   | 'not_wired'[39m
[31m+[39m
[31m+ export interface AdultCapabilityGate {[39m
[31m+   status: AdultCapabilityGateStatus[39m
[31m+   blocker: string | null[39m
[31m+   providerAvailable: boolean[39m
[31m+   testPassed: boolean[39m
[31m+   globalEnabled: boolean[39m
[31m+   enabled: boolean[39m
[31m+   selectedProvider: string | null[39m
[31m+   selectedModel: string | null[39m
[31m+   allowedCategories: string[][39m
[31m+   blockedCategories: string[][39m
[31m+   lastTestStatus: string | null[39m
[31m+   lastError: string | null[39m
[31m+   configuredProviders: string[][39m
[31m+ }[39m
[31m+[39m
[31m+ export interface DashboardRuntimeTruth {[39m
[31m+   success: true[39m
[31m+   genx: GenXRuntimeStatus[39m
[31m+   providers: ProviderRuntimeEntry[][39m
[31m+   capabilities: CapabilityRuntimeEntry[][39m
[31m+   adultGate: AdultCapabilityGate[39m
[31m+   blockers: string[][39m
[31m+   localCore: LocalCoreStatus[39m
[31m+ }[39m
[31m+[39m
[31m+ function getLocalCoreStatus(): LocalCoreStatus {[39m
[31m+   const memory = checkWritable(LOCAL_STORE_FILES.memory)[39m
[31m+   const approvals = checkWritable(LOCAL_STORE_FILES.approvals)[39m
[31m+   const artifacts = checkWritable(LOCAL_STORE_FILES.artifacts)[39m
[31m+   const research = checkWritable(LOCAL_STORE_FILES.research)[39m
[31m+   const apps = checkWritable(LOCAL_STORE_FILES.apps)[39m
[31m+   const agents = checkWritable(LOCAL_STORE_FILES.agents)[39m
[31m+   interface WithId { id: string }[39m
[31m+   return {[39m
[31m+     memory: { writable: memory.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.memory },[39m
[31m+     approvals: { writable: approvals.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.approvals },[39m
[31m+     artifacts: { writable: artifacts.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.artifacts },[39m
[31m+     research: { writable: research.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.research },[39m
[31m+     apps: { writable: apps.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.apps, count: listRecords<WithId>(LOCAL_STORE_FILES.apps).length },[39m
[31m+     agents: { writable: agents.writable, driver: 'local_vps', file: LOCAL_STORE_FILES.agents, count: listRecords<WithId>(LOCAL_STORE_FILES.agents).length },[39m
[31m+     allWorking: memory.writable && approvals.writable && artifacts.writable && research.writable && apps.writable && agents.writable,[39m
[31m+   }[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function getRuntimeProviderStatus(): Promise<ProviderRuntimeEntry[]> {[39m
[31m+   const truth = await getPlatformSettingsTruth()[39m
[31m+   return Promise.all(truth.entries.map(async (entry) => {[39m
[31m+     const source = entry.kind === 'provider'[39m
[31m+       ? (await getProviderKeyWithSource(entry.key)).source[39m
[31m+       : entry.configured ? 'env' as const : 'missing' as const[39m
[31m+     return {[39m
[31m+       key: entry.key,[39m
[31m+       displayName: entry.label,[39m
[31m+       reason: entry.connected ? 'Live test passed.' : entry.blocker,[39m
[31m+       configured: entry.configured,[39m
[31m+       connected: entry.connected,[39m
[31m+       coveredByGenX: false,[39m
[31m+       keySource: source,[39m
[31m+       status: entry.connected[39m
[31m+         ? 'configured_wired' as const[39m
[31m+         : entry.configured[39m
[31m+           ? 'configured_not_wired' as const[39m
[31m+           : entry.optional[39m
[31m+             ? 'not_configured_optional' as const[39m
[31m+             : 'blocked' as const,[39m
[31m+       governanceStatus: 'approved',[39m
[31m+       showInPrimarySetup: entry.kind === 'provider',[39m
[31m+       defaultCostRole: entry.key === 'genx' ? 'primary' : 'specialist',[39m
[31m+       capabilities: entry.capabilities,[39m
[31m+     }[39m
[31m+   }))[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function getFallbackProviderStatus(): Promise<ProviderRuntimeEntry[]> {[39m
[31m+   return getRuntimeProviderStatus()[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function getGenXRuntimeStatus(): Promise<GenXRuntimeStatus> {[39m
[31m+   const providers = await getRuntimeProviderStatus()[39m
[31m+   const genx = providers.find((provider) => provider.key === 'genx')[39m
[31m+   return {[39m
[31m+     configured: Boolean(genx?.configured),[39m
[31m+     available: Boolean(genx?.connected),[39m
[31m+     keySource: genx?.keySource ?? 'missing',[39m
[31m+     modelCount: genx?.connected ? LIVE_GENX_MODEL_COUNT : 0,[39m
[31m+     capabilities: genx?.connected ? genx.capabilities ?? [] : [],[39m
[31m+     apiUrl: genx?.configured ? process.env.GENX_BASE_URL ?? process.env.GENX_API_URL ?? 'https://query.genx.sh' : null,[39m
[31m+   }[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function getAdultCapabilityGate(providers: ProviderRuntimeEntry[]): Promise<AdultCapabilityGate> {[39m
[31m+   const adultRoutes = [[39m
[31m+     MEDIA_CAPABILITY_ROUTES.adult_text,[39m
[31m+     MEDIA_CAPABILITY_ROUTES.adult_image,[39m
[31m+     MEDIA_CAPABILITY_ROUTES.adult_video,[39m
[31m+     MEDIA_CAPABILITY_ROUTES.adult_voice,[39m
[31m+   ][39m
[31m+   const compatibleProviderIds = new Set(adultRoutes.flatMap((route) => route.providers.map((entry) => entry.provider)))[39m
[31m+   const approved = providers.filter((provider) => provider.connected && compatibleProviderIds.has(provider.key as never))[39m
[31m+   const lastTestStatus = await getServiceConfigField('adult_mode', 'lastTestStatus', '').catch(() => null) ?? ''[39m
[31m+   const lastError = await getServiceConfigField('adult_mode', 'lastError', '').catch(() => null) ?? ''[39m
[31m+   const selectedProvider = approved[0]?.key ?? null[39m
[31m+   const providerAvailable = approved.length > 0[39m
[31m+   const selectedModel = selectedProvider[39m
[31m+     ? adultRoutes.flatMap((route) => route.providers).find((entry) => entry.provider === selectedProvider)?.model ?? null[39m
[31m+     : null[39m
[31m+   return {[39m
[31m+     status: providerAvailable ? 'ready' : 'not_wired',[39m
[31m+     blocker: providerAvailable ? null : 'No connected provider/model route can create and persist adult text, image, video, or voice output.',[39m
[31m+     providerAvailable,[39m
[31m+     testPassed: providerAvailable,[39m
[31m+     globalEnabled: true,[39m
[31m+     enabled: true,[39m
[31m+     selectedProvider,[39m
[31m+     selectedModel,[39m
[31m+     allowedCategories: ['legal_adult_text', 'legal_adult_image', 'legal_adult_video', 'legal_adult_voice'],[39m
[31m+     blockedCategories: ['minors', 'age_ambiguous', 'non_consensual', 'real_person_sexual_deepfakes', 'illegal_content'],[39m
[31m+     lastTestStatus: lastTestStatus || null,[39m
[31m+     lastError: lastError || null,[39m
[31m+     configuredProviders: approved.map((provider) => provider.key),[39m
[31m+   }[39m
[31m+ }[39m
[31m+[39m
[31m+ const CAPABILITY_ROWS: Array<{ name: string; capabilities: ProviderCapability[] }> = [[39m
[31m+   { name: 'Text / Chat', capabilities: ['text'] },[39m
[31m+   { name: 'Coding Agent', capabilities: ['code'] },[39m
[31m+   { name: 'Image Generation', capabilities: ['image'] },[39m
[31m+   { name: 'Video Generation', capabilities: ['video'] },[39m
[31m+   { name: 'Voice TTS', capabilities: ['tts'] },[39m
[31m+   { name: 'STT / Transcription', capabilities: ['stt'] },[39m
[31m+   { name: 'Music Generation', capabilities: ['music'] },[39m
[31m+   { name: 'Embeddings', capabilities: ['embeddings'] },[39m
[31m+   { name: 'Web Crawler / Research', capabilities: ['crawl'] },[39m
[31m+   { name: 'Repo / GitHub', capabilities: ['repo'] },[39m
[31m+ ][39m
[31m+[39m
[31m+ export async function getCapabilityStatus([39m
[31m+   _genxConfigured: boolean,[39m
[31m+   providers: ProviderRuntimeEntry[],[39m
[31m+ ): Promise<CapabilityRuntimeEntry[]> {[39m
[31m+   return CAPABILITY_ROWS.map((row) => {[39m
[31m+     const connected = providers.filter((provider) =>[39m
[31m+       provider.connected && row.capabilities.some((capability) => provider.capabilities?.includes(capability)),[39m
[31m+     )[39m
[31m+     return {[39m
[31m+       name: row.name,[39m
[31m+       status: connected.length ? 'available' as const : 'blocked' as const,[39m
[31m+       blocker: connected.length ? null : `No tested approved connection provides ${row.capabilities.join(' or ')}.`,[39m
[31m+       models: connected.map((provider) => provider.displayName),[39m
[31m+       nextAction: connected.length ? null : 'Add the required key or local tool in Settings, then run its live test.',[39m
[31m+     }[39m
[31m+   })[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function getModelCatalogueStatus(): Promise<{ modelCount: number; source: 'live' | 'static' }> {[39m
[31m+   const genx = await getGenXRuntimeStatus()[39m
[31m+   return { modelCount: genx.modelCount, source: genx.available ? 'live' : 'static' }[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function getDashboardRuntimeTruth(): Promise<DashboardRuntimeTruth> {[39m
[31m+   const providers = await getRuntimeProviderStatus()[39m
[31m+   const genxProvider = providers.find((provider) => provider.key === 'genx')[39m
[31m+   const genx: GenXRuntimeStatus = {[39m
[31m+     configured: Boolean(genxProvider?.configured),[39m
[31m+     available: Boolean(genxProvider?.connected),[39m
[31m+     keySource: genxProvider?.keySource ?? 'missing',[39m
[31m+     modelCount: genxProvider?.connected ? LIVE_GENX_MODEL_COUNT : 0,[39m
[31m+     capabilities: genxProvider?.connected ? genxProvider.capabilities ?? [] : [],[39m
[31m+     apiUrl: genxProvider?.configured ? process.env.GENX_BASE_URL ?? process.env.GENX_API_URL ?? 'https://query.genx.sh' : null,[39m
[31m+   }[39m
[31m+   const [capabilities, adultGate] = await Promise.all([[39m
[31m+     getCapabilityStatus(genx.configured, providers),[39m
[31m+     getAdultCapabilityGate(providers),[39m
[31m+   ])[39m
[31m+   const blockers = [[39m
[31m+     ...providers.filter((provider) => provider.status === 'blocked').map((provider) => `${provider.displayName}: ${provider.reason}`),[39m
[31m+     ...capabilities.filter((capability) => capability.status === 'blocked' && capability.blocker).map((capability) => `${capability.name}: ${capability.blocker}`),[39m
[31m+   ][39m
[31m+   return {[39m
[31m+     success: true,[39m
[31m+     genx,[39m
[31m+     providers,[39m
[31m+     capabilities,[39m
[31m+     adultGate,[39m
[31m+     blockers,[39m
[31m+     localCore: getLocalCoreStatus(),[39m
[31m+   }[39m
[31m+ }[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/phase1-platform-truth-stabilization.test.ts:[2m128:26[22m[39m
    [90m126|[39m     expect(normalizeAdultPolicy('full_adult')).toBe('full_adult_app_mo…
    [90m127|[39m     [35mconst[39m runtimeTruth [33m=[39m [34mread[39m([32m'lib/runtime-capability-truth.ts'[39m)
    [90m128|[39m     expect(runtimeTruth).toContain('No approved adult-capable provider…
    [90m   |[39m                          [31m^[39m
    [90m129|[39m     [34mexpect[39m(runtimeTruth)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'ADULT_MODE_ENABLED=true'[39m)
    [90m130|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/phase2-real-studio-workbench.test.ts[2m > [22mPhase 2 real Studio and Workbench wiring[2m > [22mkeeps the dashboard to the seven final sections only
[31m[1mAssertionError[22m: expected [ 'Home', 'Playground', …(5) ] to deeply equal [ 'Overview', 'Command', …(5) ][39m

[32m- Expected[39m
[31m+ Received[39m

[2m  [[22m
[32m-   "Overview",[39m
[32m-   "Command",[39m
[32m-   "Network Apps",[39m
[31m+   "Home",[39m
[31m+   "Playground",[39m
[31m+   "Repo Workbench",[39m
[31m+   "App Builder",[39m
[2m    "Outputs",[22m
[32m-   "Memory",[39m
[32m-   "Settings",[39m
[32m-   "System",[39m
[31m+   "Connected Apps",[39m
[31m+   "Control Center",[39m
[2m  ][22m

[36m [2m❯[22m src/lib/__tests__/phase2-real-studio-workbench.test.ts:[2m20:59[22m[39m
    [90m 18|[39m
    [90m 19|[39m   [34mit[39m([32m'keeps the dashboard to the seven final sections only'[39m[33m,[39m () [33m=>[39m {
    [90m 20|[39m     [34mexpect[39m([33mDASHBOARD_NAV_ITEMS[39m[33m.[39m[34mmap[39m((item) [33m=>[39m item[33m.[39mlabel))[33m.[39m[34mtoEqual[39m([
    [90m   |[39m                                                           [31m^[39m
    [90m 21|[39m       [32m'Overview'[39m[33m,[39m
    [90m 22|[39m       [32m'Command'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/phase2-real-studio-workbench.test.ts[2m > [22mPhase 2 real Studio and Workbench wiring[2m > [22mmaps every Studio tab to the protected route that owns its real execution state
[31m[1mAssertionError[22m: expected 'execute' to be 'missing' // Object.is equality[39m

Expected: [32m"missing"[39m
Received: [31m"execute"[39m

[36m [2m❯[22m src/lib/__tests__/phase2-real-studio-workbench.test.ts:[2m63:63[22m[39m
    [90m 61|[39m     expect(STUDIO_ROUTE_MAP['STT / Transcription'].route).toBe('/api/a…
    [90m 62|[39m     expect(STUDIO_ROUTE_MAP.Artifacts.route).toBe('/api/admin/artifact…
    [90m 63|[39m     expect(STUDIO_ROUTE_MAP['Avatar / Talking Video'].status).toBe('mi…
    [90m   |[39m                                                               [31m^[39m
    [90m 64|[39m   })
    [90m 65|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/phase2-real-studio-workbench.test.ts[2m > [22mPhase 2 real Studio and Workbench wiring[2m > [22mnon-GenX streaming still returns an honest pending status instead of fake output
[31m[1mAssertionError[22m: expected 'import { NextRequest } from \'next/se…' to contain 'Selected provider streaming pending'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- Selected provider streaming pending[39m
[31m+ import { NextRequest } from 'next/server'[39m
[31m+ import { POST as chatPOST } from '../chat/route'[39m
[31m+[39m
[31m+ export const dynamic = 'force-dynamic'[39m
[31m+ export const runtime = 'nodejs'[39m
[31m+[39m
[31m+ type StreamPayload = Record<string, unknown>[39m
[31m+[39m
[31m+ function encodeSse(payload: StreamPayload | '[DONE]') {[39m
[31m+   if (payload === '[DONE]') return `data: [DONE]\n\n`[39m
[31m+   return `data: ${JSON.stringify(payload)}\n\n`[39m
[31m+ }[39m
[31m+[39m
[31m+ function extractOutput(payload: Record<string, unknown>) {[39m
[31m+   return String([39m
[31m+     payload.output ??[39m
[31m+       payload.message ??[39m
[31m+       payload.response ??[39m
[31m+       payload.text ??[39m
[31m+       payload.content ??[39m
[31m+       '',[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ export async function POST(req: NextRequest) {[39m
[31m+   const encoder = new TextEncoder()[39m
[31m+[39m
[31m+   const stream = new ReadableStream<Uint8Array>({[39m
[31m+     async start(controller) {[39m
[31m+       const send = (payload: StreamPayload | '[DONE]') => {[39m
[31m+         controller.enqueue(encoder.encode(encodeSse(payload)))[39m
[31m+       }[39m
[31m+[39m
[31m+       try {[39m
[31m+         send({[39m
[31m+           status: 'Routing',[39m
[31m+           message: 'Routing through AI Brain assistant chat execution.',[39m
[31m+         })[39m
[31m+[39m
[31m+         const chatResponse = await chatPOST(req)[39m
[31m+[39m
[31m+         let payload: Record<string, unknown>[39m
[31m+         try {[39m
[31m+           payload = (await chatResponse.json()) as Record<string, unknown>[39m
[31m+         } catch {[39m
[31m+           payload = {[39m
[31m+             success: false,[39m
[31m+             error: `Assistant chat route returned non-JSON response with HTTP ${chatResponse.status}.`,[39m
[31m+           }[39m
[31m+         }[39m
[31m+[39m
[31m+         if (!chatResponse.ok || payload.success === false) {[39m
[31m+           send({[39m
[31m+             status: 'Error',[39m
[31m+             success: false,[39m
[31m+             error:[39m
[31m+               payload.error ??[39m
[31m+               `Assistant chat route failed with HTTP ${chatResponse.status}.`,[39m
[31m+             blocker: payload.blocker ?? null,[39m
[31m+             provider: payload.provider ?? null,[39m
[31m+             model: payload.model ?? null,[39m
[31m+             route: payload.route ?? null,[39m
[31m+           })[39m
[31m+           send('[DONE]')[39m
[31m+           controller.close()[39m
[31m+           return[39m
[31m+         }[39m
[31m+[39m
[31m+         const output = extractOutput(payload)[39m
[31m+[39m
[31m+         send({[39m
[31m+           status: 'Answer',[39m
[31m+           type: 'message',[39m
[31m+           success: true,[39m
[31m+           provider: payload.provider ?? null,[39m
[31m+           model: payload.model ?? null,[39m
[31m+           capability: payload.capability ?? 'chat',[39m
[31m+           route: payload.route ?? null,[39m
[31m+[39m
[31m+           // Multiple keys are intentional because existing dashboard parsers[39m
[31m+           // may read text, delta, content, message, or output.[39m
[31m+           text: output,[39m
[31m+           delta: output,[39m
[31m+           content: output,[39m
[31m+           message: output,[39m
[31m+           output,[39m
[31m+         })[39m
[31m+[39m
[31m+         send({[39m
[31m+           status: 'Done',[39m
[31m+           success: true,[39m
[31m+           provider: payload.provider ?? null,[39m
[31m+           model: payload.model ?? null,[39m
[31m+         })[39m
[31m+[39m
[31m+         send('[DONE]')[39m
[31m+         controller.close()[39m
[31m+       } catch (err) {[39m
[31m+         send({[39m
[31m+           status: 'Error',[39m
[31m+           success: false,[39m
[31m+           error:[39m
[31m+             err instanceof Error[39m
[31m+               ? err.message[39m
[31m+               : 'Assistant stream route failed.',[39m
[31m+         })[39m
[31m+         send('[DONE]')[39m
[31m+         controller.close()[39m
[31m+       }[39m
[31m+     },[39m
[31m+   })[39m
[31m+[39m
[31m+   return new Response(stream, {[39m
[31m+     status: 200,[39m
[31m+     headers: {[39m
[31m+       'Content-Type': 'text/event-stream; charset=utf-8',[39m
[31m+       'Cache-Control': 'no-cache, no-transform',[39m
[31m+       Connection: 'keep-alive',[39m
[31m+       'X-Accel-Buffering': 'no',[39m
[31m+     },[39m
[31m+   })[39m
[31m+ }[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/phase2-real-studio-workbench.test.ts:[2m99:25[22m[39m
    [90m 97|[39m   it('non-GenX streaming still returns an honest pending status instea…
    [90m 98|[39m     const streamRoute = read('app/api/admin/amarktai-assistant/stream/…
    [90m 99|[39m     expect(streamRoute).toContain('Selected provider streaming pending…
    [90m   |[39m                         [31m^[39m
    [90m100|[39m     [34mexpect[39m(streamRoute)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'Simulated'[39m)
    [90m101|[39m     [34mexpect[39m(streamRoute)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'fake'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/platform-expansion.test.ts[2m > [22mModel Registry — Music category[2m > [22mincludes suno-v3.5, musicgen-melody, udio-v1
[31m[1mAssertionError[22m: expected 0 to be greater than or equal to 3[39m
[36m [2m❯[22m src/lib/__tests__/platform-expansion.test.ts:[2m358:32[22m[39m
    [90m356|[39m     [35mconst[39m all [33m=[39m [34mgetModelRegistry[39m()
    [90m357|[39m     [35mconst[39m musicModels [33m=[39m all[33m.[39m[34mfilter[39m((m) [33m=>[39m m[33m.[39mcategory [33m===[39m [32m'music'[39m)
    [90m358|[39m     [34mexpect[39m(musicModels[33m.[39mlength)[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m3[39m)
    [90m   |[39m                                [31m^[39m
    [90m359|[39m     [35mconst[39m ids [33m=[39m musicModels[33m.[39m[34mmap[39m((m) [33m=>[39m m[33m.[39mmodel_id)
    [90m360|[39m     [34mexpect[39m(ids)[33m.[39m[34mtoContain[39m([32m'suno-v3.5'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-capability-governance.test.ts[2m > [22mprovider capability governance[2m > [22mdefines the root admin workspace and keeps Add App external-only
[31m[1mAssertionError[22m: expected { appSlug: 'amarktai-network', …(12) } to match object { appSlug: 'amarktai-network', …(6) }
(6 matching properties omitted from actual)[39m

[32m- Expected[39m
[31m+ Received[39m

[2m  {[22m
[2m    "access": "full",[22m
[32m-   "agents": "all_internal_agents",[39m
[31m+   "agents": "backend_orchestration_only",[39m
[2m    "appSlug": "amarktai-network",[22m
[32m-   "models": "all_valid_configured_models",[39m
[32m-   "providers": "all_configured_providers",[39m
[32m-   "tools": "all_configured_tools",[39m
[31m+   "models": "approved_configured_models",[39m
[31m+   "providers": "approved_configured_providers",[39m
[31m+   "tools": "approved_configured_tools",[39m
[2m    "type": "root_admin_app",[22m
[2m  }[22m

[36m [2m❯[22m src/lib/__tests__/provider-capability-governance.test.ts:[2m25:28[22m[39m
    [90m 23|[39m [34mdescribe[39m([32m'provider capability governance'[39m[33m,[39m () [33m=>[39m {
    [90m 24|[39m   it('defines the root admin workspace and keeps Add App external-only…
    [90m 25|[39m     [34mexpect[39m([33mROOT_WORKSPACE[39m)[33m.[39m[34mtoMatchObject[39m({
    [90m   |[39m                            [31m^[39m
    [90m 26|[39m       appSlug[33m:[39m [32m'amarktai-network'[39m[33m,[39m
    [90m 27|[39m       type[33m:[39m [32m'root_admin_app'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-capability-governance.test.ts[2m > [22mprovider capability governance[2m > [22mpins the GenX 58 model catalog and fixes Seedance 2 naming drift
[31m[1mAssertionError[22m: expected [ { provider: 'genx', …(13) }, …(7) ] to have a length of 58 but got 8[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 58[39m
[31m+ 8[39m

[36m [2m❯[22m src/lib/__tests__/provider-capability-governance.test.ts:[2m43:24[22m[39m
    [90m 41|[39m     const genxModels = GOVERNED_MODELS.filter((model) => model.provide…
    [90m 42|[39m     [34mexpect[39m([33mLIVE_GENX_MODEL_COUNT[39m)[33m.[39m[34mtoBe[39m([34m58[39m)
    [90m 43|[39m     [34mexpect[39m(genxModels)[33m.[39m[34mtoHaveLength[39m([34m58[39m)
    [90m   |[39m                        [31m^[39m
    [90m 44|[39m     expect(genxModels.map((model) => model.modelId)).toContain('seedan…
    [90m 45|[39m     expect(genxModels.map((model) => model.modelId)).toContain('seedan…

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-capability-governance.test.ts[2m > [22mprovider capability governance[2m > [22mclassifies Lyria as music and routes Studio music through music_generation, not voice_tts
[31m[1mAssertionError[22m: expected [ 'lyria-3-pro-preview' ] to deeply equal ArrayContaining{…}[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- ArrayContaining [[39m
[32m-   "lyria-3-clip-preview",[39m
[31m+ [[39m
[2m    "lyria-3-pro-preview",[22m
[2m  ][22m

[36m [2m❯[22m src/lib/__tests__/provider-capability-governance.test.ts:[2m52:55[22m[39m
    [90m 50|[39m   it('classifies Lyria as music and routes Studio music through music_…
    [90m 51|[39m     [35mconst[39m musicModels [33m=[39m [34mgetModelsForCapability[39m([32m'music_generation'[39m)
    [90m 52|[39m     expect(musicModels.map((model) => model.modelId)).toEqual(expect.a…
    [90m   |[39m                                                       [31m^[39m
    [90m 53|[39m     expect(musicModels.every((model) => model.capabilities.includes('m…
    [90m 54|[39m     [34mexpect[39m([34mgetCapabilityGovernance[39m([32m'music_generation'[39m))[33m.[39m[34mtoMatchObject[39m({

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-capability-governance.test.ts[2m > [22mprovider capability governance[2m > [22mfilters Workbench to coding/reasoning models and rejects media mismatches
[31m[1mAssertionError[22m: expected [ 'missing_route' ] to include 'model_capability_mismatch'[39m
[36m [2m❯[22m src/lib/__tests__/provider-capability-governance.test.ts:[2m73:30[22m[39m
    [90m 71|[39m     const invalid = validateCapabilitySelection({ provider: 'genx', mo…
    [90m 72|[39m     [34mexpect[39m(invalid[33m.[39mallowed)[33m.[39m[34mtoBe[39m([35mfalse[39m)
    [90m 73|[39m     [34mexpect[39m(invalid[33m.[39mblockers)[33m.[39m[34mtoContain[39m([32m'model_capability_mismatch'[39m)
    [90m   |[39m                              [31m^[39m
    [90m 74|[39m   })
    [90m 75|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-capability-governance.test.ts[2m > [22mprovider capability governance[2m > [22mrejects invalid manual model/capability combinations in live routing
[31m[1mAssertionError[22m: expected 'No approved wired model supports this…' to contain 'does not support'[39m

Expected: [32m"does not support"[39m
Received: [31m"No approved wired model supports this capability."[39m

[36m [2m❯[22m src/lib/__tests__/provider-capability-governance.test.ts:[2m78:42[22m[39m
    [90m 76|[39m   it('rejects invalid manual model/capability combinations in live rou…
    [90m 77|[39m     const imageForCoding = routeLiveModel({ capability: 'coding', sele…
    [90m 78|[39m     [34mexpect[39m(imageForCoding[33m.[39mblockedReason)[33m.[39m[34mtoContain[39m([32m'does not support'[39m)
    [90m   |[39m                                          [31m^[39m
    [90m 79|[39m
    [90m 80|[39m     const textForImage = routeLiveModel({ capability: 'image_generatio…

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[30/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-capability-governance.test.ts[2m > [22mprovider capability governance[2m > [22mkeeps voice truth, underused provider truth, and adult governance explicit
[31m[1mAssertionError[22m: expected [] to deeply equal ArrayContaining{…}[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- ArrayContaining [[39m
[32m-   "qwen:qwen-tts-latest",[39m
[32m-   "qwen:qwen-voice-clone",[39m
[32m-   "minimax:minimax-music",[39m
[32m-   "minimax:minimax-voice-clone",[39m
[32m- ][39m
[31m+ [][39m

[36m [2m❯[22m src/lib/__tests__/provider-capability-governance.test.ts:[2m89:95[22m[39m
    [90m 87|[39m   it('keeps voice truth, underused provider truth, and adult governanc…
    [90m 88|[39m     [35mconst[39m matrix [33m=[39m [34mgetCapabilityGovernanceMatrix[39m()
    [90m 89|[39m     expect(matrix.underusedCapabilities.map((model) => `${model.provid…
    [90m   |[39m                                                                                               [31m^[39m
    [90m 90|[39m       [32m'qwen:qwen-tts-latest'[39m[33m,[39m
    [90m 91|[39m       [32m'qwen:qwen-voice-clone'[39m[33m,[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[31/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-capability-governance.test.ts[2m > [22mprovider capability governance[2m > [22msurfaces governance truth in Settings, Operations, and model catalog routes
[31m[1mAssertionError[22m: expected '\'use client\'\n\nimport { useCallbac…' to contain 'Capability governance matrix'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- Capability governance matrix[39m
[31m+ 'use client'[39m
[31m+[39m
[31m+ import { useCallback, useEffect, useState } from 'react'[39m
[31m+ import { CheckCircle2, Eye, EyeOff, Loader2, Save, TestTube2 } from 'lucide-react'[39m
[31m+ import type { SettingsTruthEntry } from '@/lib/platform-settings-truth'[39m
[31m+[39m
[31m+ type SettingsTruth = {[39m
[31m+   entries: SettingsTruthEntry[][39m
[31m+   connectedCount: number[39m
[31m+ }[39m
[31m+[39m
[31m+ export default function SettingsPage() {[39m
[31m+   const [truth, setTruth] = useState<SettingsTruth | null>(null)[39m
[31m+   const [loading, setLoading] = useState(true)[39m
[31m+[39m
[31m+   const refresh = useCallback(async () => {[39m
[31m+     setLoading(true)[39m
[31m+     const response = await fetch('/api/admin/settings/status', { cache: 'no-store' })[39m
[31m+     const data = await response.json().catch(() => ({}))[39m
[31m+     setTruth(response.ok ? data.truth ?? null : null)[39m
[31m+     setLoading(false)[39m
[31m+   }, [])[39m
[31m+[39m
[31m+   useEffect(() => { void refresh() }, [refresh])[39m
[31m+[39m
[31m+   return ([39m
[31m+     <div className="space-y-5">[39m
[31m+       <section className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(135deg,rgba(8,20,34,.96),rgba(4,9,18,.92))] p-6 lg:p-8">[39m
[31m+         <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Settings</p>[39m
[31m+         <h1 className="mt-2 text-3xl font-black text-white">Connect capabilities once.</h1>[39m
[31m+         <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">[39m
[31m+           Add a key, save it, then run a live test. A connection turns green only after the provider or local service responds successfully.[39m
[31m+         </p>[39m
[31m+         <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs font-bold text-slate-300">[39m
[31m+           {loading ? <Loader2 className="h-4 w-4 animate-spin text-cyan-300" /> : <CheckCircle2 className="h-4 w-4 text-emerald-300" />}[39m
[31m+           {truth?.connectedCount ?? 0} live connections[39m
[31m+         </div>[39m
[31m+       </section>[39m
[31m+[39m
[31m+       <section className="grid gap-4 lg:grid-cols-2">[39m
[31m+         {(truth?.entries ?? []).map((entry) => ([39m
[31m+           <ConnectionCard key={entry.key} entry={entry} refresh={refresh} />[39m
[31m+         ))}[39m
[31m+       </section>[39m
[31m+     </div>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ function ConnectionCard({ entry, refresh }: { entry: SettingsTruthEntry; refresh: () => Promise<void> }) {[39m
[31m+   const [value, setValue] = useState('')[39m
[31m+   const [show, setShow] = useState(false)[39m
[31m+   const [busy, setBusy] = useState<'save' | 'test' | null>(null)[39m
[31m+   const [message, setMessage] = useState('')[39m
[31m+[39m
[31m+   async function save() {[39m
[31m+     if (!value.trim()) return[39m
[31m+     setBusy('save')[39m
[31m+     setMessage('')[39m
[31m+     const response = await fetch('/api/admin/settings/key', {[39m
[31m+       method: 'POST',[39m
[31m+       headers: { 'Content-Type': 'application/json' },[39m
[31m+       body: JSON.stringify({[39m
[31m+         key: entry.key,[39m
[31m+         type: entry.kind === 'provider' ? 'provider' : 'tool',[39m
[31m+         label: entry.label,[39m
[31m+         value: value.trim(),[39m
[31m+       }),[39m
[31m+     })[39m
[31m+     const data = await response.json().catch(() => ({}))[39m
[31m+     setMessage(response.ok ? `Saved ${data.masked ?? ''}. Run the live test.` : data.error ?? 'Save failed.')[39m
[31m+     if (response.ok) {[39m
[31m+       setValue('')[39m
[31m+       await refresh()[39m
[31m+     }[39m
[31m+     setBusy(null)[39m
[31m+   }[39m
[31m+[39m
[31m+   async function test() {[39m
[31m+     setBusy('test')[39m
[31m+     setMessage('')[39m
[31m+     const response = await fetch(entry.testRoute, {[39m
[31m+       method: 'POST',[39m
[31m+       headers: { 'Content-Type': 'application/json' },[39m
[31m+       body: JSON.stringify({ key: entry.key }),[39m
[31m+     })[39m
[31m+     const data = await response.json().catch(() => ({}))[39m
[31m+     setMessage(data.success ? data.detail || 'Live test passed.' : data.error || 'Live test failed.')[39m
[31m+     await refresh()[39m
[31m+     setBusy(null)[39m
[31m+   }[39m
[31m+[39m
[31m+   const statusStyle = entry.connected[39m
[31m+     ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'[39m
[31m+     : entry.status === 'Failed'[39m
[31m+       ? 'border-red-400/25 bg-red-400/10 text-red-300'[39m
[31m+       : 'border-amber-400/25 bg-amber-400/10 text-amber-300'[39m
[31m+[39m
[31m+   return ([39m
[31m+     <article className="rounded-2xl border border-slate-700/50 bg-slate-900/65 p-5">[39m
[31m+       <div className="flex items-start justify-between gap-4">[39m
[31m+         <div>[39m
[31m+           <h2 className="font-black text-white">{entry.label}</h2>[39m
[31m+           <p className="mt-1 text-xs leading-5 text-slate-400">[39m
[31m+             {entry.optional ? 'Optional connection.' : 'Platform connection.'} Unlocks {entry.unlocks}.[39m
[31m+           </p>[39m
[31m+         </div>[39m
[31m+         <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black ${statusStyle}`}>{entry.status}</span>[39m
[31m+       </div>[39m
[31m+[39m
[31m+       <div className="mt-4 flex flex-wrap gap-1.5">[39m
[31m+         {entry.capabilities.map((capability) => ([39m
[31m+           <span key={capability} className="rounded-full border border-slate-700 bg-slate-950/50 px-2 py-1 text-[10px] font-bold text-slate-400">[39m
[31m+             {capability.replaceAll('_', ' ')}[39m
[31m+           </span>[39m
[31m+         ))}[39m
[31m+       </div>[39m
[31m+[39m
[31m+       {entry.requiresSecret && ([39m
[31m+         <div className="mt-4 flex gap-2">[39m
[31m+           <div className="relative flex-1">[39m
[31m+             <input[39m
[31m+               value={value}[39m
[31m+               onChange={(event) => setValue(event.target.value)}[39m
[31m+               type={show ? 'text' : 'password'}[39m
[31m+               autoComplete="new-password"[39m
[31m+               placeholder={entry.envVars.join(' or ')}[39m
[31m+               className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 pr-10 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/50"[39m
[31m+             />[39m
[31m+             <button type="button" onClick={() => setShow((current) => !current)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500" aria-label={show ? 'Hide value' : 'Show value'}>[39m
[31m+               {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}[39m
[31m+             </button>[39m
[31m+           </div>[39m
[31m+           <button onClick={save} disabled={busy !== null || !value.trim()} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-black text-slate-200 disabled:opacity-40">[39m
[31m+             {busy === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save[39m
[31m+           </button>[39m
[31m+         </div>[39m
[31m+       )}[39m
[31m+[39m
[31m+       <div className="mt-4 flex items-center justify-between gap-3">[39m
[31m+         <div className="min-w-0">[39m
[31m+           <p className="text-xs font-bold text-slate-400">{entry.lastTestResult}</p>[39m
[31m+           <p className="mt-1 text-[11px] text-slate-500">{entry.lastTestedAt ? new Date(entry.lastTestedAt).toLocaleString() : entry.blocker}</p>[39m
[31m+           {entry.error && <p className="mt-1 text-xs font-semibold text-red-300">{entry.error}</p>}[39m
[31m+           {message && <p className="mt-1 text-xs font-semibold text-cyan-200">{message}</p>}[39m
[31m+         </div>[39m
[31m+         <button onClick={test} disabled={busy !== null || (!entry.configured && entry.requiresSecret)} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950 disabled:opacity-40">[39m
[31m+           {busy === 'test' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube2 className="h-4 w-4" />} Test[39m
[31m+         </button>[39m
[31m+       </div>[39m
[31m+     </article>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/provider-capability-governance.test.ts:[2m103:59[22m[39m
    [90m101|[39m
    [90m102|[39m   it('surfaces governance truth in Settings, Operations, and model cat…
    [90m103|[39m     expect(read('app/admin/dashboard/settings/page.tsx')).toContain('C…
    [90m   |[39m                                                           [31m^[39m
    [90m104|[39m     expect(read('app/admin/dashboard/operations/page.tsx')).toContain(…
    [90m105|[39m     expect(read('app/api/admin/ai-model-catalog/route.ts')).toContain(…

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[32/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetPrimarySetupProviders()[2m > [22mincludes all required primary providers
[31m[1mAssertionError[22m: Primary providers should include 'github': expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m41:74[22m[39m
    [90m 39|[39m     const required = ['genx', 'github', 'qwen', 'minimax', 'mimo', 'de…
    [90m 40|[39m     [35mfor[39m ([35mconst[39m key [35mof[39m required) {
    [90m 41|[39m       expect(keys.has(key), `Primary providers should include '${key}'…
    [90m   |[39m                                                                          [31m^[39m
    [90m 42|[39m     }
    [90m 43|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[33/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetSpecialistSetupProviders()[2m > [22mincludes replicate, elevenlabs, and deepgram
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m74:35[22m[39m
    [90m 72|[39m   [34mit[39m([32m'includes replicate, elevenlabs, and deepgram'[39m[33m,[39m () [33m=>[39m {
    [90m 73|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m([34mgetSpecialistSetupProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m 74|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'replicate'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                   [31m^[39m
    [90m 75|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'elevenlabs'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m 76|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'deepgram'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[34/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetAdvancedSetupProviders()[2m > [22mkeeps OpenAI hidden and includes advanced routing providers
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m89:36[22m[39m
    [90m 87|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m([34mgetAdvancedSetupProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m 88|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'openai'[39m))[33m.[39m[34mtoBe[39m([35mfalse[39m)
    [90m 89|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'openrouter'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                    [31m^[39m
    [90m 90|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'xai'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m 91|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'moonshot'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[35/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetHiddenProviders()[2m > [22mincludes cohere and mistral as hidden
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m104:32[22m[39m
    [90m102|[39m   [34mit[39m([32m'includes cohere and mistral as hidden'[39m[33m,[39m () [33m=>[39m {
    [90m103|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m([34mgetHiddenProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m104|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'cohere'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                [31m^[39m
    [90m105|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'mistral'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m106|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[36/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetBacklogProviders()[2m > [22mincludes suno and udio from main governance backlog
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m117:30[22m[39m
    [90m115|[39m   [34mit[39m([32m'includes suno and udio from main governance backlog'[39m[33m,[39m () [33m=>[39m {
    [90m116|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m([34mgetBacklogProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m117|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'suno'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                              [31m^[39m
    [90m118|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'udio'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m119|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[37/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetBacklogProviders()[2m > [22mincludes perplexity, tavily, jina from PROPOSED_PROVIDER_BACKLOG
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m123:36[22m[39m
    [90m121|[39m   it('includes perplexity, tavily, jina from PROPOSED_PROVIDER_BACKLOG…
    [90m122|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m([34mgetBacklogProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m123|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'perplexity'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                    [31m^[39m
    [90m124|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'tavily'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m125|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'jina'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[38/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetBacklogProviders()[2m > [22mincludes runpod, fal, fireworks, cerebras from PROPOSED_PROVIDER_BACKLOG
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m130:32[22m[39m
    [90m128|[39m   it('includes runpod, fal, fireworks, cerebras from PROPOSED_PROVIDER…
    [90m129|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m([34mgetBacklogProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m130|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'runpod'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                [31m^[39m
    [90m131|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'fal'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m132|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'fireworks'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[39/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mQwen / DashScope aliases[2m > [22mgetEnvKeyForProvider("qwen") checks QWEN_API_KEY
[31m[1mAssertionError[22m: expected null to be 'test-qwen-key' // Object.is equality[39m

[32m- Expected:[39m
"test-qwen-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m184:17[22m[39m
    [90m182|[39m     process[33m.[39menv[33m.[39m[33mQWEN_API_KEY[39m [33m=[39m [32m'test-qwen-key'[39m
    [90m183|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'qwen'[39m)
    [90m184|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-qwen-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m185|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mQWEN_API_KEY[39m
    [90m186|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[40/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mQwen / DashScope aliases[2m > [22mgetEnvKeyForProvider("dashscope") resolves via DASHSCOPE_API_KEY alias
[31m[1mAssertionError[22m: expected null to be 'test-dashscope-key' // Object.is equality[39m

[32m- Expected:[39m
"test-dashscope-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m191:17[22m[39m
    [90m189|[39m     process[33m.[39menv[33m.[39m[33mDASHSCOPE_API_KEY[39m [33m=[39m [32m'test-dashscope-key'[39m
    [90m190|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'dashscope'[39m)
    [90m191|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-dashscope-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m192|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mDASHSCOPE_API_KEY[39m
    [90m193|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[41/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mMiniMax and Xiaomi MiMo providers[2m > [22mgetEnvKeyForProvider("minimax") checks MINIMAX_API_KEY
[31m[1mAssertionError[22m: expected null to be 'test-minimax-key' // Object.is equality[39m

[32m- Expected:[39m
"test-minimax-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m208:17[22m[39m
    [90m206|[39m     process[33m.[39menv[33m.[39m[33mMINIMAX_API_KEY[39m [33m=[39m [32m'test-minimax-key'[39m
    [90m207|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'minimax'[39m)
    [90m208|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-minimax-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m209|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mMINIMAX_API_KEY[39m
    [90m210|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[42/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mMiniMax and Xiaomi MiMo providers[2m > [22mgetEnvKeyForProvider("mimo") uses MIMO_API_KEY
[31m[1mAssertionError[22m: expected null to be 'test-mimo-key' // Object.is equality[39m

[32m- Expected:[39m
"test-mimo-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m215:17[22m[39m
    [90m213|[39m     process[33m.[39menv[33m.[39m[33mMIMO_API_KEY[39m [33m=[39m [32m'test-mimo-key'[39m
    [90m214|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'mimo'[39m)
    [90m215|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-mimo-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m216|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mMIMO_API_KEY[39m
    [90m217|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[43/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mxAI / Grok aliases[2m > [22mgetIntegrationKey("grok") resolves to "xai"
[31m[1mAssertionError[22m: expected 'grok' to be 'xai' // Object.is equality[39m

Expected: [32m"xai"[39m
Received: [31m"grok"[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m226:39[22m[39m
    [90m224|[39m
    [90m225|[39m   [34mit[39m([32m'getIntegrationKey("grok") resolves to "xai"'[39m[33m,[39m () [33m=>[39m {
    [90m226|[39m     [34mexpect[39m([34mgetIntegrationKey[39m([32m'grok'[39m))[33m.[39m[34mtoBe[39m([32m'xai'[39m)
    [90m   |[39m                                       [31m^[39m
    [90m227|[39m   })
    [90m228|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[44/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mxAI / Grok aliases[2m > [22mgetEnvKeyForProvider("xai") checks XAI_API_KEY
[31m[1mAssertionError[22m: expected null to be 'test-xai-key' // Object.is equality[39m

[32m- Expected:[39m
"test-xai-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m232:17[22m[39m
    [90m230|[39m     process[33m.[39menv[33m.[39m[33mXAI_API_KEY[39m [33m=[39m [32m'test-xai-key'[39m
    [90m231|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'xai'[39m)
    [90m232|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-xai-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m233|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mXAI_API_KEY[39m
    [90m234|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[45/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mxAI / Grok aliases[2m > [22mgetEnvKeyForProvider("grok") resolves via GROK_API_KEY alias
[31m[1mAssertionError[22m: expected null to be 'test-grok-key' // Object.is equality[39m

[32m- Expected:[39m
"test-grok-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m239:17[22m[39m
    [90m237|[39m     process[33m.[39menv[33m.[39m[33mGROK_API_KEY[39m [33m=[39m [32m'test-grok-key'[39m
    [90m238|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'grok'[39m)
    [90m239|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-grok-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m240|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mGROK_API_KEY[39m
    [90m241|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[46/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mHuggingFace / HF aliases[2m > [22mgetEnvKeyForProvider("huggingface") checks HUGGINGFACE_API_KEY
[31m[1mAssertionError[22m: expected null to be 'test-hf-key' // Object.is equality[39m

[32m- Expected:[39m
"test-hf-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m256:17[22m[39m
    [90m254|[39m     process[33m.[39menv[33m.[39m[33mHUGGINGFACE_API_KEY[39m [33m=[39m [32m'test-hf-key'[39m
    [90m255|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'huggingface'[39m)
    [90m256|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-hf-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m257|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mHUGGINGFACE_API_KEY[39m
    [90m258|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[47/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mHuggingFace / HF aliases[2m > [22mgetEnvKeyForProvider("huggingface") also checks HUGGINGFACEHUB_API_TOKEN
[31m[1mAssertionError[22m: expected null to be 'test-hfhub-key' // Object.is equality[39m

[32m- Expected:[39m
"test-hfhub-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m263:17[22m[39m
    [90m261|[39m     process[33m.[39menv[33m.[39m[33mHUGGINGFACEHUB_API_TOKEN[39m [33m=[39m [32m'test-hfhub-key'[39m
    [90m262|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'huggingface'[39m)
    [90m263|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-hfhub-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m264|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mHUGGINGFACEHUB_API_TOKEN[39m
    [90m265|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[48/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mHuggingFace / HF aliases[2m > [22mgetEnvKeyForProvider("huggingface") also checks HF_TOKEN
[31m[1mAssertionError[22m: expected null to be 'test-hf-token' // Object.is equality[39m

[32m- Expected:[39m
"test-hf-token"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m270:17[22m[39m
    [90m268|[39m     process[33m.[39menv[33m.[39m[33mHF_TOKEN[39m [33m=[39m [32m'test-hf-token'[39m
    [90m269|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'huggingface'[39m)
    [90m270|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-hf-token'[39m)
    [90m   |[39m                 [31m^[39m
    [90m271|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mHF_TOKEN[39m
    [90m272|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[49/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mHuggingFace / HF aliases[2m > [22mgetEnvKeyForProvider("hf") resolves via HF_TOKEN alias
[31m[1mAssertionError[22m: expected null to be 'test-hf-token-alias' // Object.is equality[39m

[32m- Expected:[39m
"test-hf-token-alias"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m277:17[22m[39m
    [90m275|[39m     process[33m.[39menv[33m.[39m[33mHF_TOKEN[39m [33m=[39m [32m'test-hf-token-alias'[39m
    [90m276|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'hf'[39m)
    [90m277|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-hf-token-alias'[39m)
    [90m   |[39m                 [31m^[39m
    [90m278|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mHF_TOKEN[39m
    [90m279|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[50/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mReplicate aliases[2m > [22mgetEnvKeyForProvider("replicate") checks REPLICATE_API_TOKEN first
[31m[1mAssertionError[22m: expected null to be 'test-r8-token' // Object.is equality[39m

[32m- Expected:[39m
"test-r8-token"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m286:17[22m[39m
    [90m284|[39m     process[33m.[39menv[33m.[39m[33mREPLICATE_API_TOKEN[39m [33m=[39m [32m'test-r8-token'[39m
    [90m285|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'replicate'[39m)
    [90m286|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-r8-token'[39m)
    [90m   |[39m                 [31m^[39m
    [90m287|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mREPLICATE_API_TOKEN[39m
    [90m288|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[51/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mReplicate aliases[2m > [22mgetEnvKeyForProvider("replicate") falls back to REPLICATE_API_KEY
[31m[1mAssertionError[22m: expected null to be 'test-r8-key' // Object.is equality[39m

[32m- Expected:[39m
"test-r8-key"

[31m+ Received:[39m
null

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m293:17[22m[39m
    [90m291|[39m     process[33m.[39menv[33m.[39m[33mREPLICATE_API_KEY[39m [33m=[39m [32m'test-r8-key'[39m
    [90m292|[39m     [35mconst[39m key [33m=[39m [34mgetEnvKeyForProvider[39m([32m'replicate'[39m)
    [90m293|[39m     [34mexpect[39m(key)[33m.[39m[34mtoBe[39m([32m'test-r8-key'[39m)
    [90m   |[39m                 [31m^[39m
    [90m294|[39m     [35mdelete[39m process[33m.[39menv[33m.[39m[33mREPLICATE_API_KEY[39m
    [90m295|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[52/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetAdultSpecialistProviderKeys()[2m > [22mincludes together, huggingface, replicate, xai
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m305:35[22m[39m
    [90m303|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'together'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m304|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'huggingface'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m305|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'replicate'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                   [31m^[39m
    [90m306|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'xai'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m307|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[53/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mgetRuntimeProviderGovernance()[2m > [22mincludes active primary and specialist providers
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m335:33[22m[39m
    [90m333|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'genx'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m334|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'qwen'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m335|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'minimax'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                 [31m^[39m
    [90m336|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'deepseek'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m337|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'replicate'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[54/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mAI_PROVIDER_GOVERNANCE completeness[2m > [22mall entries have envVarAliases defined for aliased providers
[31m[1mAssertionError[22m: Provider 'xai' should have envVarAliases: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m356:83[22m[39m
    [90m354|[39m     [35mfor[39m ([35mconst[39m key [35mof[39m aliasedProviders) {
    [90m355|[39m       [35mconst[39m entry [33m=[39m [33mAI_PROVIDER_GOVERNANCE[39m[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m key)
    [90m356|[39m       expect(entry?.envVarAliases, `Provider '${key}' should have envV…
    [90m   |[39m                                                                                   [31m^[39m
    [90m357|[39m       expect(entry?.envVarAliases?.length, `Provider '${key}' should h…
    [90m358|[39m     }

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[55/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mAI_PROVIDER_GOVERNANCE completeness[2m > [22mQwen notes mentions DASHSCOPE_API_KEY alias
[31m[1mAssertionError[22m: expected 'Compatibility metadata generated from…' to contain 'DASHSCOPE_API_KEY'[39m

Expected: [32m"DASHSCOPE_API_KEY"[39m
Received: [31m"Compatibility metadata generated from provider-mesh.ts."[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m363:31[22m[39m
    [90m361|[39m   [34mit[39m([32m'Qwen notes mentions DASHSCOPE_API_KEY alias'[39m[33m,[39m () [33m=>[39m {
    [90m362|[39m     [35mconst[39m qwen [33m=[39m [33mAI_PROVIDER_GOVERNANCE[39m[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'qwen'[39m)
    [90m363|[39m     [34mexpect[39m(qwen[33m?.[39mnotes [33m??[39m [32m''[39m)[33m.[39m[34mtoContain[39m([32m'DASHSCOPE_API_KEY'[39m)
    [90m   |[39m                               [31m^[39m
    [90m364|[39m   })
    [90m365|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[56/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mAI_PROVIDER_GOVERNANCE completeness[2m > [22mMiniMax notes keeps Xiaomi MiMo separate
[31m[1mAssertionError[22m: expected '' to contain 'Xiaomi MiMo is configured separately'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- Xiaomi MiMo is configured separately[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m368:29[22m[39m
    [90m366|[39m   [34mit[39m([32m'MiniMax notes keeps Xiaomi MiMo separate'[39m[33m,[39m () [33m=>[39m {
    [90m367|[39m     [35mconst[39m mm [33m=[39m [33mAI_PROVIDER_GOVERNANCE[39m[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'minimax'[39m)
    [90m368|[39m     expect(mm?.notes ?? '').toContain('Xiaomi MiMo is configured separ…
    [90m   |[39m                             [31m^[39m
    [90m369|[39m   })
    [90m370|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[57/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/provider-governance.test.ts[2m > [22mAI_PROVIDER_GOVERNANCE completeness[2m > [22mHuggingFace notes mentions HUGGINGFACEHUB_API_TOKEN alias
[31m[1mAssertionError[22m: expected 'Compatibility metadata generated from…' to contain 'HUGGINGFACEHUB_API_TOKEN'[39m

Expected: [32m"HUGGINGFACEHUB_API_TOKEN"[39m
Received: [31m"Compatibility metadata generated from provider-mesh.ts."[39m

[36m [2m❯[22m src/lib/__tests__/provider-governance.test.ts:[2m373:29[22m[39m
    [90m371|[39m   it('HuggingFace notes mentions HUGGINGFACEHUB_API_TOKEN alias', () =…
    [90m372|[39m     const hf = AI_PROVIDER_GOVERNANCE.find(p => p.key === 'huggingface…
    [90m373|[39m     [34mexpect[39m(hf[33m?.[39mnotes [33m??[39m [32m''[39m)[33m.[39m[34mtoContain[39m([32m'HUGGINGFACEHUB_API_TOKEN'[39m)
    [90m   |[39m                             [31m^[39m
    [90m374|[39m   })
    [90m375|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[58/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/public-website-rebuild.test.ts[2m > [22mfinal public website[2m > [22mshows the eleven required connected apps with honest statuses
[31m[1mAssertionError[22m: expected [] to have a length of 11 but got +0[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 11[39m
[31m+ 0[39m

[36m [2m❯[22m src/lib/__tests__/public-website-rebuild.test.ts:[2m47:26[22m[39m


[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[59/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/routing-engine.test.ts[2m > [22mRouting Engine[2m > [22mhealth-aware routing[2m > [22mskips models from unconfigured providers when health cache is populated
[31m[1mAssertionError[22m: expected undefined to be 'openai' // Object.is equality[39m

[32m- Expected:[39m
"openai"

[31m+ Received:[39m
undefined

[36m [2m❯[22m src/lib/__tests__/routing-engine.test.ts:[2m218:47[22m[39m
    [90m216|[39m       [35mconst[39m decision [33m=[39m [35mawait[39m [34mrouteRequest[39m([34mmakeContext[39m())
    [90m217|[39m       [34mexpect[39m(decision[33m.[39mprimaryModel)[33m.[39m[34mtoBeDefined[39m()
    [90m218|[39m       [34mexpect[39m(decision[33m.[39mprimaryModel[33m?.[39mprovider)[33m.[39m[34mtoBe[39m([32m'openai'[39m)
    [90m   |[39m                                               [31m^[39m
    [90m219|[39m       [90m// All fallbacks should also be from openai[39m
    [90m220|[39m       [35mfor[39m ([35mconst[39m fb [35mof[39m decision[33m.[39mfallbackModels) {

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[60/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/routing-engine.test.ts[2m > [22mRouting Engine[2m > [22mhealth-aware routing[2m > [22mskips models from error providers
[31m[1mAssertionError[22m: expected undefined to be 'openai' // Object.is equality[39m

[32m- Expected:[39m
"openai"

[31m+ Received:[39m
undefined

[36m [2m❯[22m src/lib/__tests__/routing-engine.test.ts:[2m238:47[22m[39m
    [90m236|[39m       [35mconst[39m decision [33m=[39m [35mawait[39m [34mrouteRequest[39m([34mmakeContext[39m())
    [90m237|[39m       [34mexpect[39m(decision[33m.[39mprimaryModel)[33m.[39m[34mtoBeDefined[39m()
    [90m238|[39m       [34mexpect[39m(decision[33m.[39mprimaryModel[33m?.[39mprovider)[33m.[39m[34mtoBe[39m([32m'openai'[39m)
    [90m   |[39m                                               [31m^[39m
    [90m239|[39m     })
    [90m240|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[61/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/routing-engine.test.ts[2m > [22mRouting Engine[2m > [22mhealth-aware routing[2m > [22mdemotes degraded providers in fallback list
[31m[1mAssertionError[22m: expected 0 to be greater than 0[39m
[36m [2m❯[22m src/lib/__tests__/routing-engine.test.ts:[2m287:51[22m[39m
    [90m285|[39m       [35mconst[39m allConfigured [33m=[39m [35mawait[39m [34mrouteRequest[39m([34mmakeContext[39m())
    [90m286|[39m       [34mexpect[39m(allConfigured[33m.[39mprimaryModel)[33m.[39m[34mtoBeDefined[39m()
    [90m287|[39m       [34mexpect[39m(allConfigured[33m.[39mfallbackModels[33m.[39mlength)[33m.[39m[34mtoBeGreaterThan[39m([34m0[39m)
    [90m   |[39m                                                   [31m^[39m
    [90m288|[39m
    [90m289|[39m       // The routing engine is deterministic, so we just verify both h…

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[62/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mruntime truth does not block if direct providers exist without GenX[2m > [22mText/Chat is available when Qwen is configured (no GenX)
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m85:30[22m[39m
    [90m 83|[39m
    [90m 84|[39m     const textChat = truth.capabilities.find(c => c.name === 'Text / C…
    [90m 85|[39m     [34mexpect[39m(textChat[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                              [31m^[39m
    [90m 86|[39m   })
    [90m 87|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[63/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mruntime truth does not block if direct providers exist without GenX[2m > [22mText/Chat is available when MiniMax is configured (no GenX)
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m98:30[22m[39m
    [90m 96|[39m
    [90m 97|[39m     const textChat = truth.capabilities.find(c => c.name === 'Text / C…
    [90m 98|[39m     [34mexpect[39m(textChat[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                              [31m^[39m
    [90m 99|[39m   })
    [90m100|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[64/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mruntime truth does not block if direct providers exist without GenX[2m > [22mText/Chat is available when DeepSeek is configured (no GenX)
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m111:30[22m[39m
    [90m109|[39m
    [90m110|[39m     const textChat = truth.capabilities.find(c => c.name === 'Text / C…
    [90m111|[39m     [34mexpect[39m(textChat[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                              [31m^[39m
    [90m112|[39m   })
    [90m113|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[65/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mruntime truth does not block if direct providers exist without GenX[2m > [22mGenX IS a blocker when no providers are configured at all
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m122:81[22m[39m
    [90m120|[39m
    [90m121|[39m     [34mexpect[39m(truth[33m.[39mgenx[33m.[39mconfigured)[33m.[39m[34mtoBe[39m([35mfalse[39m)
    [90m122|[39m     expect(truth.blockers.some(b => b.includes('GenX API key not confi…
    [90m   |[39m                                                                                 [31m^[39m
    [90m123|[39m   })
    [90m124|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[66/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mImage generation available without GenX[2m > [22mImage available when Qwen is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m139:27[22m[39m
    [90m137|[39m
    [90m138|[39m     const image = truth.capabilities.find(c => c.name === 'Image Gener…
    [90m139|[39m     [34mexpect[39m(image[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                           [31m^[39m
    [90m140|[39m   })
    [90m141|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[67/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mImage generation available without GenX[2m > [22mImage available when MiniMax is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m152:27[22m[39m
    [90m150|[39m
    [90m151|[39m     const image = truth.capabilities.find(c => c.name === 'Image Gener…
    [90m152|[39m     [34mexpect[39m(image[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                           [31m^[39m
    [90m153|[39m   })
    [90m154|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[68/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mImage generation available without GenX[2m > [22mVideo available when Qwen is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m165:27[22m[39m
    [90m163|[39m
    [90m164|[39m     const video = truth.capabilities.find(c => c.name === 'Video Gener…
    [90m165|[39m     [34mexpect[39m(video[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                           [31m^[39m
    [90m166|[39m   })
    [90m167|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[69/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mImage generation available without GenX[2m > [22mVideo available when MiniMax is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m178:27[22m[39m
    [90m176|[39m
    [90m177|[39m     const video = truth.capabilities.find(c => c.name === 'Video Gener…
    [90m178|[39m     [34mexpect[39m(video[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                           [31m^[39m
    [90m179|[39m   })
    [90m180|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[70/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mTTS/STT available without GenX[2m > [22mTTS available when MiniMax is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m195:25[22m[39m
    [90m193|[39m
    [90m194|[39m     [35mconst[39m tts [33m=[39m truth[33m.[39mcapabilities[33m.[39m[34mfind[39m(c [33m=>[39m c[33m.[39mname [33m===[39m [32m'Voice TTS'[39m)
    [90m195|[39m     [34mexpect[39m(tts[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                         [31m^[39m
    [90m196|[39m   })
    [90m197|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[71/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mTTS/STT available without GenX[2m > [22mSTT available when Deepgram is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m208:25[22m[39m
    [90m206|[39m
    [90m207|[39m     const stt = truth.capabilities.find(c => c.name === 'STT / Transcr…
    [90m208|[39m     [34mexpect[39m(stt[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                         [31m^[39m
    [90m209|[39m   })
    [90m210|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[72/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mTTS/STT available without GenX[2m > [22mSTT available when MiniMax is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m221:25[22m[39m
    [90m219|[39m
    [90m220|[39m     const stt = truth.capabilities.find(c => c.name === 'STT / Transcr…
    [90m221|[39m     [34mexpect[39m(stt[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                         [31m^[39m
    [90m222|[39m   })
    [90m223|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[73/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mMusic generation follows GenX Lyria governance[2m > [22mmusic is blocked until GenX Lyria is configured even when MiniMax is configured
[31m[1mAssertionError[22m: expected 'No tested approved connection provide…' to contain 'Configure GenX'[39m

Expected: [32m"Configure GenX"[39m
Received: [31m"No tested approved connection provides music."[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m239:28[22m[39m
    [90m237|[39m     const music = truth.capabilities.find(c => c.name === 'Music Gener…
    [90m238|[39m     [34mexpect[39m(music[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'blocked'[39m)
    [90m239|[39m     [34mexpect[39m(music[33m?.[39mblocker)[33m.[39m[34mtoContain[39m([32m'Configure GenX'[39m)
    [90m   |[39m                            [31m^[39m
    [90m240|[39m   })
    [90m241|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[74/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mMusic generation follows GenX Lyria governance[2m > [22mmusic is available for live testing with GenX configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m253:27[22m[39m
    [90m251|[39m
    [90m252|[39m     const music = truth.capabilities.find(c => c.name === 'Music Gener…
    [90m253|[39m     [34mexpect[39m(music[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                           [31m^[39m
    [90m254|[39m     expect(music?.models).toEqual(expect.arrayContaining(['lyria-3-cli…
    [90m255|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[75/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mresearch/crawler capability[2m > [22mresearch available when Firecrawl is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m404:30[22m[39m
    [90m402|[39m
    [90m403|[39m     const research = truth.capabilities.find(c => c.name === 'Web Craw…
    [90m404|[39m     [34mexpect[39m(research[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                              [31m^[39m
    [90m405|[39m   })
    [90m406|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[76/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/runtime-capability-truth.test.ts[2m > [22mresearch/crawler capability[2m > [22mresearch available when Gemini is configured
[31m[1mAssertionError[22m: expected 'blocked' to be 'available' // Object.is equality[39m

Expected: [32m"available"[39m
Received: [31m"blocked"[39m

[36m [2m❯[22m src/lib/__tests__/runtime-capability-truth.test.ts:[2m417:30[22m[39m
    [90m415|[39m
    [90m416|[39m     const research = truth.capabilities.find(c => c.name === 'Web Craw…
    [90m417|[39m     [34mexpect[39m(research[33m?.[39mstatus)[33m.[39m[34mtoBe[39m([32m'available'[39m)
    [90m   |[39m                              [31m^[39m
    [90m418|[39m   })
    [90m419|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[77/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mSettings provider display names[2m > [22mMiniMax and Xiaomi MiMo are separate providers
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m41:21[22m[39m
    [90m 39|[39m     [35mconst[39m minimax [33m=[39m primary[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'minimax'[39m)
    [90m 40|[39m     [35mconst[39m mimo [33m=[39m primary[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'mimo'[39m)
    [90m 41|[39m     [34mexpect[39m(minimax)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                     [31m^[39m
    [90m 42|[39m     [34mexpect[39m(minimax[33m?.[39mdisplayName)[33m.[39m[34mtoBe[39m([32m'MiniMax'[39m)
    [90m 43|[39m     [34mexpect[39m(mimo[33m?.[39mdisplayName)[33m.[39m[34mtoBe[39m([32m'Xiaomi MiMo'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[78/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mSettings provider display names[2m > [22mxAI is labeled "xAI / Grok"
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m49:17[22m[39m
    [90m 47|[39m     [35mconst[39m advanced [33m=[39m [34mgetAdvancedSetupProviders[39m()
    [90m 48|[39m     [35mconst[39m xai [33m=[39m advanced[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'xai'[39m)
    [90m 49|[39m     [34mexpect[39m(xai)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                 [31m^[39m
    [90m 50|[39m     [34mexpect[39m(xai[33m?.[39mdisplayName)[33m.[39m[34mtoContain[39m([32m'xAI'[39m)
    [90m 51|[39m     [34mexpect[39m(xai[33m?.[39mdisplayName)[33m.[39m[34mtoContain[39m([32m'Grok'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[79/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mSettings provider display names[2m > [22mMoonshot is labeled "Moonshot / Kimi"
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m57:22[22m[39m
    [90m 55|[39m     [35mconst[39m advanced [33m=[39m [34mgetAdvancedSetupProviders[39m()
    [90m 56|[39m     [35mconst[39m moonshot [33m=[39m advanced[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'moonshot'[39m)
    [90m 57|[39m     [34mexpect[39m(moonshot)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                      [31m^[39m
    [90m 58|[39m     [34mexpect[39m(moonshot[33m?.[39mdisplayName)[33m.[39m[34mtoContain[39m([32m'Moonshot'[39m)
    [90m 59|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[80/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mSettings provider display names[2m > [22mOpenAI compatibility fallback remains hidden
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m63:20[22m[39m
    [90m 61|[39m   [34mit[39m([32m'OpenAI compatibility fallback remains hidden'[39m[33m,[39m () [33m=>[39m {
    [90m 62|[39m     [35mconst[39m openai [33m=[39m [34mgetHiddenProviders[39m()[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'openai'[39m)
    [90m 63|[39m     [34mexpect[39m(openai)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                    [31m^[39m
    [90m 64|[39m     [34mexpect[39m(openai[33m?.[39mdisplayName)[33m.[39m[34mtoContain[39m([32m'compatibility fallback'[39m)
    [90m 65|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[81/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mdeprecated and hidden providers do not appear in Settings UI[2m > [22mcohere is in hidden providers
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m96:38[22m[39m
    [90m 94|[39m   [34mit[39m([32m'cohere is in hidden providers'[39m[33m,[39m () [33m=>[39m {
    [90m 95|[39m     [35mconst[39m hiddenKeys [33m=[39m [35mnew[39m [33mSet[39m([34mgetHiddenProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m 96|[39m     [34mexpect[39m(hiddenKeys[33m.[39m[34mhas[39m([32m'cohere'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                      [31m^[39m
    [90m 97|[39m   })
    [90m 98|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[82/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mdeprecated and hidden providers do not appear in Settings UI[2m > [22mmistral is in hidden providers
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m101:39[22m[39m
    [90m 99|[39m   [34mit[39m([32m'mistral is in hidden providers'[39m[33m,[39m () [33m=>[39m {
    [90m100|[39m     [35mconst[39m hiddenKeys [33m=[39m [35mnew[39m [33mSet[39m([34mgetHiddenProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m101|[39m     [34mexpect[39m(hiddenKeys[33m.[39m[34mhas[39m([32m'mistral'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                       [31m^[39m
    [90m102|[39m   })
    [90m103|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[83/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mdeprecated and hidden providers do not appear in Settings UI[2m > [22msuno, udio are in backlog providers
[31m[1mAssertionError[22m: expected false to be true // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- true[39m
[31m+ false[39m

[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m106:37[22m[39m
    [90m104|[39m   [34mit[39m([32m'suno, udio are in backlog providers'[39m[33m,[39m () [33m=>[39m {
    [90m105|[39m     [35mconst[39m backlogKeys [33m=[39m [35mnew[39m [33mSet[39m([34mgetBacklogProviders[39m()[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m106|[39m     [34mexpect[39m(backlogKeys[33m.[39m[34mhas[39m([32m'suno'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m   |[39m                                     [31m^[39m
    [90m107|[39m     [34mexpect[39m(backlogKeys[33m.[39m[34mhas[39m([32m'udio'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m108|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[84/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mSettings shows exactly the right provider groups[2m > [22mhas the 13 current primary providers including MiMo and local crawler
[31m[1mAssertionError[22m: expected 6 to be 13 // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 13[39m
[31m+ 6[39m

[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m115:47[22m[39m
    [90m113|[39m [34mdescribe[39m([32m'Settings shows exactly the right provider groups'[39m[33m,[39m () [33m=>[39m {
    [90m114|[39m   it('has the 13 current primary providers including MiMo and local cr…
    [90m115|[39m     [34mexpect[39m([34mgetPrimarySetupProviders[39m()[33m.[39mlength)[33m.[39m[34mtoBe[39m([34m13[39m)
    [90m   |[39m                                               [31m^[39m
    [90m116|[39m   })
    [90m117|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[85/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mSettings shows exactly the right provider groups[2m > [22mhas exactly 3 specialist providers (replicate, elevenlabs, deepgram)
[31m[1mAssertionError[22m: expected +0 to be 3 // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 3[39m
[31m+ 0[39m

[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m120:31[22m[39m
    [90m118|[39m   it('has exactly 3 specialist providers (replicate, elevenlabs, deepg…
    [90m119|[39m     [35mconst[39m specialist [33m=[39m [34mgetSpecialistSetupProviders[39m()
    [90m120|[39m     [34mexpect[39m(specialist[33m.[39mlength)[33m.[39m[34mtoBe[39m([34m3[39m)
    [90m   |[39m                               [31m^[39m
    [90m121|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m(specialist[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m122|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'replicate'[39m))[33m.[39m[34mtoBe[39m([35mtrue[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[86/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mSettings shows exactly the right provider groups[2m > [22mhas exactly 4 visible advanced providers
[31m[1mAssertionError[22m: expected 10 to be 4 // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 4[39m
[31m+ 10[39m

[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m129:29[22m[39m
    [90m127|[39m   [34mit[39m([32m'has exactly 4 visible advanced providers'[39m[33m,[39m () [33m=>[39m {
    [90m128|[39m     [35mconst[39m advanced [33m=[39m [34mgetAdvancedSetupProviders[39m()
    [90m129|[39m     [34mexpect[39m(advanced[33m.[39mlength)[33m.[39m[34mtoBe[39m([34m4[39m)
    [90m   |[39m                             [31m^[39m
    [90m130|[39m     [35mconst[39m keys [33m=[39m [35mnew[39m [33mSet[39m(advanced[33m.[39m[34mmap[39m(p [33m=>[39m p[33m.[39mkey))
    [90m131|[39m     [34mexpect[39m(keys[33m.[39m[34mhas[39m([32m'openai'[39m))[33m.[39m[34mtoBe[39m([35mfalse[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[87/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mProvider env var alias hints[2m > [22mXiaomi MiMo owns MIMO_API_KEY
[31m[1mAssertionError[22m: the given combination of arguments (undefined and string) is invalid for this assertion. You can use an array, a map, an object, a set, a string, or a weakset instead of a string[39m
[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m150:35[22m[39m
    [90m148|[39m     const mm = getPrimarySetupProviders().find(p => p.key === 'minimax…
    [90m149|[39m     [35mconst[39m mimo [33m=[39m [34mgetPrimarySetupProviders[39m()[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'mimo'[39m)
    [90m150|[39m     [34mexpect[39m(mm[33m?.[39menvVarAliases)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'MIMO_API_KEY'[39m)
    [90m   |[39m                                   [31m^[39m
    [90m151|[39m     [34mexpect[39m(mimo[33m?.[39menvVar)[33m.[39m[34mtoBe[39m([32m'MIMO_API_KEY'[39m)
    [90m152|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[88/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mProvider env var alias hints[2m > [22mxAI lists GROK_API_KEY as accepted env alias
[31m[1mAssertionError[22m: the given combination of arguments (undefined and string) is invalid for this assertion. You can use an array, a map, an object, a set, a string, or a weakset instead of a string[39m
[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m162:32[22m[39m
    [90m160|[39m   [34mit[39m([32m'xAI lists GROK_API_KEY as accepted env alias'[39m[33m,[39m () [33m=>[39m {
    [90m161|[39m     [35mconst[39m xai [33m=[39m [34mgetAdvancedSetupProviders[39m()[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'xai'[39m)
    [90m162|[39m     [34mexpect[39m(xai[33m?.[39menvVarAliases)[33m.[39m[34mtoContain[39m([32m'GROK_API_KEY'[39m)
    [90m   |[39m                                [31m^[39m
    [90m163|[39m   })
    [90m164|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[89/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mProvider env var alias hints[2m > [22mReplicate lists REPLICATE_API_TOKEN as accepted env alias
[31m[1mAssertionError[22m: the given combination of arguments (undefined and string) is invalid for this assertion. You can use an array, a map, an object, a set, a string, or a weakset instead of a string[39m
[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m167:38[22m[39m
    [90m165|[39m   it('Replicate lists REPLICATE_API_TOKEN as accepted env alias', () =…
    [90m166|[39m     const replicate = getSpecialistSetupProviders().find(p => p.key ==…
    [90m167|[39m     [34mexpect[39m(replicate[33m?.[39menvVarAliases)[33m.[39m[34mtoContain[39m([32m'REPLICATE_API_TOKEN'[39m)
    [90m   |[39m                                      [31m^[39m
    [90m168|[39m   })
    [90m169|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[90/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/settings-provider-source-of-truth.test.ts[2m > [22mGenX governance role[2m > [22mGenX notes describes it as gateway infrastructure only
[31m[1mAssertionError[22m: expected 'Compatibility metadata generated from…' to contain 'gateway infrastructure'[39m

Expected: [32m"gateway infrastructure"[39m
Received: [31m"Compatibility metadata generated from provider-mesh.ts."[39m

[36m [2m❯[22m src/lib/__tests__/settings-provider-source-of-truth.test.ts:[2m181:31[22m[39m
    [90m179|[39m   [34mit[39m([32m'GenX notes describes it as gateway infrastructure only'[39m[33m,[39m () [33m=>[39m {
    [90m180|[39m     [35mconst[39m genx [33m=[39m [34mgetPrimarySetupProviders[39m()[33m.[39m[34mfind[39m(p [33m=>[39m p[33m.[39mkey [33m===[39m [32m'genx'[39m)
    [90m181|[39m     [34mexpect[39m(genx[33m?.[39mnotes [33m??[39m [32m''[39m)[33m.[39m[34mtoContain[39m([32m'gateway infrastructure'[39m)
    [90m   |[39m                               [31m^[39m
    [90m182|[39m   })
    [90m183|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[91/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts[2m > [22mstandalone dashboard product shell[2m > [22mcontains the six required primary sections
[31m[1mAssertionError[22m: expected 'import {\n  GitPullRequest,\n  Home,\…' to contain 'label: \'Media Studio / Playground\''[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- label: 'Media Studio / Playground'[39m
[31m+ import {[39m
[31m+   GitPullRequest,[39m
[31m+   Home,[39m
[31m+   Library,[39m
[31m+   Rocket,[39m
[31m+   Settings2,[39m
[31m+   Sparkles,[39m
[31m+   Workflow,[39m
[31m+ } from 'lucide-react'[39m
[31m+ import type { ComponentType, SVGProps } from 'react'[39m
[31m+[39m
[31m+ export type DashboardSectionId =[39m
[31m+   | 'home'[39m
[31m+   | 'playground'[39m
[31m+   | 'repo-workbench'[39m
[31m+   | 'app-builder'[39m
[31m+   | 'outputs'[39m
[31m+   | 'connected-apps'[39m
[31m+   | 'control-center'[39m
[31m+[39m
[31m+ export type DashboardNavItem = {[39m
[31m+   id: DashboardSectionId[39m
[31m+   href: string[39m
[31m+   label: string[39m
[31m+   description: string[39m
[31m+   icon: ComponentType<SVGProps<SVGSVGElement>>[39m
[31m+ }[39m
[31m+[39m
[31m+ export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [[39m
[31m+   {[39m
[31m+     id: 'home',[39m
[31m+     href: '/admin/dashboard',[39m
[31m+     label: 'Home',[39m
[31m+     description: 'Start here.',[39m
[31m+     icon: Home,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'playground',[39m
[31m+     href: '/admin/dashboard/studio',[39m
[31m+     label: 'Playground',[39m
[31m+     description: 'Generate with AI.',[39m
[31m+     icon: Sparkles,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'repo-workbench',[39m
[31m+     href: '/admin/dashboard/workbench',[39m
[31m+     label: 'Repo Workbench',[39m
[31m+     description: 'Fix and deploy code.',[39m
[31m+     icon: GitPullRequest,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'app-builder',[39m
[31m+     href: '/admin/dashboard/app-builder',[39m
[31m+     label: 'App Builder',[39m
[31m+     description: 'Build connected apps.',[39m
[31m+     icon: Rocket,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'outputs',[39m
[31m+     href: '/admin/dashboard/outputs',[39m
[31m+     label: 'Outputs',[39m
[31m+     description: 'View created work.',[39m
[31m+     icon: Library,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'connected-apps',[39m
[31m+     href: '/admin/dashboard/network-apps',[39m
[31m+     label: 'Connected Apps',[39m
[31m+     description: 'Manage app access.',[39m
[31m+     icon: Workflow,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'control-center',[39m
[31m+     href: '/admin/dashboard/settings',[39m
[31m+     label: 'Control Center',[39m
[31m+     description: 'Providers, system, logs.',[39m
[31m+     icon: Settings2,[39m
[31m+   },[39m
[31m+ ] as const[39m
[31m+[39m
[31m+ export const CONTROL_CENTER_ROUTES = [[39m
[31m+   '/admin/dashboard/settings',[39m
[31m+   '/admin/dashboard/operations',[39m
[31m+   '/admin/dashboard/system',[39m
[31m+ ] as const[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:[2m45:19[22m[39m
    [90m 43|[39m     [35mconst[39m nav [33m=[39m [34mread[39m([32m'lib/dashboard-nav.ts'[39m)
    [90m 44|[39m     for (const label of ['App Builder', 'Repo Workbench', 'Media Studi…
    [90m 45|[39m       [34mexpect[39m(nav)[33m.[39m[34mtoContain[39m([32m`label: '[39m[36m${[39mlabel[36m}[39m[32m'`[39m)
    [90m   |[39m                   [31m^[39m
    [90m 46|[39m     }
    [90m 47|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[92/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts[2m > [22mstandalone dashboard product shell[2m > [22mkeeps adult text, image, video, and voice visible
[31m[1mAssertionError[22m: expected '\'use client\'\n\nimport Link from \'…' to contain 'Adult Text'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- Adult Text[39m
[31m+ 'use client'[39m
[31m+[39m
[31m+ import Link from 'next/link'[39m
[31m+ import { useCallback, useEffect, useMemo, useState } from 'react'[39m
[31m+ import {[39m
[31m+   ArrowRight,[39m
[31m+   Bot,[39m
[31m+   FileText,[39m
[31m+   GitPullRequest,[39m
[31m+   Image as ImageIcon,[39m
[31m+   Loader2,[39m
[31m+   Mic,[39m
[31m+   Music,[39m
[31m+   Sparkles,[39m
[31m+   Upload,[39m
[31m+   UserRound,[39m
[31m+   Video,[39m
[31m+   Volume2,[39m
[31m+ } from 'lucide-react'[39m
[31m+ import { APPROVED_AI_PROVIDERS, providerLabel } from '@/lib/approved-ai-catalog'[39m
[31m+ import type { UniversalModelCatalog } from '@/lib/universal-model-catalog'[39m
[31m+[39m
[31m+ type CapabilityId =[39m
[31m+   | 'chat'[39m
[31m+   | 'research'[39m
[31m+   | 'image_generation'[39m
[31m+   | 'music_generation'[39m
[31m+   | 'video_generation'[39m
[31m+   | 'avatar_video'[39m
[31m+   | 'tts'[39m
[31m+   | 'stt'[39m
[31m+   | 'coding'[39m
[31m+[39m
[31m+ type StudioTab =[39m
[31m+   | 'Chat'[39m
[31m+   | 'Research'[39m
[31m+   | 'Image'[39m
[31m+   | 'Music / Audio'[39m
[31m+   | 'Video'[39m
[31m+   | 'Avatar / Talking Video'[39m
[31m+   | 'Voice / TTS'[39m
[31m+   | 'STT / Transcription'[39m
[31m+   | 'Coding'[39m
[31m+[39m
[31m+ type Mode = {[39m
[31m+   id: CapabilityId[39m
[31m+   label: string[39m
[31m+   short: string[39m
[31m+   tab: StudioTab[39m
[31m+   icon: typeof Sparkles[39m
[31m+   placeholder: string[39m
[31m+   action: string[39m
[31m+ }[39m
[31m+[39m
[31m+ type ArtifactSummary = {[39m
[31m+   id: string[39m
[31m+   title?: string[39m
[31m+   type?: string[39m
[31m+   subType?: string[39m
[31m+   provider?: string[39m
[31m+   model?: string[39m
[31m+   storageUrl?: string[39m
[31m+   contentUrl?: string[39m
[31m+   url?: string[39m
[31m+   createdAt?: string[39m
[31m+   metadata?: Record<string, unknown>[39m
[31m+ }[39m
[31m+[39m
[31m+ type ApiResult = Record<string, unknown> & {[39m
[31m+   success?: boolean[39m
[31m+   error?: string[39m
[31m+   blocker?: string[39m
[31m+   transcript?: string[39m
[31m+   storageUrl?: string[39m
[31m+   imageUrl?: string[39m
[31m+   audioUrl?: string[39m
[31m+   videoUrl?: string[39m
[31m+   mediaUrl?: string[39m
[31m+   pollUrl?: string[39m
[31m+   jobStatus?: string[39m
[31m+   status?: string[39m
[31m+   artifactId?: string[39m
[31m+   artifact?: { id?: string; storageUrl?: string }[39m
[31m+   result?: Record<string, unknown>[39m
[31m+   workbenchUrl?: string[39m
[31m+ }[39m
[31m+[39m
[31m+ const MODES: Mode[] = [[39m
[31m+   {[39m
[31m+     id: 'chat',[39m
[31m+     label: 'Chat',[39m
[31m+     short: 'Chat',[39m
[31m+     tab: 'Chat',[39m
[31m+     icon: Bot,[39m
[31m+     placeholder: 'Ask AmarktAI anything or describe what you want done.',[39m
[31m+     action: 'Send',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'research',[39m
[31m+     label: 'Research',[39m
[31m+     short: 'Research',[39m
[31m+     tab: 'Research',[39m
[31m+     icon: FileText,[39m
[31m+     placeholder: 'Research a topic, market, app idea, competitor, or technical question.',[39m
[31m+     action: 'Research',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'image_generation',[39m
[31m+     label: 'Image',[39m
[31m+     short: 'Image',[39m
[31m+     tab: 'Image',[39m
[31m+     icon: ImageIcon,[39m
[31m+     placeholder: 'Describe the image you want to generate.',[39m
[31m+     action: 'Generate image',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'music_generation',[39m
[31m+     label: 'Music',[39m
[31m+     short: 'Music',[39m
[31m+     tab: 'Music / Audio',[39m
[31m+     icon: Music,[39m
[31m+     placeholder: 'Describe the song, genre, mood, vocals, lyrics, and duration.',[39m
[31m+     action: 'Create song',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'video_generation',[39m
[31m+     label: 'Video',[39m
[31m+     short: 'Video',[39m
[31m+     tab: 'Video',[39m
[31m+     icon: Video,[39m
[31m+     placeholder: 'Describe the video scene, style, length, and format.',[39m
[31m+     action: 'Generate video',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'avatar_video',[39m
[31m+     label: 'Avatar',[39m
[31m+     short: 'Avatar',[39m
[31m+     tab: 'Avatar / Talking Video',[39m
[31m+     icon: UserRound,[39m
[31m+     placeholder: 'Write the script for the talking avatar or presenter video.',[39m
[31m+     action: 'Create avatar',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'tts',[39m
[31m+     label: 'Voice',[39m
[31m+     short: 'Voice',[39m
[31m+     tab: 'Voice / TTS',[39m
[31m+     icon: Volume2,[39m
[31m+     placeholder: 'Enter text to turn into spoken audio.',[39m
[31m+     action: 'Create voice',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'stt',[39m
[31m+     label: 'Transcribe',[39m
[31m+     short: 'STT',[39m
[31m+     tab: 'STT / Transcription',[39m
[31m+     icon: Mic,[39m
[31m+     placeholder: 'Upload audio or video to transcribe.',[39m
[31m+     action: 'Transcribe',[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'coding',[39m
[31m+     label: 'Code',[39m
[31m+     short: 'Code',[39m
[31m+     tab: 'Coding',[39m
[31m+     icon: GitPullRequest,[39m
[31m+     placeholder: 'Describe the repo change or fix. This will hand off to Repo Workbench.',[39m
[31m+     action: 'Send to Workbench',[39m
[31m+   },[39m
[31m+ ][39m
[31m+[39m
[31m+ const MUSIC_GENRES = ['pop', 'rock', 'rnb', 'reggae/rasta', 'hip hop', 'amapiano', 'afrobeat', 'cinematic', 'edm', 'acoustic'] as const[39m
[31m+ const VOICE_TYPES = ['female', 'male', 'narrator', 'calm', 'deep', 'emotional', 'cinematic'] as const[39m
[31m+[39m
[31m+ export default function StudioPage() {[39m
[31m+   const [modeId, setModeId] = useState<CapabilityId>('chat')[39m
[31m+   const mode = MODES.find((item) => item.id === modeId) ?? MODES[0][39m
[31m+[39m
[31m+   const [catalog, setCatalog] = useState<UniversalModelCatalog | null>(null)[39m
[31m+   const [provider, setProvider] = useState('auto')[39m
[31m+   const [modelId, setModelId] = useState('auto')[39m
[31m+   const [prompt, setPrompt] = useState('')[39m
[31m+   const [status, setStatus] = useState('Ready')[39m
[31m+   const [jobStatus, setJobStatus] = useState('')[39m
[31m+   const [running, setRunning] = useState(false)[39m
[31m+   const [result, setResult] = useState<ApiResult | null>(null)[39m
[31m+   const [, setArtifacts] = useState<ArtifactSummary[]>([])[39m
[31m+   const [uploadFile, setUploadFile] = useState<File | null>(null)[39m
[31m+   const [advancedOpen, setAdvancedOpen] = useState(false)[39m
[31m+[39m
[31m+   const [mediaSize, setMediaSize] = useState('1024x1024')[39m
[31m+   const [musicGenre, setMusicGenre] = useState('pop')[39m
[31m+   const [musicVocals, setMusicVocals] = useState('female')[39m
[31m+   const [musicTempo, setMusicTempo] = useState('medium')[39m
[31m+   const [musicMood, setMusicMood] = useState('')[39m
[31m+   const [voiceType, setVoiceType] = useState('female')[39m
[31m+   const [duration, setDuration] = useState('12')[39m
[31m+   const [aspectRatio, setAspectRatio] = useState('16:9')[39m
[31m+   const [avatarStyle, setAvatarStyle] = useState('professional presenter')[39m
[31m+[39m
[31m+   const appSlug = 'amarktai-network'[39m
[31m+[39m
[31m+   useEffect(() => {[39m
[31m+     fetch('/api/admin/ai-model-catalog', { cache: 'no-store' })[39m
[31m+       .then((response) => response.json())[39m
[31m+       .then((data) => setCatalog(data?.universal ?? null))[39m
[31m+       .catch(() => setCatalog(null))[39m
[31m+   }, [])[39m
[31m+[39m
[31m+   const loadArtifacts = useCallback(async () => {[39m
[31m+     const response = await fetch(`/api/admin/artifacts?appSlug=${encodeURIComponent(appSlug)}&limit=12`, { cache: 'no-store' })[39m
[31m+     const data = await response.json().catch(() => ({}))[39m
[31m+     setArtifacts(Array.isArray(data.artifacts) ? data.artifacts : [])[39m
[31m+   }, [])[39m
[31m+[39m
[31m+   useEffect(() => {[39m
[31m+     loadArtifacts().catch(() => null)[39m
[31m+   }, [loadArtifacts])[39m
[31m+[39m
[31m+   const modelOptions = useMemo(() => {[39m
[31m+     if (!catalog) return [][39m
[31m+[39m
[31m+     const allModels = catalog.models ?? [][39m
[31m+     const grouped = catalog.grouped as Record<string, typeof allModels>[39m
[31m+[39m
[31m+     if (mode.id === 'image_generation') return grouped.image ?? allModels[39m
[31m+     if (mode.id === 'video_generation' || mode.id === 'avatar_video') return grouped.video ?? allModels[39m
[31m+     if (mode.id === 'music_generation' || mode.id === 'tts' || mode.id === 'stt') {[39m
[31m+       return grouped.music ?? grouped.tts ?? grouped.stt ?? grouped.audio_generation ?? allModels[39m
[31m+     }[39m
[31m+     if (mode.id === 'coding') return grouped.coding ?? grouped.code_generation ?? allModels[39m
[31m+     return allModels[39m
[31m+   }, [catalog, mode.id])[39m
[31m+[39m
[31m+   const selectedModel = modelOptions.find((item: (typeof modelOptions)[number]) => item.modelId === modelId)[39m
[31m+   const executionProvider = selectedModel?.provider ?? provider[39m
[31m+   const executionModel = selectedModel?.modelId && selectedModel.modelId !== 'auto' ? selectedModel.modelId : modelId !== 'auto' ? modelId : undefined[39m
[31m+[39m
[31m+   async function run() {[39m
[31m+     setResult(null)[39m
[31m+     setJobStatus('')[39m
[31m+     setStatus('Running')[39m
[31m+     setRunning(true)[39m
[31m+[39m
[31m+     try {[39m
[31m+       if (mode.id === 'stt') {[39m
[31m+         await runTranscription()[39m
[31m+         return[39m
[31m+       }[39m
[31m+[39m
[31m+       if (!prompt.trim()) {[39m
[31m+         setStatus('Enter a request first')[39m
[31m+         return[39m
[31m+       }[39m
[31m+[39m
[31m+       if (mode.id === 'chat') {[39m
[31m+         await runChat()[39m
[31m+         return[39m
[31m+       }[39m
[31m+[39m
[31m+       const endpoint = mode.id === 'coding' ? '/api/admin/studio/workbench-handoff' : '/api/admin/studio/execute'[39m
[31m+[39m
[31m+       const response = await fetch(endpoint, {[39m
[31m+         method: 'POST',[39m
[31m+         headers: { 'content-type': 'application/json' },[39m
[31m+         body: JSON.stringify({[39m
[31m+           tab: mode.tab,[39m
[31m+           prompt,[39m
[31m+           appSlug,[39m
[31m+           provider,[39m
[31m+           model: executionModel,[39m
[31m+           providerOverride: executionProvider,[39m
[31m+           costMode: 'balanced',[39m
[31m+           size: mediaSize,[39m
[31m+           genre: musicGenre,[39m
[31m+           genres: [musicGenre],[39m
[31m+           vocalStyle: musicVocals,[39m
[31m+           instrumental: musicVocals === 'instrumental',[39m
[31m+           tempo: musicTempo,[39m
[31m+           mood: musicMood,[39m
[31m+           language: 'english',[39m
[31m+           duration: Number(duration) || 12,[39m
[31m+           aspectRatio,[39m
[31m+           voiceId: voiceType,[39m
[31m+           voiceType,[39m
[31m+           avatarStyle,[39m
[31m+         }),[39m
[31m+       })[39m
[31m+[39m
[31m+       const data = await response.json().catch(() => ({})) as ApiResult[39m
[31m+       if (!response.ok || data.success === false) {[39m
[31m+         throw new Error(String(data.error ?? data.blocker ?? data.result?.error ?? 'Playground request failed'))[39m
[31m+       }[39m
[31m+[39m
[31m+       let effective = data[39m
[31m+       const pollUrl = typeof data.pollUrl === 'string'[39m
[31m+         ? data.pollUrl[39m
[31m+         : typeof data.result?.pollUrl === 'string'[39m
[31m+           ? data.result.pollUrl[39m
[31m+           : ''[39m
[31m+[39m
[31m+       if (pollUrl) {[39m
[31m+         setJobStatus(String(data.jobStatus ?? data.status ?? 'processing'))[39m
[31m+         const finalJob = await pollJob(pollUrl)[39m
[31m+         if (finalJob) effective = finalJob[39m
[31m+       }[39m
[31m+[39m
[31m+       setResult(effective)[39m
[31m+       setStatus(statusMessage(effective))[39m
[31m+       setJobStatus(String(effective.jobStatus ?? effective.status ?? 'completed'))[39m
[31m+       await loadArtifacts()[39m
[31m+     } catch (error) {[39m
[31m+       const message = error instanceof Error ? error.message : 'Playground request failed'[39m
[31m+       setStatus(message)[39m
[31m+       setJobStatus('failed')[39m
[31m+       setResult({ success: false, error: message, blocker: message })[39m
[31m+     } finally {[39m
[31m+       setRunning(false)[39m
[31m+     }[39m
[31m+   }[39m
[31m+[39m
[31m+   async function runChat() {[39m
[31m+     const response = await fetch('/api/admin/amarktai-assistant/chat', {[39m
[31m+       method: 'POST',[39m
[31m+       headers: { 'content-type': 'application/json' },[39m
[31m+       body: JSON.stringify({[39m
[31m+         message: prompt,[39m
[31m+         prompt,[39m
[31m+         appSlug,[39m
[31m+         providerOverride: executionProvider,[39m
[31m+         modelOverride: executionModel,[39m
[31m+         capability: 'chat',[39m
[31m+         metadata: { appSlug, dashboardContext: true, studioTab: mode.tab },[39m
[31m+       }),[39m
[31m+     })[39m
[31m+[39m
[31m+     const data = await response.json().catch(() => ({})) as ApiResult[39m
[31m+     if (!response.ok || data.success === false) throw new Error(String(data.error ?? data.blocker ?? 'Chat failed'))[39m
[31m+[39m
[31m+     setResult(data)[39m
[31m+     setStatus('Chat response ready')[39m
[31m+     setJobStatus('completed')[39m
[31m+   }[39m
[31m+[39m
[31m+   async function runTranscription() {[39m
[31m+     if (!uploadFile) {[39m
[31m+       setStatus('Choose an audio or video file first')[39m
[31m+       return[39m
[31m+     }[39m
[31m+[39m
[31m+     const form = new FormData()[39m
[31m+     form.append('file', uploadFile)[39m
[31m+     form.append('appSlug', appSlug)[39m
[31m+     form.append('provider', executionProvider)[39m
[31m+     if (executionModel) form.append('model', executionModel)[39m
[31m+[39m
[31m+     const response = await fetch('/api/admin/studio/stt', { method: 'POST', body: form })[39m
[31m+     const data = await response.json().catch(() => ({})) as ApiResult[39m
[31m+[39m
[31m+     if (!response.ok || data.success === false) throw new Error(String(data.error ?? data.result?.error ?? 'Transcription failed'))[39m
[31m+[39m
[31m+     setResult(data)[39m
[31m+     setStatus(data.artifact?.id ? `Transcript saved: ${data.artifact.id}` : 'Transcript ready')[39m
[31m+     setJobStatus('completed')[39m
[31m+     await loadArtifacts()[39m
[31m+   }[39m
[31m+[39m
[31m+   async function pollJob(pollUrl: string) {[39m
[31m+     let latest: ApiResult | null = null[39m
[31m+[39m
[31m+     for (let i = 0; i < 18; i += 1) {[39m
[31m+       const response = await fetch(pollUrl, { cache: 'no-store' }).catch(() => null)[39m
[31m+       const data = await response?.json().catch(() => null) as ApiResult | null[39m
[31m+       if (data) {[39m
[31m+         latest = data[39m
[31m+         const state = String(data.status ?? data.jobStatus ?? data.result?.status ?? 'processing')[39m
[31m+         setJobStatus(state)[39m
[31m+         if (['completed', 'succeeded', 'failed', 'blocked'].includes(state)) break[39m
[31m+       }[39m
[31m+       await new Promise((resolve) => window.setTimeout(resolve, 2000))[39m
[31m+     }[39m
[31m+[39m
[31m+     await loadArtifacts().catch(() => null)[39m
[31m+     return latest[39m
[31m+   }[39m
[31m+[39m
[31m+   const canRun = mode.id === 'stt' ? Boolean(uploadFile) : Boolean(prompt.trim())[39m
[31m+[39m
[31m+   return ([39m
[31m+     <div className="space-y-4">[39m
[31m+       <section className="rounded-2xl border border-white/10 bg-[rgba(5,10,18,.64)] p-5 backdrop-blur-xl">[39m
[31m+         <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">[39m
[31m+           <div>[39m
[31m+             <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Playground</p>[39m
[31m+             <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white md:text-3xl">Create with AmarktAI.</h1>[39m
[31m+             <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">[39m
[31m+               Choose a capability, enter the request, run it, then review the artifact in Outputs.[39m
[31m+             </p>[39m
[31m+           </div>[39m
[31m+           <Link href="/admin/dashboard/outputs" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] px-3 text-xs font-black text-slate-200 hover:bg-white/10">[39m
[31m+             Open Outputs <ArrowRight className="h-3.5 w-3.5" />[39m
[31m+           </Link>[39m
[31m+         </div>[39m
[31m+       </section>[39m
[31m+[39m
[31m+       <section className="grid gap-4 xl:grid-cols-[360px_1fr]">[39m
[31m+         <div className="space-y-4">[39m
[31m+           <Panel title="Choose capability">[39m
[31m+             <div className="grid grid-cols-3 gap-2">[39m
[31m+               {MODES.map((item) => {[39m
[31m+                 const active = item.id === mode.id[39m
[31m+                 return ([39m
[31m+                   <button[39m
[31m+                     key={item.id}[39m
[31m+                     type="button"[39m
[31m+                     onClick={() => {[39m
[31m+                       setModeId(item.id)[39m
[31m+                       setResult(null)[39m
[31m+                       setStatus('Ready')[39m
[31m+                       setJobStatus('')[39m
[31m+                     }}[39m
[31m+                     className={[[39m
[31m+                       'rounded-xl border p-3 text-left transition',[39m
[31m+                       active[39m
[31m+                         ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'[39m
[31m+                         : 'border-white/10 bg-white/[0.035] text-slate-400 hover:bg-white/[0.06] hover:text-white',[39m
[31m+                     ].join(' ')}[39m
[31m+                   >[39m
[31m+                     <item.icon className="h-4 w-4" />[39m
[31m+                     <p className="mt-2 text-[11px] font-black">{item.short}</p>[39m
[31m+                   </button>[39m
[31m+                 )[39m
[31m+               })}[39m
[31m+             </div>[39m
[31m+           </Panel>[39m
[31m+[39m
[31m+           <button[39m
[31m+             type="button"[39m
[31m+             onClick={() => setAdvancedOpen((open) => !open)}[39m
[31m+             className="flex h-11 w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] px-3 text-xs font-black text-slate-300 transition hover:border-cyan-300/25 hover:bg-white/[0.06] hover:text-white"[39m
[31m+           >[39m
[31m+             <span>Advanced routing</span>[39m
[31m+             <span className="text-cyan-200">{advancedOpen ? 'Hide' : 'Auto'}</span>[39m
[31m+           </button>[39m
[31m+[39m
[31m+           {advancedOpen && ([39m
[31m+             <Panel title="Advanced routing">[39m
[31m+               <div className="grid gap-3">[39m
[31m+                 <label className="grid gap-1.5">[39m
[31m+                   <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Provider</span>[39m
[31m+                   <select value={provider} onChange={(event) => setProvider(event.target.value)} className="dark-select">[39m
[31m+                     <option value="auto">Auto route</option>[39m
[31m+                     {APPROVED_AI_PROVIDERS.map((item) => <option key={item.key} value={item.key}>{item.displayName}</option>)}[39m
[31m+                   </select>[39m
[31m+                 </label>[39m
[31m+[39m
[31m+                 <label className="grid gap-1.5">[39m
[31m+                   <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Model</span>[39m
[31m+                   <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="dark-select">[39m
[31m+                     <option value="auto">Auto model</option>[39m
[31m+                     {modelOptions.map((item: (typeof modelOptions)[number]) => ([39m
[31m+                       <option key={item.modelId} value={item.modelId}>{providerLabel(item.provider)} · {item.displayName ?? item.modelId}</option>[39m
[31m+                     ))}[39m
[31m+                   </select>[39m
[31m+                 </label>[39m
[31m+               </div>[39m
[31m+             </Panel>[39m
[31m+           )}[39m
[31m+         </div>[39m
[31m+[39m
[31m+         <div className="space-y-4">[39m
[31m+           <Panel title={mode.label}>[39m
[31m+             {mode.id === 'stt' ? ([39m
[31m+               <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/45 p-4 text-sm font-bold text-slate-300 hover:border-cyan-300/30">[39m
[31m+                 <span className="flex items-center gap-2">[39m
[31m+                   <Upload className="h-4 w-4 text-cyan-200" />[39m
[31m+                   {uploadFile?.name ?? 'Choose audio or video file'}[39m
[31m+                 </span>[39m
[31m+                 <input type="file" accept="audio/*,video/*" className="hidden" onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)} />[39m
[31m+               </label>[39m
[31m+             ) : ([39m
[31m+               <textarea[39m
[31m+                 value={prompt}[39m
[31m+                 onChange={(event) => setPrompt(event.target.value)}[39m
[31m+                 placeholder={mode.placeholder}[39m
[31m+                 className="min-h-[150px] w-full resize-y rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-300/30"[39m
[31m+               />[39m
[31m+             )}[39m
[31m+[39m
[31m+             <ModeControls[39m
[31m+               mode={mode}[39m
[31m+               mediaSize={mediaSize}[39m
[31m+               setMediaSize={setMediaSize}[39m
[31m+               musicGenre={musicGenre}[39m
[31m+               setMusicGenre={setMusicGenre}[39m
[31m+               musicVocals={musicVocals}[39m
[31m+               setMusicVocals={setMusicVocals}[39m
[31m+               musicTempo={musicTempo}[39m
[31m+               setMusicTempo={setMusicTempo}[39m
[31m+               musicMood={musicMood}[39m
[31m+               setMusicMood={setMusicMood}[39m
[31m+               voiceType={voiceType}[39m
[31m+               setVoiceType={setVoiceType}[39m
[31m+               duration={duration}[39m
[31m+               setDuration={setDuration}[39m
[31m+               aspectRatio={aspectRatio}[39m
[31m+               setAspectRatio={setAspectRatio}[39m
[31m+               avatarStyle={avatarStyle}[39m
[31m+               setAvatarStyle={setAvatarStyle}[39m
[31m+             />[39m
[31m+[39m
[31m+             <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">[39m
[31m+               <button[39m
[31m+                 type="button"[39m
[31m+                 onClick={run}[39m
[31m+                 disabled={!canRun || running}[39m
[31m+                 className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"[39m
[31m+               >[39m
[31m+                 {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}[39m
[31m+                 {running ? 'Running' : mode.action}[39m
[31m+               </button>[39m
[31m+               <p className="text-xs font-bold text-slate-500">{status}</p>[39m
[31m+             </div>[39m
[31m+           </Panel>[39m
[31m+[39m
[31m+           <Panel title="Result">[39m
[31m+             <ResultPreview result={result} />[39m
[31m+             <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">[39m
[31m+               <Fact label="Provider" value={providerLabel(String(result?.provider ?? executionProvider ?? 'auto'))} />[39m
[31m+               <Fact label="Model" value={String(result?.model ?? executionModel ?? 'auto')} />[39m
[31m+               <Fact label="Status" value={jobStatus || String(result?.status ?? result?.jobStatus ?? 'waiting')} />[39m
[31m+             </div>[39m
[31m+           </Panel>[39m
[31m+         </div>[39m
[31m+       </section>[39m
[31m+[39m
[31m+     </div>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ function ModeControls(props: {[39m
[31m+   mode: Mode[39m
[31m+   mediaSize: string[39m
[31m+   setMediaSize: (value: string) => void[39m
[31m+   musicGenre: string[39m
[31m+   setMusicGenre: (value: string) => void[39m
[31m+   musicVocals: string[39m
[31m+   setMusicVocals: (value: string) => void[39m
[31m+   musicTempo: string[39m
[31m+   setMusicTempo: (value: string) => void[39m
[31m+   musicMood: string[39m
[31m+   setMusicMood: (value: string) => void[39m
[31m+   voiceType: string[39m
[31m+   setVoiceType: (value: string) => void[39m
[31m+   duration: string[39m
[31m+   setDuration: (value: string) => void[39m
[31m+   aspectRatio: string[39m
[31m+   setAspectRatio: (value: string) => void[39m
[31m+   avatarStyle: string[39m
[31m+   setAvatarStyle: (value: string) => void[39m
[31m+ }) {[39m
[31m+   if (props.mode.id === 'image_generation') {[39m
[31m+     return ([39m
[31m+       <div className="mt-4 grid gap-3 sm:grid-cols-2">[39m
[31m+         <Select label="Size" value={props.mediaSize} onChange={props.setMediaSize} options={['1024x1024', '1024x1536', '1536x1024']} />[39m
[31m+       </div>[39m
[31m+     )[39m
[31m+   }[39m
[31m+[39m
[31m+   if (props.mode.id === 'music_generation') {[39m
[31m+     return ([39m
[31m+       <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">[39m
[31m+         <Select label="Genre" value={props.musicGenre} onChange={props.setMusicGenre} options={[...MUSIC_GENRES]} />[39m
[31m+         <Select label="Vocals" value={props.musicVocals} onChange={props.setMusicVocals} options={['female', 'male', 'duet', 'instrumental']} />[39m
[31m+         <Select label="Tempo" value={props.musicTempo} onChange={props.setMusicTempo} options={['slow', 'medium', 'fast']} />[39m
[31m+         <TextInput label="Mood" value={props.musicMood} onChange={props.setMusicMood} placeholder="uplifting, emotional..." />[39m
[31m+       </div>[39m
[31m+     )[39m
[31m+   }[39m
[31m+[39m
[31m+   if (props.mode.id === 'video_generation') {[39m
[31m+     return ([39m
[31m+       <div className="mt-4 grid gap-3 sm:grid-cols-2">[39m
[31m+         <Select label="Duration" value={props.duration} onChange={props.setDuration} options={['8', '12', '20', '30']} />[39m
[31m+         <Select label="Aspect" value={props.aspectRatio} onChange={props.setAspectRatio} options={['16:9', '9:16', '1:1']} />[39m
[31m+       </div>[39m
[31m+     )[39m
[31m+   }[39m
[31m+[39m
[31m+   if (props.mode.id === 'avatar_video') {[39m
[31m+     return ([39m
[31m+       <div className="mt-4 grid gap-3 sm:grid-cols-2">[39m
[31m+         <TextInput label="Avatar style" value={props.avatarStyle} onChange={props.setAvatarStyle} placeholder="professional presenter" />[39m
[31m+         <Select label="Voice" value={props.voiceType} onChange={props.setVoiceType} options={[...VOICE_TYPES]} />[39m
[31m+       </div>[39m
[31m+     )[39m
[31m+   }[39m
[31m+[39m
[31m+   if (props.mode.id === 'tts') {[39m
[31m+     return ([39m
[31m+       <div className="mt-4 grid gap-3 sm:grid-cols-2">[39m
[31m+         <Select label="Voice" value={props.voiceType} onChange={props.setVoiceType} options={[...VOICE_TYPES]} />[39m
[31m+       </div>[39m
[31m+     )[39m
[31m+   }[39m
[31m+[39m
[31m+   return null[39m
[31m+ }[39m
[31m+[39m
[31m+ function ResultPreview({ result }: { result: ApiResult | null }) {[39m
[31m+   if (!result) {[39m
[31m+     return <p className="rounded-2xl border border-dashed border-white/10 p-5 text-sm text-slate-500">Result appears here after a run.</p>[39m
[31m+   }[39m
[31m+[39m
[31m+   const url = resultUrl(result)[39m
[31m+   const text = resultText(result)[39m
[31m+[39m
[31m+   if (result.blocker || result.error) {[39m
[31m+     return ([39m
[31m+       <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-xs leading-5 text-amber-100">[39m
[31m+         {String(result.blocker ?? result.error)}[39m
[31m+       </pre>[39m
[31m+     )[39m
[31m+   }[39m
[31m+[39m
[31m+   if (isImageUrl(url)) {[39m
[31m+     // eslint-disable-next-line @next/next/no-img-element[39m
[31m+     return <img src={url} alt="Generated result" className="max-h-[420px] w-full rounded-2xl border border-white/10 object-contain" />[39m
[31m+   }[39m
[31m+[39m
[31m+   if (isAudioUrl(url)) {[39m
[31m+     return <audio controls src={url} className="w-full" />[39m
[31m+   }[39m
[31m+[39m
[31m+   if (isVideoUrl(url)) {[39m
[31m+     return <video controls src={url} className="max-h-[420px] w-full rounded-2xl border border-white/10 bg-black" />[39m
[31m+   }[39m
[31m+[39m
[31m+   if (url) {[39m
[31m+     return <a href={url} className="inline-flex rounded-xl border border-cyan-300/25 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-100">Open generated file</a>[39m
[31m+   }[39m
[31m+[39m
[31m+   return ([39m
[31m+     <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-2xl border border-white/10 bg-slate-950/55 p-4 text-xs leading-5 text-slate-300">[39m
[31m+       {text || JSON.stringify(result, null, 2)}[39m
[31m+     </pre>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ function resultUrl(result: ApiResult) {[39m
[31m+   const nested = result.result ?? {}[39m
[31m+   const artifact = result.artifact ?? {}[39m
[31m+[39m
[31m+   for (const value of [[39m
[31m+     result.storageUrl,[39m
[31m+     result.mediaUrl,[39m
[31m+     result.imageUrl,[39m
[31m+     result.audioUrl,[39m
[31m+     result.videoUrl,[39m
[31m+     artifact.storageUrl,[39m
[31m+     nested.storageUrl,[39m
[31m+     nested.mediaUrl,[39m
[31m+     nested.imageUrl,[39m
[31m+     nested.audioUrl,[39m
[31m+     nested.videoUrl,[39m
[31m+   ]) {[39m
[31m+     if (typeof value === 'string' && value) return value[39m
[31m+   }[39m
[31m+[39m
[31m+   return ''[39m
[31m+ }[39m
[31m+[39m
[31m+ function resultText(result: ApiResult) {[39m
[31m+   const nested = result.result ?? {}[39m
[31m+[39m
[31m+   for (const value of [[39m
[31m+     result.transcript,[39m
[31m+     nested.transcript,[39m
[31m+     nested.text,[39m
[31m+     nested.content,[39m
[31m+     nested.answer,[39m
[31m+     nested.message,[39m
[31m+     result.workbenchUrl ? `Workbench handoff saved:\n${result.workbenchUrl}` : '',[39m
[31m+   ]) {[39m
[31m+     if (typeof value === 'string' && value.trim()) return value[39m
[31m+   }[39m
[31m+[39m
[31m+   return ''[39m
[31m+ }[39m
[31m+[39m
[31m+ function statusMessage(result: ApiResult) {[39m
[31m+   if (result.artifactId) return `Artifact saved: ${result.artifactId}`[39m
[31m+   if (result.pollUrl) return 'Job started'[39m
[31m+   if (result.workbenchUrl) return 'Workbench handoff saved'[39m
[31m+   if (result.storageUrl || result.mediaUrl || result.imageUrl || result.audioUrl || result.videoUrl) return 'Generated result ready'[39m
[31m+   return 'Run complete'[39m
[31m+ }[39m
[31m+[39m
[31m+ function isImageUrl(url: string) {[39m
[31m+   return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || url.startsWith('data:image/')[39m
[31m+ }[39m
[31m+[39m
[31m+ function isAudioUrl(url: string) {[39m
[31m+   return /\.(mp3|mpeg|wav|ogg|m4a|aac)(\?|$)/i.test(url) || url.startsWith('data:audio/')[39m
[31m+ }[39m
[31m+[39m
[31m+ function isVideoUrl(url: string) {[39m
[31m+   return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.startsWith('data:video/')[39m
[31m+ }[39m
[31m+[39m
[31m+ function Panel({ title, children }: { title: string; children: React.ReactNode }) {[39m
[31m+   return ([39m
[31m+     <section className="rounded-2xl border border-white/10 bg-[rgba(5,10,18,.62)] p-4 backdrop-blur-xl">[39m
[31m+       <h2 className="text-sm font-black text-white">{title}</h2>[39m
[31m+       <div className="mt-3">{children}</div>[39m
[31m+     </section>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {[39m
[31m+   return ([39m
[31m+     <label className="grid gap-1.5">[39m
[31m+       <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>[39m
[31m+       <select value={value} onChange={(event) => onChange(event.target.value)} className="dark-select">[39m
[31m+         {options.map((option) => <option key={option} value={option}>{option}</option>)}[39m
[31m+       </select>[39m
[31m+     </label>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ function TextInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {[39m
[31m+   return ([39m
[31m+     <label className="grid gap-1.5">[39m
[31m+       <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>[39m
[31m+       <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="dark-input" />[39m
[31m+     </label>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m
[31m+ function Fact({ label, value }: { label: string; value: string }) {[39m
[31m+   return ([39m
[31m+     <div className="rounded-xl border border-white/10 bg-slate-950/45 p-3">[39m
[31m+       <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>[39m
[31m+       <p className="mt-1 truncate font-bold text-slate-300">{value}</p>[39m
[31m+     </div>[39m
[31m+   )[39m
[31m+ }[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:[2m52:22[22m[39m
    [90m 50|[39m     [35mconst[39m studio [33m=[39m [34mread[39m([32m'app/admin/dashboard/studio/page.tsx'[39m)
    [90m 51|[39m     for (const label of ['Adult Text', 'Adult Image', 'Adult Video', '…
    [90m 52|[39m       [34mexpect[39m(studio)[33m.[39m[34mtoContain[39m(label)
    [90m   |[39m                      [31m^[39m
    [90m 53|[39m     }
    [90m 54|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[93/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts[2m > [22mstandalone dashboard product shell[2m > [22mdoes not integrate external product apps
[31m[1mAssertionError[22m: expected 'import {\n  GitPullRequest,\n  Home,\…' not to contain 'Connected Apps'[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- Connected Apps[39m
[31m+ import {[39m
[31m+   GitPullRequest,[39m
[31m+   Home,[39m
[31m+   Library,[39m
[31m+   Rocket,[39m
[31m+   Settings2,[39m
[31m+   Sparkles,[39m
[31m+   Workflow,[39m
[31m+ } from 'lucide-react'[39m
[31m+ import type { ComponentType, SVGProps } from 'react'[39m
[31m+[39m
[31m+ export type DashboardSectionId =[39m
[31m+   | 'home'[39m
[31m+   | 'playground'[39m
[31m+   | 'repo-workbench'[39m
[31m+   | 'app-builder'[39m
[31m+   | 'outputs'[39m
[31m+   | 'connected-apps'[39m
[31m+   | 'control-center'[39m
[31m+[39m
[31m+ export type DashboardNavItem = {[39m
[31m+   id: DashboardSectionId[39m
[31m+   href: string[39m
[31m+   label: string[39m
[31m+   description: string[39m
[31m+   icon: ComponentType<SVGProps<SVGSVGElement>>[39m
[31m+ }[39m
[31m+[39m
[31m+ export const DASHBOARD_NAV_ITEMS: readonly DashboardNavItem[] = [[39m
[31m+   {[39m
[31m+     id: 'home',[39m
[31m+     href: '/admin/dashboard',[39m
[31m+     label: 'Home',[39m
[31m+     description: 'Start here.',[39m
[31m+     icon: Home,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'playground',[39m
[31m+     href: '/admin/dashboard/studio',[39m
[31m+     label: 'Playground',[39m
[31m+     description: 'Generate with AI.',[39m
[31m+     icon: Sparkles,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'repo-workbench',[39m
[31m+     href: '/admin/dashboard/workbench',[39m
[31m+     label: 'Repo Workbench',[39m
[31m+     description: 'Fix and deploy code.',[39m
[31m+     icon: GitPullRequest,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'app-builder',[39m
[31m+     href: '/admin/dashboard/app-builder',[39m
[31m+     label: 'App Builder',[39m
[31m+     description: 'Build connected apps.',[39m
[31m+     icon: Rocket,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'outputs',[39m
[31m+     href: '/admin/dashboard/outputs',[39m
[31m+     label: 'Outputs',[39m
[31m+     description: 'View created work.',[39m
[31m+     icon: Library,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'connected-apps',[39m
[31m+     href: '/admin/dashboard/network-apps',[39m
[31m+     label: 'Connected Apps',[39m
[31m+     description: 'Manage app access.',[39m
[31m+     icon: Workflow,[39m
[31m+   },[39m
[31m+   {[39m
[31m+     id: 'control-center',[39m
[31m+     href: '/admin/dashboard/settings',[39m
[31m+     label: 'Control Center',[39m
[31m+     description: 'Providers, system, logs.',[39m
[31m+     icon: Settings2,[39m
[31m+   },[39m
[31m+ ] as const[39m
[31m+[39m
[31m+ export const CONTROL_CENTER_ROUTES = [[39m
[31m+   '/admin/dashboard/settings',[39m
[31m+   '/admin/dashboard/operations',[39m
[31m+   '/admin/dashboard/system',[39m
[31m+ ] as const[39m
[31m+[39m

[36m [2m❯[22m src/lib/__tests__/standalone-core-media-dashboard-fix.test.ts:[2m70:21[22m[39m
    [90m 68|[39m     [34mexpect[39m(nav)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'Marketing'[39m)
    [90m 69|[39m     [34mexpect[39m(nav)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'Crypto'[39m)
    [90m 70|[39m     [34mexpect[39m(nav)[33m.[39mnot[33m.[39m[34mtoContain[39m([32m'Connected Apps'[39m)
    [90m   |[39m                     [31m^[39m
    [90m 71|[39m   })
    [90m 72|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[94/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Truth[2m > [22mvideo_planning models exist with supports_video_planning flag
[31m[1mAssertionError[22m: expected 3 to be greater than or equal to 6[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m55:35[22m[39m
    [90m 53|[39m     [35mconst[39m all [33m=[39m [34mgetModelRegistry[39m()
    [90m 54|[39m     const planningModels = all.filter((m) => 'supports_video_planning'…
    [90m 55|[39m     expect(planningModels.length).toBeGreaterThanOrEqual(6) // GPT-4o,…
    [90m   |[39m                                   [31m^[39m
    [90m 56|[39m   })
    [90m 57|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[95/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Truth[2m > [22mvideo_planning models span multiple providers
[31m[1mAssertionError[22m: expected 1 to be greater than or equal to 2[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m62:28[22m[39m
    [90m 60|[39m     const planningModels = all.filter((m) => 'supports_video_planning'…
    [90m 61|[39m     [35mconst[39m providers [33m=[39m [35mnew[39m [33mSet[39m(planningModels[33m.[39m[34mmap[39m((m) [33m=>[39m m[33m.[39mprovider))
    [90m 62|[39m     [34mexpect[39m(providers[33m.[39msize)[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m2[39m)
    [90m   |[39m                            [31m^[39m
    [90m 63|[39m     [34mexpect[39m(providers)[33m.[39m[34mtoContain[39m([32m'gemini'[39m)
    [90m 64|[39m     [34mexpect[39m(providers)[33m.[39m[34mtoContain[39m([32m'openai'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[96/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Truth[2m > [22mGemini models with video planning have specialist domain flag
[31m[1mAssertionError[22m: expected 0 to be greater than or equal to 4[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m77:35[22m[39m
    [90m 75|[39m     [35mconst[39m gemini [33m=[39m [34mgetModelsByProvider[39m([32m'gemini'[39m)
    [90m 76|[39m     const planningModels = gemini.filter((m) => 'supports_video_planni…
    [90m 77|[39m     expect(planningModels.length).toBeGreaterThanOrEqual(4) // 1.5 Pro…
    [90m   |[39m                                   [31m^[39m
    [90m 78|[39m   })
    [90m 79|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[97/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Truth[2m > [22mOpenAI models with video planning include GPT-4o
[31m[1mAssertionError[22m: expected [] to include 'gpt-4o'[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m84:17[22m[39m
    [90m 82|[39m     const planningModels = openai.filter((m) => 'supports_video_planni…
    [90m 83|[39m     [35mconst[39m ids [33m=[39m planningModels[33m.[39m[34mmap[39m((m) [33m=>[39m m[33m.[39mmodel_id)
    [90m 84|[39m     [34mexpect[39m(ids)[33m.[39m[34mtoContain[39m([32m'gpt-4o'[39m)
    [90m   |[39m                 [31m^[39m
    [90m 85|[39m   })
    [90m 86|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[98/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Model Coverage[2m > [22mGPT-4o has supports_video_planning
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m234:19[22m[39m
    [90m232|[39m   [34mit[39m([32m'GPT-4o has supports_video_planning'[39m[33m,[39m () [33m=>[39m {
    [90m233|[39m     const model = getModelRegistry().find((m) => m.model_id === 'gpt-4…
    [90m234|[39m     [34mexpect[39m(model)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                   [31m^[39m
    [90m235|[39m     [34mexpect[39m(model[33m![39m[33m.[39msupports_video_planning)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m236|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[99/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Model Coverage[2m > [22mGemini 1.5 Pro has supports_video_planning
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m240:19[22m[39m
    [90m238|[39m   [34mit[39m([32m'Gemini 1.5 Pro has supports_video_planning'[39m[33m,[39m () [33m=>[39m {
    [90m239|[39m     const model = getModelRegistry().find((m) => m.model_id === 'gemin…
    [90m240|[39m     [34mexpect[39m(model)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                   [31m^[39m
    [90m241|[39m     [34mexpect[39m(model[33m![39m[33m.[39msupports_video_planning)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m242|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[100/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Model Coverage[2m > [22mGemini 2.0 Flash has supports_video_planning
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m246:19[22m[39m
    [90m244|[39m   [34mit[39m([32m'Gemini 2.0 Flash has supports_video_planning'[39m[33m,[39m () [33m=>[39m {
    [90m245|[39m     const model = getModelRegistry().find((m) => m.model_id === 'gemin…
    [90m246|[39m     [34mexpect[39m(model)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                   [31m^[39m
    [90m247|[39m     [34mexpect[39m(model[33m![39m[33m.[39msupports_video_planning)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m248|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[101/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Model Coverage[2m > [22mGemini 2.5 Pro Preview has supports_video_planning
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m252:19[22m[39m
    [90m250|[39m   [34mit[39m([32m'Gemini 2.5 Pro Preview has supports_video_planning'[39m[33m,[39m () [33m=>[39m {
    [90m251|[39m     const model = getModelRegistry().find((m) => m.model_id === 'gemin…
    [90m252|[39m     [34mexpect[39m(model)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                   [31m^[39m
    [90m253|[39m     [34mexpect[39m(model[33m![39m[33m.[39msupports_video_planning)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m254|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[102/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Model Coverage[2m > [22mo4-mini has supports_video_planning
[31m[1mAssertionError[22m: expected undefined to be defined[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m258:19[22m[39m
    [90m256|[39m   [34mit[39m([32m'o4-mini has supports_video_planning'[39m[33m,[39m () [33m=>[39m {
    [90m257|[39m     const model = getModelRegistry().find((m) => m.model_id === 'o4-mi…
    [90m258|[39m     [34mexpect[39m(model)[33m.[39m[34mtoBeDefined[39m()
    [90m   |[39m                   [31m^[39m
    [90m259|[39m     [34mexpect[39m(model[33m![39m[33m.[39msupports_video_planning)[33m.[39m[34mtoBe[39m([35mtrue[39m)
    [90m260|[39m   })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[103/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/video-capability.test.ts[2m > [22mVideo Planning Model Coverage[2m > [22mtotal models with supports_video_planning >= 6
[31m[1mAssertionError[22m: expected 3 to be greater than or equal to 6[39m
[36m [2m❯[22m src/lib/__tests__/video-capability.test.ts:[2m265:19[22m[39m
    [90m263|[39m     [35mconst[39m all [33m=[39m [34mgetModelRegistry[39m()
    [90m264|[39m     const count = all.filter((m) => 'supports_video_planning' in m && …
    [90m265|[39m     [34mexpect[39m(count)[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m6[39m)
    [90m   |[39m                   [31m^[39m
    [90m266|[39m   })
    [90m267|[39m })

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[104/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/voice-expansion.test.ts[2m > [22mSTT Expansion[2m > [22mSTT models span 6 providers
[31m[1mAssertionError[22m: expected 3 to be 6 // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 6[39m
[31m+ 3[39m

[36m [2m❯[22m src/lib/__tests__/voice-expansion.test.ts:[2m84:28[22m[39m
    [90m 82|[39m     const stt = all.filter((m) => 'supports_stt' in m && m.supports_st…
    [90m 83|[39m     [35mconst[39m providers [33m=[39m [35mnew[39m [33mSet[39m(stt[33m.[39m[34mmap[39m((m) [33m=>[39m m[33m.[39mprovider))
    [90m 84|[39m     [34mexpect[39m(providers[33m.[39msize)[33m.[39m[34mtoBe[39m([34m6[39m)
    [90m   |[39m                            [31m^[39m
    [90m 85|[39m     [34mexpect[39m(providers)[33m.[39m[34mtoContain[39m([32m'groq'[39m)
    [90m 86|[39m     [34mexpect[39m(providers)[33m.[39m[34mtoContain[39m([32m'openai'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[105/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/voice-expansion.test.ts[2m > [22mTTS Expansion[2m > [22mhas >= 7 total TTS models across all providers
[31m[1mAssertionError[22m: expected 5 to be greater than or equal to 7[39m
[36m [2m❯[22m src/lib/__tests__/voice-expansion.test.ts:[2m102:24[22m[39m
    [90m100|[39m     [35mconst[39m all [33m=[39m [34mgetModelRegistry[39m()
    [90m101|[39m     const tts = all.filter((m) => 'supports_tts' in m && m.supports_tt…
    [90m102|[39m     [34mexpect[39m(tts[33m.[39mlength)[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m7[39m)
    [90m   |[39m                        [31m^[39m
    [90m103|[39m   })
    [90m104|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[106/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/voice-expansion.test.ts[2m > [22mTTS Expansion[2m > [22mTTS models span 5 providers
[31m[1mAssertionError[22m: expected 2 to be 5 // Object.is equality[39m

[32m- Expected[39m
[31m+ Received[39m

[32m- 5[39m
[31m+ 2[39m

[36m [2m❯[22m src/lib/__tests__/voice-expansion.test.ts:[2m147:28[22m[39m
    [90m145|[39m     const tts = all.filter((m) => 'supports_tts' in m && m.supports_tt…
    [90m146|[39m     [35mconst[39m providers [33m=[39m [35mnew[39m [33mSet[39m(tts[33m.[39m[34mmap[39m((m) [33m=>[39m m[33m.[39mprovider))
    [90m147|[39m     [34mexpect[39m(providers[33m.[39msize)[33m.[39m[34mtoBe[39m([34m5[39m)
    [90m   |[39m                            [31m^[39m
    [90m148|[39m     [34mexpect[39m(providers)[33m.[39m[34mtoContain[39m([32m'groq'[39m)
    [90m149|[39m     [34mexpect[39m(providers)[33m.[39m[34mtoContain[39m([32m'openai'[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[107/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/voice-expansion.test.ts[2m > [22mFallback Chain Depth[2m > [22mSTT fallback chain covers 4 providers: Groq → OpenAI → Gemini → HuggingFace
[31m[1mTypeError[22m: actual value must be number or bigint, received "undefined"[39m
[36m [2m❯[22m src/lib/__tests__/voice-expansion.test.ts:[2m169:38[22m[39m
    [90m167|[39m     }
    [90m168|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'groq'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m3[39m)
    [90m169|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'openai'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m1[39m)
    [90m   |[39m                                      [31m^[39m
    [90m170|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'gemini'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m1[39m)
    [90m171|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'huggingface'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m2[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[108/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/voice-expansion.test.ts[2m > [22mFallback Chain Depth[2m > [22mTTS fallback chain covers 4 providers: Groq → OpenAI → Gemini → HuggingFace
[31m[1mTypeError[22m: actual value must be number or bigint, received "undefined"[39m
[36m [2m❯[22m src/lib/__tests__/voice-expansion.test.ts:[2m182:38[22m[39m
    [90m180|[39m     }
    [90m181|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'groq'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m2[39m)
    [90m182|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'openai'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m2[39m)
    [90m   |[39m                                      [31m^[39m
    [90m183|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'gemini'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m1[39m)
    [90m184|[39m     [34mexpect[39m(byProvider[33m.[39m[35mget[39m([32m'huggingface'[39m))[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m2[39m)

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[109/110]⎯[22m[39m

[41m[1m FAIL [22m[49m src/lib/__tests__/voice-expansion.test.ts[2m > [22mTotal Voice Model Count[2m > [22mtotal voice models (STT + TTS) is >= 14
[31m[1mAssertionError[22m: expected 12 to be greater than or equal to 14[39m
[36m [2m❯[22m src/lib/__tests__/voice-expansion.test.ts:[2m353:26[22m[39m
    [90m351|[39m       (m) => ('supports_stt' in m && m.supports_stt) || ('supports_tts…
    [90m352|[39m     )
    [90m353|[39m     [34mexpect[39m(voice[33m.[39mlength)[33m.[39m[34mtoBeGreaterThanOrEqual[39m([34m14[39m)
    [90m   |[39m                          [31m^[39m
    [90m354|[39m   })
    [90m355|[39m

[31m[2m⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[110/110]⎯[22m[39m


[2m Test Files [22m [1m[31m22 failed[39m[22m[2m | [22m[1m[32m29 passed[39m[22m[90m (51)[39m
[2m      Tests [22m [1m[31m110 failed[39m[22m[2m | [22m[1m[32m1145 passed[39m[22m[90m (1255)[39m
[2m   Start at [22m 10:25:32
[2m   Duration [22m 10.25s[2m (transform 4.56s, setup 0ms, import 10.36s, tests 6.68s, environment 9ms)[22m

```

## 9. Failed test files
```text
[2m Test Files [22m [1m[31m22 failed[39m[22m[2m | [22m[1m[32m29 passed[39m[22m[90m (51)[39m
```

## 10. Typecheck
```text
typecheck_exit=0
```

## 11. Build
```text

> amarktai-network@1.0.0 build
> next build

   ▲ Next.js 15.5.19

   Creating an optimized production build ...
 ✓ Compiled successfully in 20.9s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/198) ...
   Generating static pages (49/198) 
   Generating static pages (98/198) 
   Generating static pages (148/198) 
 ✓ Generating static pages (198/198)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                                   Size  First Load JS
┌ ○ /                                                      4.56 kB         110 kB
├ ○ /_not-found                                              995 B         103 kB
├ ○ /about                                                 2.27 kB         108 kB
├ ƒ /admin/dashboard                                         165 B         106 kB
├ ○ /admin/dashboard/agents                                  676 B         103 kB
├ ○ /admin/dashboard/app-builder                            2.4 kB         108 kB
├ ○ /admin/dashboard/apps-agents                             676 B         103 kB
├ ○ /admin/dashboard/command                                 676 B         103 kB
├ ○ /admin/dashboard/memory                                   2 kB         104 kB
├ ○ /admin/dashboard/memory-learning                          2 kB         104 kB
├ ○ /admin/dashboard/network-apps                            676 B         103 kB
├ ○ /admin/dashboard/operations                              676 B         103 kB
├ ƒ /admin/dashboard/outputs                               5.47 kB         108 kB
├ ○ /admin/dashboard/settings                              3.26 kB         106 kB
├ ○ /admin/dashboard/studio                                6.51 kB         115 kB
├ ○ /admin/dashboard/system                                  676 B         103 kB
├ ○ /admin/dashboard/workbench                             7.35 kB         112 kB
├ ○ /admin/dashboard/workspace                             6.12 kB         112 kB
├ ○ /admin/login                                           2.74 kB         105 kB
├ ○ /admin/voice-login                                       448 B         103 kB
├ ƒ /api/admin/agents                                        676 B         103 kB
├ ƒ /api/admin/ai-capabilities                               676 B         103 kB
├ ƒ /api/admin/ai-model-catalog                              676 B         103 kB
├ ƒ /api/admin/ai-partner/chat                               676 B         103 kB
├ ƒ /api/admin/ai-partner/context                            676 B         103 kB
├ ƒ /api/admin/ai-routing                                    676 B         103 kB
├ ƒ /api/admin/ai-routing/smart                              676 B         103 kB
├ ƒ /api/admin/ai/apply                                      676 B         103 kB
├ ƒ /api/admin/ai/diff                                       676 B         103 kB
├ ƒ /api/admin/alerts                                        676 B         103 kB
├ ƒ /api/admin/amarktai-assistant/chat                       676 B         103 kB
├ ƒ /api/admin/amarktai-assistant/context                    676 B         103 kB
├ ƒ /api/admin/amarktai-assistant/memory                     676 B         103 kB
├ ƒ /api/admin/amarktai-assistant/stream                     676 B         103 kB
├ ƒ /api/admin/amarktai-assistant/tts                        676 B         103 kB
├ ƒ /api/admin/app-agents                                    676 B         103 kB
├ ƒ /api/admin/app-agents/[slug]                             676 B         103 kB
├ ƒ /api/admin/app-agents/[slug]/crawl                       676 B         103 kB
├ ƒ /api/admin/app-agents/[slug]/learning                    676 B         103 kB
├ ƒ /api/admin/app-ai-package                                676 B         103 kB
├ ƒ /api/admin/app-ai-package/recommend                      676 B         103 kB
├ ƒ /api/admin/app-budgets                                   676 B         103 kB
├ ƒ /api/admin/app-builder/projects                          676 B         103 kB
├ ƒ /api/admin/app-discovery                                 676 B         103 kB
├ ƒ /api/admin/app-health                                    676 B         103 kB
├ ƒ /api/admin/app-profiles                                  676 B         103 kB
├ ƒ /api/admin/app-safety                                    676 B         103 kB
├ ƒ /api/admin/approvals                                     676 B         103 kB
├ ƒ /api/admin/approvals/[id]/approve                        676 B         103 kB
├ ƒ /api/admin/approvals/[id]/reject                         676 B         103 kB
├ ƒ /api/admin/apps                                          676 B         103 kB
├ ƒ /api/admin/apps/intelligence                             676 B         103 kB
├ ƒ /api/admin/artifacts                                     676 B         103 kB
├ ƒ /api/admin/artifacts/media                               676 B         103 kB
├ ƒ /api/admin/benchmark                                     676 B         103 kB
├ ƒ /api/admin/brain/events                                  676 B         103 kB
├ ƒ /api/admin/brain/test                                    676 B         103 kB
├ ƒ /api/admin/budgets                                       676 B         103 kB
├ ƒ /api/admin/command                                       676 B         103 kB
├ ƒ /api/admin/compare                                       676 B         103 kB
├ ƒ /api/admin/contacts                                      676 B         103 kB
├ ƒ /api/admin/conversation/stream                           676 B         103 kB
├ ƒ /api/admin/costs                                         676 B         103 kB
├ ƒ /api/admin/dashboard                                     676 B         103 kB
├ ƒ /api/admin/deploy/direct-vps                             676 B         103 kB
├ ƒ /api/admin/emotions                                      676 B         103 kB
├ ƒ /api/admin/events                                        676 B         103 kB
├ ƒ /api/admin/events/[traceId]                              676 B         103 kB
├ ƒ /api/admin/genx/status                                   676 B         103 kB
├ ƒ /api/admin/geo                                           676 B         103 kB
├ ƒ /api/admin/global-adult-mode                             676 B         103 kB
├ ƒ /api/admin/healing                                       676 B         103 kB
├ ƒ /api/admin/integration-hub                               676 B         103 kB
├ ƒ /api/admin/integration-keys                              676 B         103 kB
├ ƒ /api/admin/integrations                                  676 B         103 kB
├ ƒ /api/admin/integrations-status                           676 B         103 kB
├ ƒ /api/admin/integrations/[id]                             676 B         103 kB
├ ƒ /api/admin/jobs                                          676 B         103 kB
├ ƒ /api/admin/labs                                          676 B         103 kB
├ ƒ /api/admin/learning                                      676 B         103 kB
├ ƒ /api/admin/login                                         676 B         103 kB
├ ƒ /api/admin/logout                                        676 B         103 kB
├ ƒ /api/admin/managers                                      676 B         103 kB
├ ƒ /api/admin/media-studio/models                           676 B         103 kB
├ ƒ /api/admin/memory                                        676 B         103 kB
├ ƒ /api/admin/memory/manage                                 676 B         103 kB
├ ƒ /api/admin/models                                        676 B         103 kB
├ ƒ /api/admin/monetization                                  676 B         103 kB
├ ƒ /api/admin/multimodal                                    676 B         103 kB
├ ƒ /api/admin/music-studio                                  676 B         103 kB
├ ƒ /api/admin/music-studio/jobs/[jobId]                     676 B         103 kB
├ ƒ /api/admin/network-apps                                  676 B         103 kB
├ ƒ /api/admin/onboarding                                    676 B         103 kB
├ ƒ /api/admin/playground                                    676 B         103 kB
├ ƒ /api/admin/playground/[id]                               676 B         103 kB
├ ƒ /api/admin/products                                      676 B         103 kB
├ ƒ /api/admin/products/[id]                                 676 B         103 kB
├ ƒ /api/admin/provider-capability-test                      676 B         103 kB
├ ƒ /api/admin/provider-contracts                            676 B         103 kB
├ ƒ /api/admin/provider-governance                           676 B         103 kB
├ ƒ /api/admin/provider-mesh/truth                           676 B         103 kB
├ ƒ /api/admin/provider-scores                               676 B         103 kB
├ ƒ /api/admin/provider-stream-test                          676 B         103 kB
├ ƒ /api/admin/provider-universe-truth                       676 B         103 kB
├ ƒ /api/admin/providers                                     676 B         103 kB
├ ƒ /api/admin/providers/[id]                                676 B         103 kB
├ ƒ /api/admin/providers/[id]/health-check                   676 B         103 kB
├ ƒ /api/admin/providers/catalog                             676 B         103 kB
├ ƒ /api/admin/providers/health-check-all                    676 B         103 kB
├ ƒ /api/admin/quick-access                                  676 B         103 kB
├ ƒ /api/admin/readiness                                     676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]                  676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/apply-patch      676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/audit            676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/branch           676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/branches         676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/checks           676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/clear-logs       676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/commit           676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/deploy           676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/deploy/status    676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/diff             676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/file             676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/merge            676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/patch            676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/plan             676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/pr               676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/pr-status        676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/pull             676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/push             676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/reset            676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/run              676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/run-check        676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/status           676 B         103 kB
├ ƒ /api/admin/repo-workbench/[workspaceId]/tree             676 B         103 kB
├ ƒ /api/admin/repo-workbench/github/branches                676 B         103 kB
├ ƒ /api/admin/repo-workbench/github/prs                     676 B         103 kB
├ ƒ /api/admin/repo-workbench/github/repos                   676 B         103 kB
├ ƒ /api/admin/repo-workbench/github/status                  676 B         103 kB
├ ƒ /api/admin/repo-workbench/import                         676 B         103 kB
├ ƒ /api/admin/repo-workbench/jobs/[jobId]                   676 B         103 kB
├ ƒ /api/admin/repo-workbench/jobs/[jobId]/logs              676 B         103 kB
├ ƒ /api/admin/repo-workbench/jobs/latest                    676 B         103 kB
├ ƒ /api/admin/repo-workbench/models                         676 B         103 kB
├ ƒ /api/admin/repo-workbench/repos                          676 B         103 kB
├ ƒ /api/admin/repo-workbench/safe-test                      676 B         103 kB
├ ƒ /api/admin/repo-workbench/simple                         676 B         103 kB
├ ƒ /api/admin/repo-workbench/status                         676 B         103 kB
├ ƒ /api/admin/research/assist                               676 B         103 kB
├ ƒ /api/admin/research/jobs                                 676 B         103 kB
├ ƒ /api/admin/research/opportunity                          676 B         103 kB
├ ƒ /api/admin/research/send-to-repo-workbench               676 B         103 kB
├ ƒ /api/admin/research/status                               676 B         103 kB
├ ƒ /api/admin/research/url                                  676 B         103 kB
├ ƒ /api/admin/retrieval                                     676 B         103 kB
├ ƒ /api/admin/routing                                       676 B         103 kB
├ ƒ /api/admin/routing-profiles                              676 B         103 kB
├ ƒ /api/admin/runtime-truth                                 676 B         103 kB
├ ƒ /api/admin/sdk                                           676 B         103 kB
├ ƒ /api/admin/sdk/download                                  676 B         103 kB
├ ƒ /api/admin/settings/integrations                         676 B         103 kB
├ ƒ /api/admin/settings/key                                  676 B         103 kB
├ ƒ /api/admin/settings/reset-approved-keys                  676 B         103 kB
├ ƒ /api/admin/settings/status                               676 B         103 kB
├ ƒ /api/admin/settings/test-adult                           676 B         103 kB
├ ƒ /api/admin/settings/test-genx                            676 B         103 kB
├ ƒ /api/admin/settings/test-github                          676 B         103 kB
├ ƒ /api/admin/settings/test-groq                            676 B         103 kB
├ ƒ /api/admin/settings/test-huggingface                     676 B         103 kB
├ ƒ /api/admin/settings/test-minimax                         676 B         103 kB
├ ƒ /api/admin/settings/test-openai                          676 B         103 kB
├ ƒ /api/admin/settings/test-provider                        676 B         103 kB
├ ƒ /api/admin/settings/test-qwen                            676 B         103 kB
├ ƒ /api/admin/settings/test-redis                           676 B         103 kB
├ ƒ /api/admin/settings/test-smtp                            676 B         103 kB
├ ƒ /api/admin/settings/test-storage                         676 B         103 kB
├ ƒ /api/admin/settings/test-together                        676 B         103 kB
├ ƒ /api/admin/settings/test-webdock                         676 B         103 kB
├ ƒ /api/admin/skill-templates                               676 B         103 kB
├ ƒ /api/admin/smart-home                                    676 B         103 kB
├ ƒ /api/admin/specialist/huggingface                        676 B         103 kB
├ ƒ /api/admin/specialist/minimax-tts                        676 B         103 kB
├ ƒ /api/admin/specialist/qwen-wanx-image                    676 B         103 kB
├ ƒ /api/admin/specialist/qwen-wanx-task                     676 B         103 kB
├ ƒ /api/admin/strategy                                      676 B         103 kB
├ ƒ /api/admin/studio/execute                                676 B         103 kB
├ ƒ /api/admin/studio/stt                                    676 B         103 kB
├ ƒ /api/admin/studio/workbench-handoff                      676 B         103 kB
├ ƒ /api/admin/system/capabilities                           676 B         103 kB
├ ƒ /api/admin/system/jobs                                   676 B         103 kB
├ ƒ /api/admin/system/live-readiness                         676 B         103 kB
├ ƒ /api/admin/system/logs                                   676 B         103 kB
├ ƒ /api/admin/system/readiness                              676 B         103 kB
├ ƒ /api/admin/system/services                               676 B         103 kB
├ ƒ /api/admin/system/status                                 676 B         103 kB
├ ƒ /api/admin/system/vps                                    676 B         103 kB
├ ƒ /api/admin/teams                                         676 B         103 kB
├ ƒ /api/admin/tool-registry                                 676 B         103 kB
├ ƒ /api/admin/truth                                         676 B         103 kB
├ ƒ /api/admin/usage                                         676 B         103 kB
├ ƒ /api/admin/voice-access-settings                         676 B         103 kB
├ ƒ /api/admin/voice-login                                   676 B         103 kB
├ ƒ /api/admin/voice-persona                                 676 B         103 kB
├ ƒ /api/admin/voice/options                                 676 B         103 kB
├ ƒ /api/admin/voice/preview                                 676 B         103 kB
├ ƒ /api/admin/vps                                           676 B         103 kB
├ ƒ /api/admin/waitlist                                      676 B         103 kB
├ ƒ /api/admin/workspace/config                              676 B         103 kB
├ ƒ /api/admin/workspace/run                                 676 B         103 kB
├ ƒ /api/apps                                                676 B         103 kB
├ ƒ /api/artifacts/file/[...key]                             676 B         103 kB
├ ƒ /api/batch                                               676 B         103 kB
├ ƒ /api/brain/adult-image                                   676 B         103 kB
├ ƒ /api/brain/adult-text                                    676 B         103 kB
├ ƒ /api/brain/agent-request                                 676 B         103 kB
├ ƒ /api/brain/agent/dispatch                                676 B         103 kB
├ ƒ /api/brain/avatar-video                                  676 B         103 kB
├ ƒ /api/brain/embeddings                                    676 B         103 kB
├ ƒ /api/brain/execute                                       676 B         103 kB
├ ƒ /api/brain/image                                         676 B         103 kB
├ ƒ /api/brain/image-edit                                    676 B         103 kB
├ ƒ /api/brain/media-jobs/[jobId]                            676 B         103 kB
├ ƒ /api/brain/moderation                                    676 B         103 kB
├ ƒ /api/brain/relay                                         676 B         103 kB
├ ƒ /api/brain/request                                       676 B         103 kB
├ ƒ /api/brain/rerank                                        676 B         103 kB
├ ƒ /api/brain/research                                      676 B         103 kB
├ ƒ /api/brain/stream                                        676 B         103 kB
├ ƒ /api/brain/stt                                           676 B         103 kB
├ ƒ /api/brain/suggestive-image                              676 B         103 kB
├ ƒ /api/brain/suggestive-video                              676 B         103 kB
├ ƒ /api/brain/suggestive-video-gen                          676 B         103 kB
├ ƒ /api/brain/tts                                           676 B         103 kB
├ ƒ /api/brain/video                                         676 B         103 kB
├ ƒ /api/brain/video-generate                                676 B         103 kB
├ ƒ /api/brain/video-generate/[jobId]                        676 B         103 kB
├ ƒ /api/contact                                             676 B         103 kB
├ ƒ /api/emotions                                            676 B         103 kB
├ ƒ /api/fine-tune                                           676 B         103 kB
├ ƒ /api/guardrails                                          676 B         103 kB
├ ƒ /api/health                                              676 B         103 kB
├ ƒ /api/health/ping                                         676 B         103 kB
├ ƒ /api/integrations/events                                 676 B         103 kB
├ ƒ /api/integrations/heartbeat                              676 B         103 kB
├ ƒ /api/integrations/metrics                                676 B         103 kB
├ ƒ /api/integrations/vps-resources                          676 B         103 kB
├ ƒ /api/prompts                                             676 B         103 kB
├ ƒ /api/rag                                                 676 B         103 kB
├ ƒ /api/realtime/health                                     676 B         103 kB
├ ƒ /api/realtime/session                                    676 B         103 kB
├ ƒ /api/system/events                                       676 B         103 kB
├ ƒ /api/system/health-deep                                  676 B         103 kB
├ ƒ /api/tools                                               676 B         103 kB
├ ƒ /api/voice/stt                                           676 B         103 kB
├ ƒ /api/voice/tts                                           676 B         103 kB
├ ƒ /api/waitlist                                            676 B         103 kB
├ ƒ /api/webhooks                                            676 B         103 kB
├ ƒ /api/workflows                                           676 B         103 kB
├ ○ /apps                                                    676 B         103 kB
├ ○ /contact                                               3.62 kB         109 kB
├ ○ /network-apps                                          2.28 kB         108 kB
├ ○ /platform                                              2.28 kB         108 kB
├ ○ /privacy                                               2.27 kB         108 kB
├ ○ /terms                                                 2.27 kB         108 kB
└ ○ /voice-access                                            676 B         103 kB
+ First Load JS shared by all                               102 kB
  ├ chunks/1255-5c680abb9db89955.js                        46.2 kB
  ├ chunks/4bd1b696-f785427dddbba9fb.js                    54.2 kB
  └ other shared chunks (total)                            1.94 kB


ƒ Middleware                                               38.5 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

build_exit=0
```

## 12. Non-production reports currently in repo
```text
reports/audits/amarktai-platform-capability-audit-20260608-090611.txt
reports/audits/dashboard-design-foundation-20260608-112439.txt
reports/audits/dashboard-section-map-20260608-111717.txt
reports/audits/focused-provider-agent-doc-truth-20260608-165711.txt
reports/audits/model-provider-orchestration-audit-20260608-164408.txt
reports/audits/playground-section-truth-20260608-093109.txt
reports/audits/playground-studio-section-audit-20260608-141254.txt
reports/launch/session-0-source-truth-audit-20260609-102530.md
```

## 13. Recommended repair order

1. Clean branch/source-of-truth and decide whether reports/audits stay or move.
2. Unify provider governance and env alias truth.
3. Unify runtime capability truth.
4. Unify model universe/model registry/catalog truth.
5. Fix voice/video/media model coverage.
6. Fix route planner and health-aware model selection.
7. Run full npm test, npx tsc --noEmit, npm run build.
8. Only then continue OpenHands/repo-workbench and frontend redesign.
