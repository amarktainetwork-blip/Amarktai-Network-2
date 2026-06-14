import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [matrix, curated] = await Promise.all([
    getV1BrainRouteMatrix(),
    prisma.approvedModelRegistry.findMany({
      orderBy: [{ provider: 'asc' }, { modelId: 'asc' }],
    }),
  ])
  const provider = request.nextUrl.searchParams.get('provider')
  const category = request.nextUrl.searchParams.get('category')
  const enabledOnly = request.nextUrl.searchParams.get('enabled') === 'true'
  let models = matrix.models
  if (provider) models = models.filter((model) => model.provider === provider)
  if (category) models = models.filter((model) => modelCategory(model.capabilities) === category)
  if (enabledOnly) models = models.filter((model) => model.enabled)

  return NextResponse.json({
    models: models.map((model) => ({
      ...model,
      id: model.modelId,
      model_id: model.modelId,
      displayName: model.displayName,
      model_name: model.displayName,
      category: modelCategory(model.capabilities),
      health: model.configured ? 'configured' : 'unconfigured',
      effectiveHealth: model.configured ? 'configured' : 'unconfigured',
      runtimeProvider: model.provider,
      runtimeModelId: model.modelId,
      runtimeCapabilities: model.wiredCapabilities,
      capabilities: model.wiredCapabilities,
    })),
    total: models.length,
    registrySize: matrix.models.length,
    summary: matrix.summary,
    source: matrix.source,
    curatedProviderModels: curated,
    curatedProviderModelCount: curated.length,
    inventoryRule: 'Discovered models are not executable until approved, adapter-backed, and live-tested.',
  })
}

function modelCategory(capabilities: readonly string[]) {
  if (capabilities.includes('music/audio')) return 'music'
  if (capabilities.includes('voice/TTS') || capabilities.includes('STT')) return 'voice'
  if (capabilities.includes('video')) return 'video'
  if (capabilities.includes('image')) return 'image'
  if (capabilities.includes('coding')) return 'code'
  return 'text'
}
