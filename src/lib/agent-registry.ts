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
    id: 'safety-policy-agent',
    name: 'Safety/Policy Agent',
    purpose: 'Checks app policy, adult capability settings, and approval requirements.',
    allowedCapabilities: ['moderation', 'reasoning', 'chat'],
    defaultModelStrategy: 'balanced',
    costMode: 'balanced',
    appScope: 'all apps',
    approvalRequirements: ['adult capability enablement', 'policy override'],
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
