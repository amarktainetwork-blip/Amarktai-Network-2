import { NETWORK_APPS } from '@/lib/network-apps-registry'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

export async function getRuntimeTruth() {
  const runtime = await getDashboardRuntimeTruth()
  return {
    generatedAt: new Date().toISOString(),
    readiness: runtime,
    connectedCapabilities: runtime.capabilities.filter((entry) => entry.status === 'READY').map((entry) => entry.name),
    connections: runtime.providers,
    networkApps: NETWORK_APPS,
    warnings: runtime.blockers,
  }
}
