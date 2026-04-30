import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getGenXStatusAsync, listGenXModels } from '@/lib/genx-client'
import { isProviderConfigured, type CoreProvider } from '@/lib/provider-config'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'

type ProviderStatus = { configured: boolean; healthy: boolean; blocker: string | null }
type CapabilityStatus = { available: boolean; provider: string | null; blocker: string | null }

function providerStatus(configured: boolean, name: string): ProviderStatus {
  return {
    configured,
    healthy: configured,
    blocker: configured ? null : `${name} key is not configured`,
  }
}

function available(provider: string): CapabilityStatus {
  return { available: true, provider, blocker: null }
}

function blocked(message: string): CapabilityStatus {
  return { available: false, provider: null, blocker: message }
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const providerKeys: CoreProvider[] = ['openai', 'groq', 'gemini', 'replicate', 'suno']
  const [genxStatus, repoStatus, ...configuredValues] = await Promise.all([
    getGenXStatusAsync(),
    getRepoWorkbenchStatus(),
    ...providerKeys.map((provider) => isProviderConfigured(provider)),
  ])
  const configured = Object.fromEntries(providerKeys.map((provider, i) => [provider, configuredValues[i]])) as Record<CoreProvider, boolean>

  const models = genxStatus.available ? await listGenXModels().catch(() => []) : []
  const hasGenxCapability = (category: string, capability: string) =>
    models.some((model) => model.category === category || model.capabilities.includes(capability as never))

  const genxChat = genxStatus.available && (models.length === 0 || hasGenxCapability('text', 'chat'))
  const genxImage = genxStatus.available && (models.length === 0 || hasGenxCapability('image', 'image_generation'))
  const genxVideo = genxStatus.available && (models.length === 0 || hasGenxCapability('video', 'video_generation'))
  const genxAudio = genxStatus.available && (models.length === 0 || hasGenxCapability('audio', 'music_generation'))
  const genxVoice = genxStatus.available && (models.length === 0 || hasGenxCapability('voice', 'tts'))
  const directTextProvider = configured.openai ? 'openai' : configured.groq ? 'groq' : configured.gemini ? 'gemini' : null

  const capabilities: Record<string, CapabilityStatus> = {
    chat: genxChat ? available('genx') : directTextProvider ? available(directTextProvider) : blocked('No GenX or direct text provider is available.'),
    image_generation: genxImage ? available('genx') : configured.openai ? available('openai') : configured.gemini ? available('gemini') : blocked('No image generation provider is configured.'),
    video_generation: genxVideo ? available('genx') : configured.replicate ? available('replicate') : blocked('No real video generation provider is configured. Configure GenX video model or a supported video provider.'),
    video_planning: genxChat ? available('genx') : directTextProvider ? available(directTextProvider) : available('template_fallback'),
    music_generation: genxAudio ? available('genx') : configured.suno ? available('suno') : configured.replicate ? available('replicate') : blocked('No real music/audio provider is configured. Configure GenX music, Suno, or Replicate.'),
    music_blueprint: genxChat ? available('genx') : directTextProvider ? available(directTextProvider) : available('template_fallback'),
    tts: genxVoice ? available('genx') : configured.openai ? available('openai') : blocked('No TTS provider is configured.'),
    stt: genxStatus.available ? available('genx') : configured.openai ? available('openai') : blocked('No STT provider is configured.'),
    repo_workbench: repoStatus.canPatch && repoStatus.githubTokenConfigured
      ? available(genxStatus.available ? 'genx' : directTextProvider ?? 'direct_provider')
      : blocked(repoStatus.blockers.join('; ') || 'Repo Workbench prerequisites are not satisfied.'),
  }

  let apiUrlMasked: string | null = null
  if (genxStatus.apiUrl) {
    try {
      apiUrlMasked = new URL(genxStatus.apiUrl).origin
    } catch {
      apiUrlMasked = genxStatus.apiUrl.slice(0, 30)
    }
  }

  return NextResponse.json({
    genx: {
      configured: genxStatus.configured,
      available: genxStatus.available,
      apiUrlMasked,
      modelCount: genxStatus.modelCount ?? models.length,
      blocker: genxStatus.available ? null : genxStatus.error,
    },
    providers: {
      openai: providerStatus(configured.openai, 'OpenAI'),
      groq: providerStatus(configured.groq, 'Groq'),
      gemini: providerStatus(configured.gemini, 'Gemini'),
      replicate: providerStatus(configured.replicate, 'Replicate'),
      suno: providerStatus(configured.suno, 'Suno'),
    },
    capabilities,
  })
}
