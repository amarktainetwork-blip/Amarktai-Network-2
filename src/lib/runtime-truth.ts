import { getPlatformSettingsTruth } from '@/lib/platform-settings-truth'
import { NETWORK_APPS } from '@/lib/network-apps-registry'

export async function getRuntimeTruth() {
  const settings = await getPlatformSettingsTruth()
  return {
    generatedAt: new Date().toISOString(),
    connectedCapabilities: [...new Set(settings.entries.filter((entry) => entry.connected).flatMap((entry) => entry.capabilities))],
    connections: settings.entries,
    networkApps: NETWORK_APPS,
    warnings: settings.entries
      .filter((entry) => !entry.optional && !entry.connected)
      .map((entry) => `${entry.label}: ${entry.blocker}`),
  }
}
