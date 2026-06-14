import {
  V1_CAPABILITY_MATRIX,
  type AiCapabilityDefinition,
  type AiCapabilityProviderRoute,
  type V1CapabilityReadiness,
} from '@/lib/brain/v1-capability-matrix'
import { getProviderCapabilityAdapter } from '@/lib/ai-capability-adapters'
import { getProviderReadiness } from '@/lib/provider-registry'
import {
  getUniversalModelCatalog,
  type UniversalModelRoute,
} from '@/lib/universal-model-catalog'
import type { ApprovedDirectProviderId } from '@/lib/provider-mesh'

export interface V1BrainInventoryModel extends UniversalModelRoute {
  adapterImplemented: boolean
  wiredCapabilities: string[]
  inventoryStatus: 'wired' | 'discovered_but_not_wired'
}

export interface V1BrainRouteEvidence {
  provider: ApprovedDirectProviderId
  model: string | null
  adapter: string
  adapterImplemented: boolean
  configured: boolean
  liveTestStatus: 'passed' | 'failed' | 'untested'
  liveTestedAt: string | null
  outputType: string
}

export interface V1BrainCapabilityRoute {
  id: string
  label: string
  group: string
  readiness: V1CapabilityReadiness
  inputRequirements: string[]
  requiredSourceInput: AiCapabilityDefinition['requiredSourceInput']
  outputType: string
  createsArtifact: boolean
  async: boolean
  selectedRoute: V1BrainRouteEvidence | null
  fallbackRoutes: V1BrainRouteEvidence[]
  modelsConsidered: V1BrainInventoryModel[]
  adapterImplemented: boolean
  blocker: string | null
  fallbackArtifactType: string | null
}

export async function getV1BrainRouteMatrix() {
  const catalog = await getUniversalModelCatalog()
  const providerIds = [...new Set(
    V1_CAPABILITY_MATRIX.flatMap((capability) =>
      capability.providerRoutes.map((route) => route.provider),
    ),
  )]
  const readinessEntries = await Promise.all(providerIds.map(async (provider) => [
    provider,
    await getProviderReadiness(provider),
  ] as const))
  const readiness = new Map(readinessEntries)
  const inventory = catalog.models.map((model): V1BrainInventoryModel => {
    const wiredCapabilities = V1_CAPABILITY_MATRIX
      .filter((capability) => capability.providerRoutes.some((route) =>
        route.provider === model.provider
        && route.executable
        && route.modelIds.includes(model.modelId),
      ))
      .map((capability) => capability.id)
    return {
      ...model,
      configured: readiness.get(model.provider)?.state === 'ready'
        || readiness.get(model.provider)?.state === 'configured_untested',
      adapterImplemented: wiredCapabilities.length > 0,
      wiredCapabilities,
      inventoryStatus: wiredCapabilities.length > 0 ? 'wired' : 'discovered_but_not_wired',
    }
  })
  const capabilities = V1_CAPABILITY_MATRIX.map((capability) =>
    enrichCapability(capability, inventory, readiness),
  )

  return {
    version: 'v1',
    source: 'src/lib/brain/v1-capability-matrix.ts',
    generatedAt: new Date().toISOString(),
    summary: {
      totalCapabilities: capabilities.length,
      totalModels: inventory.length,
      wiredModels: inventory.filter((model) => model.adapterImplemented).length,
      discoveredButNotWired: inventory.filter((model) => !model.adapterImplemented).length,
      byReadiness: countByReadiness(capabilities),
    },
    capabilities,
    models: inventory,
  }
}

function enrichCapability(
  capability: AiCapabilityDefinition,
  inventory: V1BrainInventoryModel[],
  readiness: Map<ApprovedDirectProviderId, Awaited<ReturnType<typeof getProviderReadiness>>>,
): V1BrainCapabilityRoute {
  const routes = capability.providerRoutes.map((route) => routeEvidence(route, readiness))
  const executable = routes.filter((route) => route.adapterImplemented)
  const configured = executable.filter((route) => route.configured)
  const selectedRoute = configured[0] ?? null
  let state = capability.readiness
  if (
    capability.adapterImplemented
    && capability.readiness !== 'needs_input'
    && configured.length === 0
  ) state = 'provider_config_missing'

  return {
    id: capability.id,
    label: capability.label,
    group: capability.group,
    readiness: state,
    inputRequirements: capability.requiredInputs,
    requiredSourceInput: capability.requiredSourceInput,
    outputType: capability.outputType,
    createsArtifact: capability.createsArtifact,
    async: capability.longRunning,
    selectedRoute,
    fallbackRoutes: selectedRoute ? configured.slice(1) : executable,
    modelsConsidered: inventory.filter((model) =>
      capability.providerRoutes.some((route) => route.provider === model.provider)
      && model.capabilities.some((group) => modelGroupMatches(capability, group)),
    ),
    adapterImplemented: capability.adapterImplemented,
    blocker: state === 'ready' || state === 'ready_with_fallback'
      ? null
      : capability.blocker,
    fallbackArtifactType: capability.fallbackArtifactType ?? null,
  }
}

function routeEvidence(
  route: AiCapabilityProviderRoute,
  readiness: Map<ApprovedDirectProviderId, Awaited<ReturnType<typeof getProviderReadiness>>>,
): V1BrainRouteEvidence {
  const provider = readiness.get(route.provider)
  const adapter = getProviderCapabilityAdapter(route.provider)
  return {
    provider: route.provider,
    model: route.modelIds[0] ?? null,
    adapter: route.adapter,
    adapterImplemented: route.executable && adapter?.id === route.adapter,
    configured: provider?.state === 'ready' || provider?.state === 'configured_untested',
    liveTestStatus: provider?.state === 'ready'
      ? 'passed'
      : provider?.state === 'misconfigured'
        ? 'failed'
        : 'untested',
    liveTestedAt: provider?.checkedAt ?? null,
    outputType: route.outputType,
  }
}

function modelGroupMatches(
  capability: AiCapabilityDefinition,
  group: UniversalModelRoute['capabilities'][number],
): boolean {
  if (capability.outputTypes.includes('video')) return group === 'video'
  if (capability.outputTypes.includes('image')) return group === 'image'
  if (capability.outputTypes.includes('audio') || capability.outputTypes.includes('music')) {
    return group === 'voice/TTS' || group === 'music/audio'
  }
  if (capability.outputTypes.includes('transcript')) return group === 'STT'
  return group === 'chat' || group === 'reasoning' || group === 'coding'
}

function countByReadiness(capabilities: V1BrainCapabilityRoute[]) {
  return capabilities.reduce<Record<V1CapabilityReadiness, number>>((counts, capability) => {
    counts[capability.readiness] += 1
    return counts
  }, {
    ready: 0,
    ready_with_fallback: 0,
    needs_input: 0,
    adapter_missing: 0,
    provider_config_missing: 0,
    blocked: 0,
    post_launch: 0,
  })
}
