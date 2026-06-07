import { APPROVED_AI_PROVIDERS } from '@/lib/approved-ai-catalog'
import { getAllProviderModelCatalogs } from '@/lib/ai-model-catalog'
import { getUniversalModelCatalog } from '@/lib/universal-model-catalog'
import { getModelBrainTruth } from '@/lib/ai-brain-router'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { getProviderKeyWithSource } from '@/lib/provider-config'
import { testLocalTool, type LocalToolResult } from '@/lib/local-tools'

const LOCAL_TOOL_IDS: LocalToolResult['id'][] = [
  'local-crawler',
  'playwright',
  'scrapy',
  'trafilatura',
  'ffmpeg',
  'rhubarb',
  'storage',
]

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : []
}

function countProviderLiveDisabled(models: Array<{ source?: string; enabled?: boolean }>): number {
  return models.filter((model) => model.source === 'provider_live' && model.enabled !== true).length
}

function countProviderLiveEnabled(models: Array<{ source?: string; enabled?: boolean }>): number {
  return models.filter((model) => model.source === 'provider_live' && model.enabled === true).length
}

function countStaticEnabled(models: Array<{ source?: string; enabled?: boolean }>): number {
  return models.filter((model) => model.source === 'static' && model.enabled === true).length
}

export async function getProviderUniverseTruth() {
  const [catalogs, universal, brain] = await Promise.all([
    getAllProviderModelCatalogs(),
    getUniversalModelCatalog(),
    getModelBrainTruth(),
  ])

  const providers = await Promise.all(
    APPROVED_AI_PROVIDERS.map(async (provider) => {
      const catalog = catalogs.find((entry) => entry.provider === provider.key)
      const models = safeArray(catalog?.models)
      const brainCounts = brain.counts.byProvider[provider.key] ?? {
        discovered: 0,
        tested: 0,
        approved: 0,
        routed: 0,
      }

      const keyInfo = await getProviderKeyWithSource(provider.key).catch(() => null)

      return {
        key: provider.key,
        displayName: provider.displayName,
        configured: Boolean(catalog?.configured),
        keySource: keyInfo?.source ?? 'unknown',
        liveDiscovery: {
          supported: Boolean(catalog?.supportsLiveDiscovery),
          status: catalog?.liveDiscoveryStatus ?? 'unknown',
          liveDiscovered: models.filter((model) => model.source === 'provider_live').length,
          liveEnabled: countProviderLiveEnabled(models),
          liveDisabled: countProviderLiveDisabled(models),
        },
        catalog: {
          modelCount: models.length,
          staticEnabled: countStaticEnabled(models),
          recommendedDefaults: catalog?.recommendedDefaults ?? {},
          notes: catalog?.notes ?? [],
        },
        brain: brainCounts,
        activeRouting: {
          approved: brainCounts.approved,
          routed: brainCounts.routed,
          discoveredButNotRouted: Math.max(0, brainCounts.discovered - brainCounts.routed),
        },
      }
    }),
  )

  const localTools = await Promise.all(
    LOCAL_TOOL_IDS.map(async (id) => {
      const result = await testLocalTool(id).catch((err: unknown) => ({
        id,
        ok: false,
        connected: false,
        capabilities: [],
        detail: err instanceof Error ? err.message : String(err),
      }))
      return result
    }),
  )

  const mediaRoutes = Object.entries(MEDIA_CAPABILITY_ROUTES).map(([capability, route]) => ({
    capability,
    artifactType: route.artifactType,
    providers: route.providers.map((provider) => ({
      provider: provider.provider,
      model: provider.model,
    })),
  }))

  const duplicateTruthSystems = [
    'approved-ai-catalog.ts',
    'ai-model-catalog.ts',
    'universal-model-catalog.ts',
    'provider-capability-governance.ts',
    'live-ai-routing.ts',
    'model-registry.ts',
    'providers.ts',
    'media-capability-registry.ts',
    'tool-registry.ts',
    'tool-runtime.ts',
    'local-tools.ts',
  ]

  const gaps = [
    {
      key: 'genx_catalog_merge',
      status: providers.find((provider) => provider.key === 'genx')?.catalog.modelCount ?? 0,
      note: 'GenX live catalog exists through the GenX client/universal path, but provider catalog display still needs explicit live merge proof.',
    },
    {
      key: 'together_live_discovery',
      status: providers.find((provider) => provider.key === 'together')?.liveDiscovery,
      note: 'Together static routes exist. Live /models discovery must be proven with vault-resolved key path and parser output before claiming full coverage.',
    },
    {
      key: 'huggingface_hub_search',
      status: providers.find((provider) => provider.key === 'huggingface')?.liveDiscovery,
      note: 'Hugging Face router-visible models are discovered. Hub-wide task search/pagination is not yet a routed production source.',
    },
    {
      key: 'tool_inventory',
      status: localTools,
      note: 'Local tools are tested separately from model routing. Repo/GitHub/OpenHands-style agent tools still need first-class truth rows.',
    },
  ]

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      providers: providers.length,
      configuredProviders: providers.filter((provider) => provider.configured).length,
      catalogModels: catalogs.reduce((sum, catalog) => sum + safeArray(catalog.models).length, 0),
      universalModels: universal.models.length,
      brainDiscoveredModels: brain.counts.discovered,
      brainApprovedModels: brain.counts.approved,
      brainRoutedModels: brain.counts.routed,
      liveDiscoveredDisabledModels: providers.reduce((sum, provider) => sum + provider.liveDiscovery.liveDisabled, 0),
      discoveredOnlyModels: Math.max(0, brain.counts.discovered - brain.counts.routed),
      mediaRoutes: mediaRoutes.length,
      localTools: localTools.length,
      localToolsOk: localTools.filter((tool) => {
        const normalized = tool as { ok?: boolean; connected?: boolean }
        return normalized.ok === true || normalized.connected === true
      }).length,
    },
    providers,
    brain: {
      counts: brain.counts,
      promotion: {
        discoveredOnly: Math.max(0, brain.counts.discovered - brain.counts.routed),
        approvedRouted: brain.counts.routed,
        liveDiscoveredDisabled: providers.reduce((sum, provider) => sum + provider.liveDiscovery.liveDisabled, 0),
        reason: 'Live-discovered provider models are visible to the brain but are not auto-routed until promoted by governance.',
        policy: [
          'Discover all configured provider model catalogs where supported.',
          'Do not auto-enable provider_live models.',
          'Route only curated static/governed models and proven media execution contracts.',
          'Promote additional models only after capability classification, execution path, artifact handling, and safety checks are known.',
        ],
      },
      fallbackChains: brain.fallbackChains,
    },
    mediaRoutes,
    tools: {
      local: localTools,
      note: 'This is the local runtime/tool layer only. GitHub/repo-agent/OpenHands-style tools must be surfaced in the next dashboard truth pass.',
    },
    sourceOfTruth: {
      canonicalEndpoint: '/api/admin/provider-universe-truth',
      duplicateTruthSystems,
      rule: 'Dashboard provider/model/tool UI should read this endpoint first, then drill into specialist endpoints only for details.',
    },
    gaps,
  }
}
