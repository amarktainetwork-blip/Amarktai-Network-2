import { buildProviderMeshTruth } from '@/lib/provider-mesh/registry'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import {
  getPrimarySetupProviders,
  getSpecialistSetupProviders,
  getAdvancedSetupProviders,
  getHiddenProviders,
  getBacklogProviders,
} from '@/lib/ai-provider-governance'
import { getCapabilityGovernanceMatrix } from '@/lib/provider-capability-governance'

export type ProviderUniverseTruth = Awaited<ReturnType<typeof getProviderUniverseTruth>>

/**
 * Compatibility adapter.
 *
 * Older dashboard/API code still calls provider-universe-truth, but this file
 * must not maintain its own provider/model truth anymore. It now composes the
 * canonical provider mesh, provider governance, runtime truth, and capability
 * governance layers.
 *
 * New code should prefer:
 * - /api/admin/provider-mesh/truth
 * - /api/admin/runtime-truth
 * - /api/admin/provider-governance
 * - /api/admin/ai-model-catalog
 */
export async function getProviderUniverseTruth() {
  const [runtime, mesh] = await Promise.all([
    getDashboardRuntimeTruth(),
    Promise.resolve(buildProviderMeshTruth()),
  ])

  const capabilityGovernance = getCapabilityGovernanceMatrix()

  return {
    success: true,
    source: 'canonical-adapter',
    deprecated: true,
    canonicalEndpoints: {
      providerMesh: '/api/admin/provider-mesh/truth',
      runtimeTruth: '/api/admin/runtime-truth',
      providerGovernance: '/api/admin/provider-governance',
      aiModelCatalog: '/api/admin/ai-model-catalog',
    },
    providers: {
      primary: getPrimarySetupProviders(),
      specialist: getSpecialistSetupProviders(),
      advanced: getAdvancedSetupProviders(),
      hidden: getHiddenProviders(),
      backlog: getBacklogProviders(),
      runtime: runtime.providers,
    },
    capabilities: {
      runtime: runtime.capabilities,
      governed: capabilityGovernance.capabilities,
      blocked: capabilityGovernance.blockedCapabilities,
      underused: capabilityGovernance.underusedCapabilities,
    },
    mesh,
    runtime,
    rootWorkspace: capabilityGovernance.rootWorkspace,
    summary: {
      runtimeProviders: runtime.providers.length,
      configuredProviders: runtime.providers.filter((provider) => provider.configured).length,
      runtimeCapabilities: runtime.capabilities.length,
      governedModels: capabilityGovernance.models.length,
      blockedCapabilities: capabilityGovernance.blockedCapabilities.length,
    },
    notes: [
      'provider-universe-truth is a compatibility adapter only.',
      'Provider/runtime/model availability is controlled by canonical governance and runtime truth.',
      'Do not add new provider/model logic here.',
    ],
  }
}
