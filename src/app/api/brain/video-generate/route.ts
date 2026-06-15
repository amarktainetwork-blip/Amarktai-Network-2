import { NextRequest } from 'next/server'
import { delegateJsonCapability } from '@/lib/brain-route-delegate'

export async function POST(request: NextRequest) {
  const clone = request.clone()
  const body = await clone.json().catch(() => ({})) as Record<string, unknown>
  const hasImage = typeof body.image === 'string'
    || typeof body.imageUrl === 'string'
    || Array.isArray(body.files) && body.files.length > 0
  return delegateJsonCapability(request, {
    capability: hasImage ? 'image_to_video' : 'video_generation',
    inputFields: ['prompt', 'input', 'message'],
  })
}
