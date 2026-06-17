import {
  canonicalAgentType,
  getAgentDefinitions,
  type AgentDefinition,
  type AgentType,
} from './agent-runtime'

export type AgentReadiness = 'READY' | 'PARTIAL' | 'NOT_CONNECTED'

export interface AgentAuditEntry {
  agentType: AgentType
  name: string
  readiness: AgentReadiness
  reasons: string[]
  definitionExists: boolean
  providerRegistered: boolean
  defaultProvider: string
  defaultModel: string
  providerHealth: 'dynamic_discovery' | 'unknown'
  providerCallable: boolean
  modelExists: boolean
  capabilityCount: number
  canHandoff: AgentType[]
  memoryEnabled: boolean
}

export interface AgentAuditSummary {
  total: number
  ready: number
  partial: number
  notConnected: number
  auditedAt: string
}

export interface AgentAuditResult {
  agents: AgentAuditEntry[]
  summary: AgentAuditSummary
}

function auditAgent(definition: AgentDefinition): AgentAuditEntry {
  const reasons = [
    `Compatibility role maps to canonical "${canonicalAgentType(definition.type)}".`,
    'Provider and model readiness are resolved per request by canonical live discovery.',
    'This audit is a diagnostic registration check, not runtime capability execution proof.',
  ]
  const missingHandoffs = definition.canHandoff.filter((target) => !getAgentDefinitions().has(target))
  for (const target of definition.canHandoff) {
    if (!getAgentDefinitions().has(target)) {
      reasons.push(`Handoff target "${target}" is not registered.`)
    }
  }
  return {
    agentType: definition.type,
    name: definition.name,
    readiness: missingHandoffs.length === 0 ? 'READY' : 'NOT_CONNECTED',
    reasons,
    definitionExists: true,
    providerRegistered: true,
    defaultProvider: 'dynamic_discovery',
    defaultModel: 'dynamic_discovery',
    providerHealth: 'dynamic_discovery',
    providerCallable: missingHandoffs.length === 0,
    modelExists: missingHandoffs.length === 0,
    capabilityCount: definition.capabilities.length,
    canHandoff: definition.canHandoff,
    memoryEnabled: definition.memoryEnabled,
  }
}

export function auditAllAgents(): AgentAuditResult {
  const agents = Array.from(getAgentDefinitions().values(), auditAgent)
  return {
    agents,
    summary: {
      total: agents.length,
      ready: agents.filter((agent) => agent.readiness === 'READY').length,
      partial: agents.filter((agent) => agent.readiness === 'PARTIAL').length,
      notConnected: agents.filter((agent) => agent.readiness === 'NOT_CONNECTED').length,
      auditedAt: new Date().toISOString(),
    },
  }
}

export function getAgentReadiness(agentType: AgentType): AgentAuditEntry | null {
  const definition = getAgentDefinitions().get(agentType)
  return definition ? auditAgent(definition) : null
}
