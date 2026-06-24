export interface VideoModelContract {
  provider: 'genx' | 'qwen' | 'together'
  model: string
  mode: 'text_to_video' | 'image_to_video'
  requiresSourceImage: boolean
  supportedAspectRatios: string[]
  maxClipDurationSeconds: number
  supportsDurationCustomization: boolean
  pollingMethod: 'genx_job' | 'dashscope_task' | 'together_video_job'
}

export const VIDEO_MODEL_CONTRACTS: readonly VideoModelContract[] = [
  contract('genx', 'veo-3.1', 'text_to_video', false, 8, false, 'genx_job'),
  contract('genx', 'veo-3.1-fast', 'text_to_video', false, 8, false, 'genx_job'),
  contract('genx', 'grok-imagine-video', 'text_to_video', false, 6, false, 'genx_job'),
  contract('qwen', 'wan2.1-t2v-turbo', 'text_to_video', false, 5, false, 'dashscope_task'),
  contract('qwen', 'wan2.1-i2v-turbo', 'image_to_video', true, 5, false, 'dashscope_task'),
  contract('together', 'Wan-AI/Wan2.1-T2V-14B', 'text_to_video', false, 5, true, 'together_video_job'),
  contract('together', 'minimax/video-01', 'text_to_video', false, 6, true, 'together_video_job'),
] as const

export function getVideoModelContract(provider: string, model: string) {
  return VIDEO_MODEL_CONTRACTS.find((entry) =>
    entry.provider === provider && entry.model.toLowerCase() === model.toLowerCase(),
  ) ?? null
}

export function shouldUseLongFormVideo(input: {
  prompt: string
  duration?: number
  format?: string
  multiScene?: boolean
}) {
  const text = `${input.prompt} ${input.format ?? ''}`.toLowerCase()
  return (input.duration ?? 0) > 10
    || input.multiScene === true
    || /\b(30\s*seconds?|1\s*minute|60\s*seconds?|90\s*seconds?|long[- ]form|multi[- ]scene|facebook reel|instagram reel|tiktok|youtube short|youtube ad)\b/.test(text)
}

export function requestedVideoDuration(prompt: string, explicit?: number) {
  if (explicit && Number.isFinite(explicit)) return explicit
  const seconds = prompt.match(/\b(\d{1,3})\s*(?:seconds?|secs?|s)\b/i)
  if (seconds) return Number(seconds[1])
  const minutes = prompt.match(/\b(\d{1,2})\s*(?:minutes?|mins?|m)\b/i)
  if (minutes) return Number(minutes[1]) * 60
  return 4
}

export function providerSafeVideoParameters(
  contract: VideoModelContract,
  input: Record<string, unknown>,
) {
  const allowed = new Set(['size', 'resolution', 'prompt_extend', 'watermark', 'seed'])
  const parameters = Object.fromEntries(
    Object.entries(input).filter(([key, value]) => allowed.has(key) && value !== undefined),
  )
  if (contract.supportsDurationCustomization && typeof input.duration === 'number') {
    parameters.duration = Math.min(input.duration, contract.maxClipDurationSeconds)
  }
  return parameters
}

function contract(
  provider: VideoModelContract['provider'],
  model: string,
  mode: VideoModelContract['mode'],
  requiresSourceImage: boolean,
  maxClipDurationSeconds: number,
  supportsDurationCustomization: boolean,
  pollingMethod: VideoModelContract['pollingMethod'],
): VideoModelContract {
  return {
    provider,
    model,
    mode,
    requiresSourceImage,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    maxClipDurationSeconds,
    supportsDurationCustomization,
    pollingMethod,
  }
}
