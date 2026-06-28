import { NextResponse } from 'next/server'
import { z } from 'zod'
import { longFormVideoJobResponse, startLongFormVideoJob } from '@/lib/long-form-video-store'

const RequestSchema = z.object({
  prompt: z.string().min(1).max(8000),
  appSlug: z.string().optional().default('amarktai-network'),
  style: z.string().optional().default('cinematic'),
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).optional().default('16:9'),
  duration: z.number().int().min(90).max(3600),
  sceneCount: z.number().int().min(1).max(240).optional(),
  productionNotes: z.string().optional().default(''),
  voice: z.string().optional().default('off'),
  music: z.string().optional().default('off'),
  stitching: z.string().optional().default('on'),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: Request): Promise<NextResponse> {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({
      success: false,
      executed: false,
      capability: 'long_form_video',
      jobStatus: 'failed',
      status: 'failed',
      artifactId: null,
      storageUrl: null,
      error: 'Invalid long-form video request.',
      blocker: 'Invalid long-form video request.',
      details: parsed.error.flatten(),
    }, { status: 400 })
  }

  const job = await startLongFormVideoJob({
    appSlug: parsed.data.appSlug,
    prompt: parsed.data.prompt,
    style: parsed.data.style,
    aspectRatio: parsed.data.aspectRatio,
    targetDurationSeconds: parsed.data.duration,
    sceneCount: parsed.data.sceneCount,
    productionNotes: parsed.data.productionNotes,
    voice: parsed.data.voice,
    music: parsed.data.music,
    stitching: parsed.data.stitching,
    metadata: parsed.data.metadata,
  })

  const status = job.status === 'completed' ? 201 : job.status === 'failed' ? 502 : 202
  return NextResponse.json(longFormVideoJobResponse(job), { status })
}
