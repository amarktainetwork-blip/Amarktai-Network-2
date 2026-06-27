export type RouteTruthStatus = 'KEEP' | 'FIX' | 'DEPRECATED' | 'INTERNAL' | 'PUBLIC' | 'PROTECTED' | 'UNKNOWN'
export type RouteAuthPolicy = 'admin_session' | 'connected_app_token' | 'public_safe' | 'internal_only'

export interface PlatformRouteTruth {
  family: string
  routes: string[]
  purpose: string
  auth: RouteAuthPolicy
  status: RouteTruthStatus
  nextAction: string
}

export const PLATFORM_ROUTE_TRUTH: readonly PlatformRouteTruth[] = [
  {
    family: 'dashboard-pages',
    routes: [
      '/admin/dashboard',
      '/admin/dashboard/workbench',
      '/admin/dashboard/apps-agents',
      '/admin/dashboard/memory-learning',
      '/admin/dashboard/capabilities',
      '/admin/dashboard/settings',
    ],
    purpose: 'The six final dashboard sections.',
    auth: 'admin_session',
    status: 'KEEP',
    nextAction: 'Phase 2 wires Studio and Workbench deeper without adding top-level pages.',
  },
  {
    family: 'settings-truth',
    routes: ['/api/admin/settings/status', '/api/admin/settings/key', '/api/admin/settings/test-genx', '/api/admin/settings/test-github', '/api/admin/settings/test-storage', '/api/admin/settings/test-webdock'],
    purpose: 'Provider/tool key source, real configured counts, and test/status routes.',
    auth: 'admin_session',
    status: 'KEEP',
    nextAction: 'Add missing provider-specific live tests as keys become available.',
  },
  {
    family: 'model-routing',
    routes: ['/api/admin/ai-model-catalog', '/api/admin/ai-routing', '/api/admin/routing', '/api/admin/routing-profiles', '/api/admin/genx/status'],
    purpose: 'Universal catalog, live routing, legacy routing profiles, and GenX status.',
    auth: 'admin_session',
    status: 'FIX',
    nextAction: 'Phase 2 should make /api/admin/ai-routing the single execution-facing route and keep profile routes internal.',
  },
  {
    family: 'studio-assistant',
    routes: ['/api/admin/amarktai-assistant/stream', '/api/admin/amarktai-assistant/context', '/api/admin/amarktai-assistant/memory', '/api/admin/amarktai-assistant/tts', '/api/admin/conversation/stream'],
    purpose: 'Studio chat, dashboard context, conversation memory, and voice status.',
    auth: 'admin_session',
    status: 'FIX',
    nextAction: 'Phase 2 should wire media tabs to their backend routes and remove legacy conversation duplication.',
  },
  {
    family: 'brain-connected-app',
    routes: ['/api/brain/request', '/api/brain/stream', '/api/brain/image', '/api/brain/video-generate', '/api/brain/tts', '/api/brain/stt', '/api/brain/adult-text', '/api/brain/adult-image'],
    purpose: 'Connected-app AI gateway and media routes.',
    auth: 'connected_app_token',
    status: 'KEEP',
    nextAction: 'Keep public path only for app-token authenticated calls; admin Studio should use protected admin routes.',
  },
  {
    family: 'repo-workbench',
    routes: ['/api/admin/repo-workbench/status', '/api/admin/repo-workbench/github/repos', '/api/admin/repo-workbench/import', '/api/admin/repo-workbench/[workspaceId]/plan', '/api/admin/repo-workbench/[workspaceId]/patch', '/api/admin/repo-workbench/[workspaceId]/apply-patch', '/api/admin/repo-workbench/[workspaceId]/checks', '/api/admin/repo-workbench/[workspaceId]/commit', '/api/admin/repo-workbench/[workspaceId]/push', '/api/admin/repo-workbench/[workspaceId]/pr', '/api/admin/repo-workbench/[workspaceId]/merge', '/api/admin/repo-workbench/[workspaceId]/deploy'],
    purpose: 'Guarded prompt-to-PR workflow.',
    auth: 'admin_session',
    status: 'KEEP',
    nextAction: 'Phase 2 should add durable job rehydration before claiming persistence in the UI.',
  },
  {
    family: 'apps-agents',
    routes: ['/api/admin/apps', '/api/admin/app-ai-package', '/api/admin/app-ai-package/recommend', '/api/admin/agents', '/api/admin/app-agents'],
    purpose: 'App registry, app AI packages, recommendations, and canonical agents.',
    auth: 'admin_session',
    status: 'KEEP',
    nextAction: 'Phase 2 should add honest create/edit/assignment UI on top of these routes.',
  },
  {
    family: 'operations-storage',
    routes: ['/api/admin/runtime-truth', '/api/admin/tool-registry', '/api/admin/system/status', '/api/admin/vps', '/api/admin/costs', '/api/admin/jobs', '/api/admin/approvals', '/api/admin/artifacts'],
    purpose: 'Runtime truth, tools, VPS, costs, jobs, approvals, and artifacts.',
    auth: 'admin_session',
    status: 'KEEP',
    nextAction: 'Consolidate duplicate cost/system summaries only after live VPS proof.',
  },
  {
    family: 'tools',
    routes: ['/api/tools'],
    purpose: 'Internal tool listing/execution.',
    auth: 'admin_session',
    status: 'PROTECTED',
    nextAction: 'Expose connected-app tool execution later through scoped app tokens and audit logging.',
  },
] as const

export const DUPLICATE_ROUTE_FAMILIES = [
  'ai-routing/routing/routing-profiles',
  'providers/provider-status/model-catalog/genx-status',
  'assistant/brain/conversation-stream',
  'memory/manage/assistant-memory',
  'storage/local-json-store/storage-driver',
] as const

export function getRouteTruthByFamily(family: string): PlatformRouteTruth | undefined {
  return PLATFORM_ROUTE_TRUTH.find((entry) => entry.family === family)
}
