import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact, type ArtifactType } from '@/lib/artifact-store'
import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'
import { type AdultPolicyValue } from '@/lib/universal-model-catalog'
import { getStudioRouteConfig, type StudioTab } from '@/lib/studio-route-map'
import { POST as researchAssistPost } from '@/app/api/admin/research/assist/route'
import { POST as imagePost } from '@/app/api/brain/image/route'
import { POST as videoPost } from '@/app/api/brain/video-generate/route'
import { POST as ttsPost } from '@/app/api/brain/tts/route'
import { POST as adultTextPost } from '@/app/api/brain/adult-text/route'
import { POST as adultImagePost } from '@/app/api/brain/adult-image/route'
import { POST as musicPost } from '@/app/api/admin/music-studio/route'

type ExecuteBody = {
  tab?: StudioTab
  prompt?: string
  provider?: string
  model?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  appSlug?: string
  adultPolicy?: string
  mode?: 'text' | 'image'
  voiceId?: string
  size?: string
  style?: string
}

function jsonRequest(path: string, body: Record<string, unknown>) {
  return new NextRequest(new URL(path, 'http://studio.local'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  return await response.json().catch(() => ({})) as Record<string, unknown>
}

function dataUriToBuffer(value: unknown): { content?: Buffer; mimeType?: string } {
  if (typeof value !== 'string') return {}
  const match = value.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return {}
  return { mimeType: match[1], content: Buffer.from(match[2], 'base64') }
}

async function persistArtifact(input: {
  appSlug: string
  type: ArtifactType
  subType: string
  title: string
  description?: string
  provider?: string
  model?: string
  content?: Buffer | string
  contentUrl?: string
  mimeType?: string
  metadata?: Record<string, unknown>
}) {
  try {
    return await createArtifact({
      appSlug: input.appSlug,
      type: input.type,
      subType: input.subType,
      title: input.title,
      description: input.description,
      provider: input.provider,
      model: input.model,
      content: typeof input.content === 'string' ? Buffer.from(input.content, 'utf8') : input.content,
      contentUrl: input.contentUrl,
      mimeType: input.mimeType,
      metadata: input.metadata ?? {},
    })
  } catch (error) {
    return {
      id: null,
      warning: error instanceof Error ? error.message : 'Artifact persistence failed',
    }
  }
}

function normalizeCapability(tab: StudioTab, adultMode?: string): AiCapability {
  if (tab === 'Research') return 'research'
  if (tab === 'Image') return 'image'
  if (tab === 'Video') return 'video'
  if (tab === 'Music / Audio') return 'voice_tts'
  if (tab === 'Voice / TTS') return 'voice_tts'
  if (tab === 'Adult') return adultMode === 'image' ? 'adult_image' : 'adult_text'
  return 'chat'
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as ExecuteBody
  const tab = body.tab
  const prompt = body.prompt?.trim() ?? ''
  const appSlug = body.appSlug?.trim() || 'superbrain'
  if (!tab) return NextResponse.json({ success: false, error: 'tab is required' }, { status: 400 })
  if (!prompt) return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 })

  const config = getStudioRouteConfig(tab)
  if (config.status === 'missing') {
    return NextResponse.json({ success: false, executed: false, error: config.detail, route: config }, { status: 501 })
  }

  const capability = normalizeCapability(tab, body.mode)
  const route = routeLiveModel({
    capability,
    appSlug,
    selectedProvider: body.provider ?? 'auto',
    selectedModel: body.model === 'auto' ? undefined : body.model,
    costMode: body.costMode ?? 'balanced',
    adultPolicy: (body.adultPolicy ?? 'off') as AdultPolicyValue,
    requiresMedia: ['image', 'video', 'adult_image', 'voice_tts'].includes(capability),
  })

  if (route.blockedReason) {
    return NextResponse.json({ success: false, executed: false, error: route.blockedReason, route }, { status: 409 })
  }

  try {
    if (tab === 'Research') {
      const response = await researchAssistPost(jsonRequest('/api/admin/research/assist', { prompt, appSlug }))
      const data = await readJson(response)
      const artifact = await persistArtifact({
        appSlug,
        type: 'document',
        subType: 'research_brief',
        title: `Research: ${prompt.slice(0, 80)}`,
        description: 'Studio Research Agent result',
        provider: String(route.selectedProvider ?? 'research'),
        model: String(route.selectedModel ?? ''),
        content: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
        metadata: { tab, route },
      })
      return NextResponse.json({ success: response.ok, executed: response.ok, result: data, artifact, route }, { status: response.status })
    }

    if (tab === 'Image') {
      if (route.selectedProvider === 'huggingface') {
        return NextResponse.json({ success: false, executed: false, error: 'Hugging Face image generation is task-based and is not wired to this image execution route yet.', route }, { status: 409 })
      }
      const response = await imagePost(jsonRequest('/api/brain/image', {
        prompt,
        size: body.size ?? '1024x1024',
        providerOverride: route.selectedProvider,
        modelOverride: route.selectedModel,
      }))
      const data = await readJson(response)
      const imagePayload = data.imageBase64 ?? data.imageUrl
      const binary = dataUriToBuffer(imagePayload)
      const artifact = response.ok && data.executed
        ? await persistArtifact({
          appSlug,
          type: 'image',
          subType: 'studio_image',
          title: `Image: ${prompt.slice(0, 80)}`,
          provider: String(data.provider ?? route.selectedProvider ?? ''),
          model: String(data.model ?? route.selectedModel ?? ''),
          content: binary.content,
          contentUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
          mimeType: binary.mimeType ?? 'image/png',
          metadata: { tab, route, result: data },
        })
        : null
      return NextResponse.json({ success: response.ok && Boolean(data.executed), executed: Boolean(data.executed), result: data, artifact, route }, { status: response.status })
    }

    if (tab === 'Video') {
      const provider = route.selectedProvider === 'together' || route.selectedProvider === 'qwen' || route.selectedProvider === 'genx'
        ? route.selectedProvider
        : 'genx'
      const response = await videoPost(jsonRequest('/api/brain/video-generate', {
        prompt,
        style: body.style ?? 'cinematic',
        duration: 4,
        aspectRatio: '16:9',
        appSlug,
        provider,
        model: route.selectedModel,
      }) as Request)
      const data = await readJson(response)
      const artifact = response.ok && (data.jobId || data.resultUrl)
        ? await persistArtifact({
          appSlug,
          type: 'video',
          subType: 'studio_video_job',
          title: `Video job: ${prompt.slice(0, 80)}`,
          provider: String(data.provider ?? provider),
          model: String(data.model ?? route.selectedModel ?? ''),
          contentUrl: typeof data.resultUrl === 'string' ? data.resultUrl : undefined,
          metadata: { tab, route, result: data },
        })
        : null
      return NextResponse.json({ success: response.ok, executed: response.ok && !data.error, result: data, artifact, route }, { status: response.status })
    }

    if (tab === 'Music / Audio') {
      const response = await musicPost(jsonRequest('/api/admin/music-studio', {
        action: 'create_async',
        request: {
          appSlug,
          theme: prompt,
          genre: 'cinematic',
          genres: ['cinematic'],
          vocalStyle: 'instrumental',
          prompt,
        },
      }))
      const data = await readJson(response)
      return NextResponse.json({ success: response.ok, executed: response.ok, result: data, artifact: data.job ?? data.artifact ?? null, route }, { status: response.status })
    }

    if (tab === 'Voice / TTS') {
      const provider = ['genx', 'groq', 'openai', 'huggingface'].includes(String(route.selectedProvider))
        ? route.selectedProvider
        : 'auto'
      const response = await ttsPost(jsonRequest('/api/brain/tts', {
        text: prompt,
        provider,
        model: route.selectedModel,
        voiceId: body.voiceId,
        appSlug,
      }))
      const contentType = response.headers.get('content-type') ?? ''
      if (!response.ok || contentType.includes('application/json')) {
        const data = await readJson(response)
        return NextResponse.json({ success: false, executed: false, result: data, error: String(data.error ?? 'TTS unavailable'), route }, { status: response.status })
      }
      const audio = Buffer.from(await response.arrayBuffer())
      const artifact = await persistArtifact({
        appSlug,
        type: 'audio',
        subType: 'studio_tts',
        title: `TTS: ${prompt.slice(0, 80)}`,
        provider: response.headers.get('x-provider') ?? String(provider),
        model: response.headers.get('x-model') ?? String(route.selectedModel ?? ''),
        content: audio,
        mimeType: contentType || 'audio/mpeg',
        metadata: { tab, route },
      })
      return NextResponse.json({ success: true, executed: true, artifact, audioBase64: `data:${contentType || 'audio/mpeg'};base64,${audio.toString('base64')}`, route })
    }

    if (tab === 'Adult') {
      if (body.mode === 'image') {
        const response = await adultImagePost(jsonRequest('/api/brain/adult-image', {
          prompt,
          appSlug,
          size: body.size ?? '768x768',
        }))
        const data = await readJson(response)
        const binary = dataUriToBuffer(data.imageBase64 ?? data.imageUrl)
        const artifact = response.ok && data.executed
          ? await persistArtifact({
            appSlug,
            type: 'image',
            subType: 'adult_image',
            title: `Adult image: ${prompt.slice(0, 80)}`,
            provider: String(data.provider ?? route.selectedProvider ?? ''),
            model: String(data.model ?? route.selectedModel ?? ''),
            content: binary.content,
            contentUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
            mimeType: binary.mimeType ?? 'image/png',
            metadata: { tab, route, result: data },
          })
          : null
        return NextResponse.json({ success: response.ok && Boolean(data.executed), executed: Boolean(data.executed), result: data, artifact, route }, { status: response.status })
      }
      const response = await adultTextPost(jsonRequest('/api/brain/adult-text', {
        prompt,
        appSlug,
        provider: route.selectedProvider,
        model: route.selectedModel,
      }))
      const data = await readJson(response)
      const text = String(data.output ?? data.text ?? JSON.stringify(data, null, 2))
      const artifact = response.ok && data.executed
        ? await persistArtifact({
          appSlug,
          type: 'document',
          subType: 'adult_text',
          title: `Adult text: ${prompt.slice(0, 80)}`,
          provider: String(data.provider ?? route.selectedProvider ?? ''),
          model: String(data.model ?? route.selectedModel ?? ''),
          content: text,
          mimeType: 'text/plain',
          metadata: { tab, route },
        })
        : null
      return NextResponse.json({ success: response.ok && Boolean(data.executed), executed: Boolean(data.executed), result: data, artifact, route }, { status: response.status })
    }

    return NextResponse.json({ success: false, executed: false, error: `${tab} execution is not available through this route.`, route }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      executed: false,
      error: error instanceof Error ? error.message : 'Studio execution failed',
      route,
    }, { status: 500 })
  }
}
