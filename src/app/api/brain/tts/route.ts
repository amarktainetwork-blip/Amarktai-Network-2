import { NextRequest } from 'next/server'
import { delegateJsonCapability } from '@/lib/brain-route-delegate'

export async function POST(request: NextRequest) {
  const clone = request.clone()
  const body = await clone.json().catch(() => ({})) as Record<string, unknown>
  return delegateJsonCapability(request, {
    capability: body.capability === 'adult_voice' ? 'adult_voice' : 'tts',
    inputFields: ['text', 'input', 'prompt'],
    adult: body.capability === 'adult_voice',
  })
}
