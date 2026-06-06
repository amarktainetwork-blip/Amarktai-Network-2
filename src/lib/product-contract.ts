import { PROVIDER_MESH } from '@/lib/provider-mesh'

export const PRODUCT_POSITIONING =
  'Amarktai Network is the core AI operating system that plans, builds, monitors, repairs, and operates connected work from one intelligent workspace.'

export type CommandIntent =
  | 'create_song'
  | 'create_movie'
  | 'create_avatar'
  | 'create_voice'
  | 'create_image'
  | 'research_topic'
  | 'crawl_site'
  | 'build_new_app'
  | 'audit_repo'
  | 'fix_repo'
  | 'create_pr'
  | 'deploy_app'
  | 'monitor_vps'
  | 'check_system'
  | 'check_app_status'
  | 'repair_connected_app'
  | 'create_marketing_campaign'
  | 'run_crypto_analysis'
  | 'automate_workflow'
  | 'ask_question'
  | 'generate_file'
  | 'explain_status'

export type ProductSurface =
  | 'Workspace'
  | 'Studio'
  | 'Workbench'
  | 'App Builder'
  | 'Network Apps'
  | 'System'
  | 'Command'

export type AppReadiness = 'Live' | 'In build' | 'Planned' | 'Needs setup' | 'Blocked'

export interface NetworkAppDefinition {
  slug: string
  displayName: string
  status: AppReadiness
  purpose: string
  capabilities: string[]
  requiredProviders: string[]
  requiredAgents: string[]
  routes: string[]
  setupActions: string[]
  lastActivity: string | null
  readinessState: string
  sharedMemoryNamespace: string
  eventsEmitted: string[]
  eventsConsumed: string[]
  repairActions: string[]
  openHref: string
}

export const NETWORK_APPS: readonly NetworkAppDefinition[] = []

export interface ProviderContract {
  name: string
  key: string
  envAliases: string[]
  baseUrl: string
  authMethod: string
  capabilities: string[]
  asyncJobs: boolean
  polling: boolean
  webhooks: boolean
  artifacts: boolean
  defaultRoute: string
  status: 'primary' | 'specialist' | 'infrastructure'
  testRoute: string
  userFacingVisibility: 'settings' | 'system'
}

export const PROVIDER_CONTRACTS: readonly ProviderContract[] = PROVIDER_MESH.map((node) => ({
  name: node.displayName,
  key: node.id,
  envAliases: [...node.envAliases],
  baseUrl: node.baseUrl,
  authMethod: node.authMethod,
  capabilities: [...node.capabilities],
  asyncJobs: node.asyncJobs,
  polling: node.asyncJobs,
  webhooks: node.id === 'github',
  artifacts: node.artifactHandling !== 'none',
  defaultRoute: node.id === 'genx' ? 'Primary approved AI route' : `${node.displayName} capability route`,
  status: node.id === 'genx' ? 'primary' : node.kind === 'provider' ? 'specialist' : 'infrastructure',
  testRoute: node.testRoute,
  userFacingVisibility: node.kind === 'provider' ? 'settings' : 'system',
}))

export const REQUIRED_AGENT_NAMES = [
  'Network Orchestrator Agent',
  'Command Router Agent',
  'Repo Audit Agent',
  'Coding Agent',
  'Code Review Agent',
  'Deployment Agent',
  'Product Architect Agent',
  'UX/UI Designer Agent',
  'Frontend Builder Agent',
  'Backend Builder Agent',
  'App Builder Agent',
  'Media Director Agent',
  'Song Producer Agent',
  'Movie Director Agent',
  'Avatar Producer Agent',
  'Voice Producer Agent',
  'Research Agent',
  'Marketing Agent',
  'Crypto/Trading Agent',
  'Automation Agent',
  'Memory/Learning Agent',
  'Runtime Truth Agent',
  'Security Agent',
  'Repair Agent',
  'GitHub Agent',
  'VPS Monitor Agent',
] as const
