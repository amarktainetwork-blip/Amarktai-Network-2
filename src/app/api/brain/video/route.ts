import { NextRequest, NextResponse } from 'next/server'
import { callGenXChat, getGenXStatusAsync, selectGenXModel } from '@/lib/genx-client'

interface VideoScene {
  sceneNumber: number
  description: string
  duration: number
  visualDirection: string
  audioDirection?: string
  textOverlay?: string
}

function templateScenes(script: string, duration: number, style: string): VideoScene[] {
  const count = Math.max(1, Math.min(6, Math.ceil(duration / 5)))
  const sentences = script.split(/[.!?]+/).map(value => value.trim()).filter(Boolean)
  return Array.from({ length: count }, (_, index) => ({
    sceneNumber: index + 1,
    description: sentences[index] ?? `Scene ${index + 1} of the ${style} video`,
    duration: index === count - 1 ? duration - Math.floor(duration / count) * index : Math.floor(duration / count),
    visualDirection: `${style} framing, deliberate lighting, and clear subject motion`,
  }))
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    script?: string
    style?: string
    duration?: number
    aspectRatio?: string
    scenes?: VideoScene[]
  } | null

  if (!body?.script?.trim()) {
    return NextResponse.json({ error: 'script is required and must be a non-empty string' }, { status: 400 })
  }

  const style = body.style ?? 'cinematic'
  const duration = body.duration ?? 15
  const aspectRatio = body.aspectRatio ?? '16:9'
  if (duration < 1 || duration > 120) return NextResponse.json({ error: 'duration must be between 1 and 120 seconds' }, { status: 400 })

  if (body.scenes?.length) {
    return NextResponse.json({
      capability: 'video_planning',
      executed: true,
      ai_generated: false,
      engine: 'provided_scenes',
      provider: null,
      model: null,
      params: { style, duration, aspectRatio },
      scenes: body.scenes,
    })
  }

  const count = Math.max(1, Math.min(6, Math.ceil(duration / 5)))
  const prompt = `Return only a JSON array of ${count} video scenes for this ${duration}-second ${style} script. Each scene needs sceneNumber, description, duration, visualDirection, audioDirection, and textOverlay. Script: ${body.script.slice(0, 2000)}`
  let scenes: VideoScene[] | null = null
  let model: string | null = null

  const status = await getGenXStatusAsync()
  if (status.available) {
    model = await selectGenXModel('best', 'chat', 'plan')
    const result = await callGenXChat({ model, messages: [{ role: 'user', content: prompt }], max_tokens: 1800 })
    if (result.success && result.output) {
      try {
        const parsed = JSON.parse(result.output.replace(/```json|```/gi, '').trim()) as VideoScene[]
        if (Array.isArray(parsed) && parsed.length) scenes = parsed
      } catch {
        scenes = null
      }
    }
  }

  return NextResponse.json({
    capability: 'video_planning',
    executed: true,
    ai_generated: Boolean(scenes),
    engine: scenes ? 'genx' : 'template_fallback',
    provider: scenes ? 'genx' : null,
    model: scenes ? model : null,
    fallbackUsed: !scenes,
    generation_available: false,
    generation_blocker: 'This endpoint plans scenes; rendered video is handled by the video-generation endpoint.',
    params: { style, duration, aspectRatio },
    scenes: scenes ?? templateScenes(body.script, duration, style),
  })
}
