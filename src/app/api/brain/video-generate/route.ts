import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getVaultApiKey, callProvider } from '@/lib/brain'
import { callGenXMedia, GENX_VIDEO_MODELS } from '@/lib/genx-client'

const RequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  style: z.enum(['cinematic', 'animated', 'realistic', 'documentary', 'commercial']).optional().default('cinematic'),
  duration: z.number().int().min(1).max(30).optional().default(4),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  appSlug: z.string().optional(),
  provider: z.enum(['genx', 'together', 'qwen', 'huggingface', 'auto']).optional().default('auto'),
  model: z.string().optional(),
})

async function createTogetherJob(prompt: string, model: string, apiKey: string) {
  const response = await fetch('https://api.together.xyz/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, n: 1, width: 1280, height: 720 }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Together AI returned HTTP ${response.status}`)
  const data = await response.json() as { id?: string; data?: Array<{ url?: string }> }
  const resultUrl = data.data?.[0]?.url ?? ''
  return {
    providerJobId: `together-sync:${data.id ?? Date.now()}:${resultUrl}`,
    status: resultUrl ? 'succeeded' : 'processing',
  }
}

async function createQwenJob(prompt: string, model: string, apiKey: string) {
  const response = await fetch(
    'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/video-generation/video-synthesis',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-DashScope-Async': 'enable',
      },
      body: JSON.stringify({ model, input: { prompt }, parameters: { size: '1280*720' } }),
      signal: AbortSignal.timeout(15_000),
    },
  )
  if (!response.ok) throw new Error(`Qwen Wan returned HTTP ${response.status}`)
  const data = await response.json() as { output?: { task_id?: string } }
  if (!data.output?.task_id) throw new Error('Qwen Wan did not return a task ID')
  return { providerJobId: `qwen-wan:${data.output.task_id}`, status: 'processing' }
}

async function planningFallback(prompt: string, style: string, duration: number) {
  const request = `Create a ${duration}-second ${style} video storyboard for "${prompt}". Include scenes, shots, narration, and visual notes.`
  for (const [provider, model] of [
    ['groq', 'llama-3.3-70b-versatile'],
    ['together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo'],
    ['qwen', 'qwen-plus'],
  ] as const) {
    const result = await callProvider(provider, model, request)
    if (result.output) return result.output
  }
  return null
}

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ executed: false, error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })

  const { prompt, style, duration, aspectRatio, appSlug, provider, model } = parsed.data
  if (provider === 'huggingface') {
    return NextResponse.json({
      capability: 'video_generation',
      executed: false,
      error: 'Hugging Face video generation is not wired. Use GenX, Qwen, or Together AI.',
    }, { status: 400 })
  }

  const enhancedPrompt = `${style} style video: ${prompt}`
  let providerJobId = ''
  let usedProvider = ''
  let usedModel = ''
  let status = 'processing'

  if (provider === 'auto' || provider === 'genx') {
    const genxModel = model && GENX_VIDEO_MODELS.includes(model as (typeof GENX_VIDEO_MODELS)[number])
      ? model
      : GENX_VIDEO_MODELS[0]
    const result = await callGenXMedia({ model: genxModel, prompt: enhancedPrompt, type: 'video', duration })
    if (result.success && (result.jobId || result.url)) {
      providerJobId = result.jobId ? `genx-job:${result.jobId}` : `genx-sync:${result.url}`
      usedProvider = 'genx'
      usedModel = genxModel
      status = result.url || result.status === 'completed' ? 'succeeded' : 'processing'
    }
  }

  if (!providerJobId && (provider === 'auto' || provider === 'qwen')) {
    const apiKey = await getVaultApiKey('qwen')
    if (apiKey) {
      const qwenModel = model || 'wanx2.1-t2v-turbo'
      try {
        const result = await createQwenJob(enhancedPrompt, qwenModel, apiKey)
        providerJobId = result.providerJobId
        usedProvider = 'qwen'
        usedModel = qwenModel
        status = result.status
      } catch {
        // Continue to the next approved provider.
      }
    }
  }

  if (!providerJobId && (provider === 'auto' || provider === 'together')) {
    const apiKey = await getVaultApiKey('together')
    if (apiKey) {
      const togetherModel = model || 'black-forest-labs/FLUX.1-schnell-Free'
      try {
        const result = await createTogetherJob(enhancedPrompt, togetherModel, apiKey)
        providerJobId = result.providerJobId
        usedProvider = 'together'
        usedModel = togetherModel
        status = result.status
      } catch {
        // Return a truthful blocker below.
      }
    }
  }

  if (!providerJobId) {
    const videoPlan = await planningFallback(prompt, style, duration)
    return NextResponse.json({
      capability: 'video_generation',
      executed: false,
      generation_available: false,
      planning_available: Boolean(videoPlan),
      video_plan: videoPlan,
      error: 'No tested approved video provider could start a real job.',
    }, { status: 501 })
  }

  const job = await prisma.videoGenerationJob.create({
    data: {
      provider: usedProvider,
      modelId: usedModel,
      prompt: enhancedPrompt,
      style,
      duration,
      aspectRatio,
      appSlug: appSlug ?? null,
      status,
      providerJobId,
    },
  })
  return NextResponse.json({
    capability: 'video_generation',
    executed: true,
    jobId: job.id,
    status: job.status,
    provider: usedProvider,
    model: usedModel,
    pollUrl: `/api/brain/video-generate/${job.id}`,
  }, { status: 202 })
}
