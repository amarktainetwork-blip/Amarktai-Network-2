import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact, type ArtifactType } from '@/lib/artifact-store'
import { persistCanonicalMediaResult } from '@/lib/canonical-media-artifact'
import { routeLiveModel, type AiCapability } from '@/lib/live-ai-routing'
import { type AdultPolicyValue } from '@/lib/universal-model-catalog'
import { getStudioRouteConfig, type StudioTab } from '@/lib/studio-route-map'
import { POST as researchAssistPost } from '@/app/api/admin/research/assist/route'
import { POST as imagePost } from '@/app/api/brain/image/route'
import { POST as videoPost } from '@/app/api/brain/video-generate/route'
import { POST as ttsPost } from '@/app/api/brain/tts/route'
import { POST as adultTextPost } from '@/app/api/brain/adult-text/route'
import { POST as adultImagePost } from '@/app/api/brain/adult-image/route'
import { POST as avatarVideoPost } from '@/app/api/brain/avatar-video/route'
import { POST as musicPost } from '@/app/api/admin/music-studio/route'

type ExecuteBody = {
  tab?: StudioTab
  prompt?: string
  provider?: string
  model?: string
  costMode?: 'cheap' | 'balanced' | 'premium'
  appSlug?: string
  adultPolicy?: string
  mode?: 'text' | 'image' | 'video' | 'voice'
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
  if (tab === 'Music / Audio') return 'music_generation'
  if (tab === 'Voice / TTS') return 'tts'
  if (tab === 'Avatar / Talking Video') return 'avatar_video'
  if (tab === 'Adult') {
    if (adultMode === 'image') return 'adult_image'
    if (adultMode === 'video') return 'adult_video'
    if (adultMode === 'voice') return 'adult_voice'
    return 'adult_text'
  }
  return 'chat'
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as ExecuteBody
  const tab = body.tab
  const prompt = body.prompt?.trim() ?? ''
  const appSlug = body.appSlug?.trim() || 'amarktai-network'
  if (!tab) return NextResponse.json({ success: false, error: 'tab is required' }, { status: 400 })
  if (!prompt) return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 })

  const config = getStudioRouteConfig(tab)
  if (config.status === 'missing') {
    return NextResponse.json({
      success: false, executed: false, capability: config.capability, provider: null, model: null,
      jobStatus: 'needs_setup', artifactId: null, storageUrl: null, error: config.detail, blocker: config.detail, route: config,
    }, { status: 501 })
  }

  const capability = normalizeCapability(tab, body.mode)
  const route = routeLiveModel({
    capability,
    appSlug,
    selectedProvider: body.provider ?? 'auto',
    selectedModel: body.model === 'auto' ? undefined : body.model,
    costMode: body.costMode ?? 'balanced',
    adultPolicy: (body.adultPolicy ?? 'off') as AdultPolicyValue,
    requiresMedia: ['image', 'video', 'adult_image', 'adult_video', 'adult_voice', 'music_generation', 'tts'].includes(capability),
  })

  if (route.blockedReason) {
    return NextResponse.json({
      success: false, executed: false, capability, provider: null, model: null,
      jobStatus: 'blocked', artifactId: null, storageUrl: null,
      error: route.blockedReason, blocker: route.blockedReason, route,
    }, { status: 409 })
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
      const persisted = response.ok && data.executed
        ? await persistCanonicalMediaResult({
          result: data,
          appSlug,
          type: 'image',
          subType: 'studio_image',
          title: `Image: ${prompt.slice(0, 80)}`,
          provider: String(data.provider ?? route.selectedProvider ?? ''),
          model: String(data.model ?? route.selectedModel ?? ''),
          metadata: { tab, route },
        })
        : null
      const success = Boolean(persisted?.success)
      return NextResponse.json({
        success,
        executed: success,
        capability,
        provider: persisted?.provider ?? data.provider ?? route.selectedProvider,
        model: persisted?.model ?? data.model ?? route.selectedModel,
        jobStatus: persisted?.status ?? 'failed',
        jobId: persisted?.jobId ?? null,
        artifactId: persisted?.artifactId ?? null,
        storageUrl: persisted?.storageUrl ?? null,
        imageUrl: persisted?.mediaUrl ?? null,
        blocker: persisted?.blocker ?? data.error ?? null,
        error: persisted?.blocker ?? data.error ?? null,
        responseShapeKeys: persisted?.responseShapeKeys ?? Object.keys(data).sort(),
        result: data,
        artifact: persisted?.artifact ?? null,
        route,
      }, { status: success ? 200 : response.ok ? 502 : response.status })
    }

    if (tab === 'Video' || capability === 'adult_video') {
      const provider = route.selectedProvider === 'qwen' || route.selectedProvider === 'genx'
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
        capability,
      }) as Request)
      const data = await readJson(response)
      const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
      return NextResponse.json({
        success: Boolean(data.success),
        executed: Boolean(data.executed),
        capability,
        provider: data.provider ?? route.selectedProvider,
        model: data.model ?? route.selectedModel,
        jobStatus: data.jobStatus ?? data.status ?? 'processing',
        artifactId: data.artifactId ?? null,
        storageUrl: data.storageUrl ?? null,
        error: data.error ?? null,
        blocker: data.blocker ?? data.error ?? null,
        result: data,
        artifact,
        route,
      }, { status: response.status })
    }

    if (tab === 'Avatar / Talking Video') {
      const response = await avatarVideoPost(jsonRequest('/api/brain/avatar-video', {
        prompt,
        appSlug,
        provider: route.selectedProvider,
        model: route.selectedModel,
      }))
      const data = await readJson(response)
      return NextResponse.json({ ...data, result: data, artifact: null, route }, { status: response.status })
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
          provider: route.selectedProvider,
          model: route.selectedModel,
        },
      }))
      const data = await readJson(response)
      const job = data.job as Record<string, unknown> | undefined
      return NextResponse.json({
        success: response.ok,
        executed: response.ok,
        capability,
        provider: job?.provider ?? route.selectedProvider,
        model: job?.model ?? route.selectedModel,
        jobStatus: job?.status ?? 'queued',
        artifactId: job?.artifactId ?? null,
        storageUrl: job?.storageUrl ?? null,
        error: data.error ?? null,
        blocker: data.error ?? null,
        result: data,
        artifact: data.artifact ?? null,
        route,
      }, { status: response.status })
    }

    if (tab === 'Voice / TTS' || capability === 'adult_voice') {
      const provider = ['genx', 'groq', 'huggingface'].includes(String(route.selectedProvider))
        ? route.selectedProvider
        : 'auto'
      const response = await ttsPost(jsonRequest('/api/brain/tts', {
        text: prompt,
        provider,
        model: route.selectedModel,
        voiceId: body.voiceId,
        appSlug,
        capability,
      }))
      const data = await readJson(response)
      const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
      return NextResponse.json({
        ...data,
        result: data,
        artifact,
        route,
      }, { status: response.status })
    }

    if (tab === 'Adult') {
      if (body.mode === 'image') {
        const response = await adultImagePost(jsonRequest('/api/brain/adult-image', {
          prompt,
          appSlug,
          size: body.size ?? '768x768',
          provider: route.selectedProvider,
          model: route.selectedModel,
        }))
        const data = await readJson(response)
        const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
        return NextResponse.json({ ...data, result: data, artifact, route }, { status: response.status })
      }
      const response = await adultTextPost(jsonRequest('/api/brain/adult-text', {
        prompt,
        appSlug,
        provider: route.selectedProvider,
        model: route.selectedModel,
      }))
      const data = await readJson(response)
      const artifact = data.artifactId ? { id: data.artifactId, storageUrl: data.storageUrl } : null
      return NextResponse.json({ ...data, result: data, artifact, route }, { status: response.status })
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
