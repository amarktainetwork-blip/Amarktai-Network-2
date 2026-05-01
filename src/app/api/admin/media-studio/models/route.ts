import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  GENX_AUDIO_MODELS,
  GENX_IMAGE_MODELS,
  GENX_TTS_MODELS,
  GENX_VIDEO_MODELS,
  getGenXStatusAsync,
  listGenXModels,
} from '@/lib/genx-client'

type MediaModel = {
  id: string
  label: string
  provider: string
  category: 'image' | 'video' | 'voice' | 'music'
  available: boolean
  costTier: 'low' | 'medium' | 'high' | 'unknown'
  blocker: string | null
}

function labelFromId(id: string): string {
  return id
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function staticModels(ids: readonly string[], category: MediaModel['category'], available: boolean, blocker: string | null): MediaModel[] {
  return ids.map((id) => ({
    id,
    label: labelFromId(id),
    provider: 'GenX',
    category,
    available,
    costTier: /fast|mini|clip/i.test(id) ? 'low' : /pro|veo|kling|seedance|pixverse|lyria/i.test(id) ? 'high' : 'medium',
    blocker,
  }))
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const genx = await getGenXStatusAsync()
  const liveModels = genx.available ? await listGenXModels().catch(() => []) : []
  const blocker = genx.available ? null : genx.configured ? 'GenX is configured but unreachable.' : 'GenX is not configured.'

  const fromCatalog = liveModels
    .map((model) => {
      const category = String(model.category ?? '').toLowerCase()
      const caps = (model.capabilities ?? []).map((cap) => String(cap).toLowerCase())
      const id = model.id
      let mapped: MediaModel['category'] | null = null
      if (category === 'image' || caps.some((cap) => cap.includes('image'))) mapped = 'image'
      if (category === 'video' || caps.some((cap) => cap.includes('video'))) mapped = 'video'
      if (category === 'voice' || caps.some((cap) => cap.includes('tts') || cap.includes('voice'))) mapped = 'voice'
      if (category === 'audio' || caps.some((cap) => cap.includes('music') || cap.includes('audio'))) mapped = 'music'
      if (!mapped) return null
      return {
        id,
        label: model.name || labelFromId(id),
        provider: model.provider || 'GenX',
        category: mapped,
        available: true,
        costTier: (model.costTier as MediaModel['costTier']) || 'unknown',
        blocker: null,
      } satisfies MediaModel
    })
    .filter(Boolean) as MediaModel[]

  const byCategory = (category: MediaModel['category'], fallback: readonly string[]) => {
    const found = fromCatalog.filter((model) => model.category === category)
    return found.length ? found : staticModels(fallback, category, genx.available, blocker)
  }

  return NextResponse.json({
    genx: {
      configured: genx.configured,
      available: genx.available,
      modelCount: genx.modelCount ?? liveModels.length,
      blocker,
    },
    image: byCategory('image', GENX_IMAGE_MODELS),
    video: byCategory('video', GENX_VIDEO_MODELS),
    voice: byCategory('voice', GENX_TTS_MODELS),
    music: byCategory('music', GENX_AUDIO_MODELS),
  })
}
