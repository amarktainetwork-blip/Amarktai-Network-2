import { routeLiveModel, type AiCapability, type ModelStrategy } from '@/lib/live-ai-routing'
import type { CostMode } from '@/lib/approved-ai-catalog'

export interface OperatorAgent {
  id: string
  name: string
  purpose: string
  allowedCapabilities: AiCapability[]
  defaultModelStrategy: ModelStrategy
  costMode: CostMode
  appScope: string
  approvalRequirements: string[]
}

export const OPERATOR_AGENTS: readonly OperatorAgent[] = [
  {
    id: 'coding-agent',
    name: 'Coding Agent',
    purpose: 'Plans code changes, generates patches, and prepares repo updates for review.',
    allowedCapabilities: ['coding', 'reasoning', 'chat'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'repo workbench and assigned app packages',
    approvalRequirements: ['apply patch', 'commit', 'push', 'create PR'],
  },
  {
    id: 'code-review-agent',
    name: 'Code Review Agent',
    purpose: 'Reviews diffs, PRs, and patch quality — flags risks, style issues, and missing tests.',
    allowedCapabilities: ['coding', 'reasoning', 'chat'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'repo workbench',
    approvalRequirements: ['PR approval'],
  },
  {
    id: 'repo-audit-agent',
    name: 'Repo Audit Agent',
    purpose: 'Deep audit of architecture, go-live blockers, security, tests, and deployment readiness.',
    allowedCapabilities: ['coding', 'reasoning'],
    defaultModelStrategy: 'premium',
    costMode: 'premium',
    appScope: 'repo workbench',
    approvalRequirements: ['audit run approval'],
  },
  {
    id: 'deployment-agent',
    name: 'Deployment Agent',
    purpose: 'Handles Docker, systemd, VPS, Nginx, build scripts, health checks, and rollback.',
    allowedCapabilities: ['coding', 'reasoning'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'system and repo workbench',
    approvalRequirements: ['deploy', 'service restart', 'rollback'],
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    purpose: 'Collects web and app context through approved research tools.',
    allowedCapabilities: ['research', 'chat'],
    defaultModelStrategy: 'cheap',
    costMode: 'cheap',
    appScope: 'apps with research capability enabled',
    approvalRequirements: ['external crawl above app threshold'],
  },
  {
    id: 'scraping-agent',
    name: 'Scraping Agent',
    purpose: 'Performs structured web scraping and data extraction for research and enrichment.',
    allowedCapabilities: ['research', 'chat'],
    defaultModelStrategy: 'cheap',
    costMode: 'cheap',
    appScope: 'apps with research capability enabled',
    approvalRequirements: ['external crawl', 'data extraction approval'],
  },
  {
    id: 'creative-agent',
    name: 'Creative Agent',
    purpose: 'Drafts image, video, voice, and creative plans when the app package allows them.',
    allowedCapabilities: ['chat', 'image', 'video', 'voice_tts', 'avatar_video'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'creative-capable app packages',
    approvalRequirements: ['media run above threshold', 'avatar/video generation'],
  },
  {
    id: 'image-agent',
    name: 'Image Agent',
    purpose: 'Generates and edits images using approved GenX image models.',
    allowedCapabilities: ['image', 'chat'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'apps with image capability enabled',
    approvalRequirements: ['image generation above threshold'],
  },
  {
    id: 'video-agent',
    name: 'Video Agent',
    purpose: 'Generates video content and image-to-video clips using GenX video models.',
    allowedCapabilities: ['video', 'chat'],
    defaultModelStrategy: 'premium',
    costMode: 'premium',
    appScope: 'apps with video capability enabled',
    approvalRequirements: ['video generation approval'],
  },
  {
    id: 'music-audio-agent',
    name: 'Music/Audio Agent',
    purpose: 'Composes music, sound effects, and audio clips using GenX audio models.',
    allowedCapabilities: ['chat'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'apps with audio capability enabled',
    approvalRequirements: ['audio generation above threshold'],
  },
  {
    id: 'voice-agent',
    name: 'Voice Agent',
    purpose: 'Converts text to speech and handles voice UX using GenX TTS models.',
    allowedCapabilities: ['voice_tts', 'chat'],
    defaultModelStrategy: 'cheap',
    costMode: 'cheap',
    appScope: 'apps with voice_tts capability enabled',
    approvalRequirements: ['voice generation above threshold'],
  },
  {
    id: 'avatar-talking-video-agent',
    name: 'Avatar/Talking Video Agent',
    purpose: 'Creates talking avatar and lip-sync video using GenX avatar/video models.',
    allowedCapabilities: ['avatar_video', 'video', 'chat'],
    defaultModelStrategy: 'premium',
    costMode: 'premium',
    appScope: 'apps with avatar_video capability enabled',
    approvalRequirements: ['avatar generation approval'],
  },
  {
    id: 'marketing-agent',
    name: 'Marketing Agent',
    purpose: 'Helps prepare campaigns, app copy, and launch tasks.',
    allowedCapabilities: ['chat', 'research', 'image'],
    defaultModelStrategy: 'cheap',
    costMode: 'cheap',
    appScope: 'marketing app packages',
    approvalRequirements: ['external publish action', 'campaign spend'],
  },
  {
    id: 'app-operator-agent',
    name: 'App Operator Agent',
    purpose: 'Coordinates app setup, package selection, approvals, and routine operator work.',
    allowedCapabilities: ['chat', 'reasoning', 'coding'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'all assigned apps',
    approvalRequirements: ['app package save', 'repo write action'],
  },
  {
    id: 'system-vps-agent',
    name: 'System/VPS Agent',
    purpose: 'Explains VPS, storage, service, and deployment status for operators.',
    allowedCapabilities: ['chat', 'reasoning'],
    defaultModelStrategy: 'cheap',
    costMode: 'cheap',
    appScope: 'system dashboard',
    approvalRequirements: ['merge', 'deploy', 'service restart'],
  },
  {
    id: 'cost-budget-agent',
    name: 'Cost/Budget Agent',
    purpose: 'Monitors AI spend, enforces budget limits, and flags routes exceeding approval thresholds.',
    allowedCapabilities: ['chat', 'reasoning'],
    defaultModelStrategy: 'cheap',
    costMode: 'cheap',
    appScope: 'all apps',
    approvalRequirements: ['budget override'],
  },
  {
    id: 'safety-policy-agent',
    name: 'Safety/Policy Agent',
    purpose: 'Checks app policy, adult capability settings, and approval requirements.',
    allowedCapabilities: ['moderation', 'reasoning', 'chat'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'all apps',
    approvalRequirements: ['adult capability enablement', 'policy override'],
  },
  {
    id: 'adult-policy-agent',
    name: 'Adult Policy Agent',
    purpose: 'Enforces adult content gating, validates app adult policy, and gates adult model routes.',
    allowedCapabilities: ['moderation', 'reasoning'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'apps with adult policy enabled',
    approvalRequirements: ['adult content enablement', 'adult route activation'],
  },
  {
    id: 'memory-learning-agent',
    name: 'Memory/Learning Agent',
    purpose: 'Manages cross-session memory, cross-app learning, and knowledge enrichment.',
    allowedCapabilities: ['chat', 'reasoning'],
    defaultModelStrategy: 'cheap',
    costMode: 'cheap',
    appScope: 'all apps with memory enabled',
    approvalRequirements: ['memory write', 'cross-app data share'],
  },
  {
    id: 'qa-test-agent',
    name: 'QA/Test Agent',
    purpose: 'Runs tests, lint, build, and regression checks — flags failures and suggests fixes.',
    allowedCapabilities: ['coding', 'reasoning'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'repo workbench',
    approvalRequirements: ['test run approval'],
  },
  {
    id: 'product-ux-agent',
    name: 'Product/UX Agent',
    purpose: 'Reviews UI/UX quality, product flows, and user experience across dashboard and apps.',
    allowedCapabilities: ['chat', 'reasoning'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'all apps',
    approvalRequirements: ['product change approval'],
  },
] as const

export function listOperatorAgents(appSlug = 'dashboard') {
  return OPERATOR_AGENTS.map((agent) => {
    const route = routeLiveModel({
      capability: agent.allowedCapabilities[0],
      appSlug,
      costMode: agent.costMode,
      adultPolicy: agent.allowedCapabilities.some((capability) => capability.startsWith('adult_')) ? 'off' : undefined,
    })
    return {
      ...agent,
      surface: 'operator_catalog' as const,
      status: route.blockedReason ? 'unavailable' : 'available',
      executionRoute: route.blockedReason ? null : {
        provider: route.selectedProvider,
        model: route.selectedModel,
        reason: route.reason,
      },
      unavailableReason: route.blockedReason,
    }
  })
}

export function assignAgentToAppPackage(agentId: string, appSlug: string) {
  const agent = OPERATOR_AGENTS.find((entry) => entry.id === agentId)
  if (!agent) throw new Error('Unknown agent')
  return {
    agentId,
    appSlug: appSlug.toLowerCase().replace(/[^a-z0-9._-]+/g, '-'),
    assignedAt: new Date().toISOString(),
    allowedCapabilities: agent.allowedCapabilities,
    approvalRequirements: agent.approvalRequirements,
  }
}
