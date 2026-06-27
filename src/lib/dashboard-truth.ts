/**
 * @module dashboard-truth
 *
 * Retained exports:
 *   - State type enums (ProviderState, CapabilityState, ImplementationState)
 *   - ProviderTruth / CapabilityTruth / DashboardSummary interfaces (used as types by truth/route.ts)
 *   - CAP_TO_MODEL_FLAG  (used by platform-expansion.test.ts)
 *   - getModelTruth / ModelTruth  (used by truth/route.ts)
 *
 * Removed (replaced by canonical truth functions in provider-runtime-truth.ts
 * and capability-runtime-truth.ts):
 *   - getProviderTruth   → use getProviderRuntimeTruth()
 *   - getCapabilityTruth → use getCapabilityRuntimeTruth()
 *   - getDashboardSummary → derived inline in truth/route.ts
 *   - getActiveProviderCount → derive from getProviderRuntimeTruth()
 */

import {
  MODEL_REGISTRY,
  isProviderUsable,
} from './model-registry';

// ── State enums (kept as type exports) ───────────────────────────────────────

export type ProviderState =
  | 'AVAILABLE_IN_CATALOG'
  | 'CONFIGURED'
  | 'HEALTHY'
  | 'DEGRADED'
  | 'ERROR'
  | 'DISABLED';

export type CapabilityState =
  | 'AVAILABLE_NOW'
  | 'BLOCKED_BY_SETTINGS'
  | 'UNAVAILABLE_WITH_CURRENT_CONFIG'
  | 'NOT_IMPLEMENTED';

export type ImplementationState =
  | 'IMPLEMENTED_IN_PLATFORM'
  | 'AVAILABLE_IN_CATALOG'
  | 'CONFIGURED'
  | 'ACTIVE_NOW'
  | 'BLOCKED_BY_SETTINGS'
  | 'NOT_IMPLEMENTED';

// ── Shape interfaces (kept for truth/route.ts type-compatibility) ─────────────

export interface ProviderTruth {
  providerKey: string;
  displayName: string;
  state: ProviderState;
  isActive: boolean;
  launchRequired: boolean;
  healthStatus: string;
  healthMessage: string;
  lastCheckedAt: string | null;
  modelCount: number;
  supportedCapabilities: string[];
}

export interface CapabilityTruth {
  capability: string;
  displayName: string;
  category: string;
  state: CapabilityState;
  implementationState: ImplementationState;
  routeExists: boolean;
  hasCapableModel: boolean;
  hasActiveProvider: boolean;
  blockedBySettings: boolean;
  reason: string;
}

export interface ModelTruth {
  provider: string;
  modelId: string;
  displayName: string;
  category: string;
  isUsableNow: boolean;
  providerState: ProviderState;
  costTier: string;
  latencyTier: string;
  capabilities: string[];
}

export interface DashboardSummary {
  totalProviders: number;
  activeProviders: number;
  configuredProviders: number;
  totalModels: number;
  usableModels: number;
  totalCapabilities: number;
  availableCapabilities: number;
  blockedCapabilities: number;
  unavailableCapabilities: number;
  notImplemented: number;
  systemHealth: number;
  artifactCount: number;
  queueHealthy: boolean;
  storageDriver: string;
  managerAgentsActive: boolean;
  healthScore: number;
  circuitBreakersOpen: number;
  deadLetterQueueSize: number;
  unresolvedAlerts: number;
  criticalAlerts: number;
  sseListeners: number;
  providerReliabilityCount: number;
}

// ── CAP_TO_MODEL_FLAG — static map, no DB dependency ─────────────────────────
// Exported for testing and introspection only.

export const CAP_TO_MODEL_FLAG: Record<string, string> = {
  general_chat: 'supports_chat',
  deep_reasoning: 'supports_reasoning',
  coding: 'supports_code',
  image_generation: 'supports_image_generation',
  image_editing: 'supports_image_generation',
  voice_stt: 'supports_stt',
  voice_tts: 'supports_tts',
  realtime_voice: 'supports_voice_interaction',
  embeddings: 'supports_embeddings',
  reranking: 'supports_reranking',
  video_planning: 'supports_video_planning',
  video_generation: 'supports_video_generation',
  multimodal_vision: 'supports_vision',
  agent_planning: 'supports_agent_planning',
  multilingual: 'supports_multilingual',
  structured_output: 'supports_structured_output',
  tool_use: 'supports_tool_use',
  creative_writing: 'supports_chat',
  translation: 'supports_multilingual',
  summarization: 'supports_chat',
  code_review: 'supports_code',
  research_search: 'supports_tool_use',
  deep_research: 'supports_reasoning',
  suggestive_image_generation: 'supports_image_generation',
  suggestive_video_planning: 'supports_video_planning',
  suggestive_video_generation: 'supports_video_generation',
  moderation: 'supports_moderation',
  adult_18plus_image: 'supports_image_generation',
  workflow_automation: 'supports_chat',
  skill_templates: 'supports_chat',
  multi_agent_orchestration: 'supports_agent_planning',
  team_assistant: 'supports_agent_planning',
  agent_handoff: 'supports_agent_planning',
  integration_hub: 'supports_chat',
  email_triage: 'supports_chat',
  calendar_management: 'supports_chat',
  smart_home_control: 'supports_chat',
  device_automation: 'supports_chat',
  music_generation: 'supports_music_generation',
  lyrics_generation: 'supports_chat',
  music_cover_art: 'supports_image_generation',
  monetization: 'supports_chat',
  usage_analytics: 'supports_chat',
};

// ── getModelTruth — synchronous, reads static model-registry ─────────────────

export function getModelTruth(): ModelTruth[] {
  return MODEL_REGISTRY.map((m) => {
    const providerHealthy = isProviderUsable(m.provider);
    const providerState: ProviderState = providerHealthy ? 'HEALTHY' : 'AVAILABLE_IN_CATALOG';

    const caps: string[] = [];
    for (const [cap, flag] of Object.entries(CAP_TO_MODEL_FLAG)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((m as any)[flag] === true) caps.push(cap);
    }

    return {
      provider: m.provider,
      modelId: m.model_id,
      displayName: m.model_name,
      category: m.category,
      isUsableNow: providerHealthy && m.enabled,
      providerState,
      costTier: m.cost_tier,
      latencyTier: m.latency_tier,
      capabilities: caps,
    };
  });
}
