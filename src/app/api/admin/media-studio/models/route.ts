import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getV1BrainRouteMatrix } from '@/lib/brain/v1-route-matrix'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const matrix = await getV1BrainRouteMatrix()
  const media = matrix.models
    .map((model) => {
      const category = mediaCategory(model.capabilities)
      if (!category) return null
      return {
        id: model.modelId,
        label: model.displayName,
        provider: model.provider,
        category,
        available: model.adapterImplemented && model.configured === true,
        costTier: model.costTier,
        blocker: model.adapterImplemented
          ? model.configured ? null : 'Provider is not configured or has not passed readiness.'
          : 'Discovered by the provider but no V1 adapter route is implemented.',
        inventoryStatus: model.inventoryStatus,
        wiredCapabilities: model.wiredCapabilities,
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    source: matrix.source,
    summary: matrix.summary,
    image: media.filter((model) => model?.category === 'image'),
    video: media.filter((model) => model?.category === 'video'),
    voice: media.filter((model) => model?.category === 'voice'),
    music: media.filter((model) => model?.category === 'music'),
  })
}

function mediaCategory(capabilities: readonly string[]) {
  if (capabilities.includes('music/audio')) return 'music'
  if (capabilities.includes('voice/TTS') || capabilities.includes('STT')) return 'voice'
  if (capabilities.includes('video')) return 'video'
  if (capabilities.includes('image')) return 'image'
  return null
}
