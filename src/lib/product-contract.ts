import { PROVIDER_MESH } from '@/lib/provider-mesh'

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

// Compatibility projection only. Provider identity remains canonical in provider-mesh.ts.
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
