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
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

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

function directModel(id: string, label: string, provider: string, category: MediaModel['category'], costTier: MediaModel['costTier'] = 'medium'): MediaModel {
  return { id, label, provider, category, available: true, costTier, blocker: null }
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const genx = await getGenXStatusAsync()
  const truth = await getDashboardRuntimeTruth().catch(() => null)
  const configuredProviders = new Set((truth?.providers ?? []).filter((p) => p.configured).map((p) => p.key))
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

  const image = byCategory('image', GENX_IMAGE_MODELS)
  const video = byCategory('video', GENX_VIDEO_MODELS)
  const voice = byCategory('voice', GENX_TTS_MODELS)
  // Music generation is post-launch regardless of GenX availability
  const catalogMusicModels = fromCatalog.filter((model) => model.category === 'music')
  const music: MediaModel[] = catalogMusicModels.length > 0
    ? catalogMusicModels.map((m) => ({ ...m, available: false, blocker: 'Music generation is post-launch. No music route is implemented yet.' }))
    : GENX_AUDIO_MODELS.map((id) => ({
        id,
        label: labelFromId(id),
        provider: 'GenX',
        category: 'music' as const,
        available: false,
        costTier: 'high' as const,
        blocker: 'Music generation is post-launch. No music route is implemented yet.',
      }))

  if (configuredProviders.has('huggingface')) {
    image.push(directModel('hf/custom-image-model', 'Configured image endpoint/model', 'Hugging Face', 'image', 'medium'))
    voice.push(directModel('hf/tts-model', 'Configured TTS endpoint/model', 'Hugging Face', 'voice', 'medium'))
  }
  if (configuredProviders.has('together')) image.push(directModel('black-forest-labs/FLUX.1-schnell-Free', 'FLUX.1 Schnell', 'Together AI', 'image', 'low'))
  if (configuredProviders.has('qwen')) {
    image.push(directModel('qwen-image', 'Qwen Image', 'Qwen / DashScope', 'image', 'low'))
    video.push(directModel('wanx2.1-t2v-turbo', 'Wan video', 'Qwen / DashScope', 'video', 'medium'))
    voice.push(directModel('qwen-tts', 'Qwen TTS', 'Qwen / DashScope', 'voice', 'low'))
  }
  if (false) {
    // Music generation for MiniMax is post-launch — route not yet implemented
  }

  return NextResponse.json({
    genx: {
      configured: genx.configured,
      available: genx.available,
      modelCount: genx.modelCount ?? liveModels.length,
      blocker,
    },
    configuredProviders: [...configuredProviders],
    image,
    video,
    voice,
    music,
  })
}
