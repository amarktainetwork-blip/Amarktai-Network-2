import { NextRequest } from 'next/server'
import { delegateJsonCapability } from '@/lib/brain-route-delegate'

export async function POST(request: NextRequest) {
  return delegateJsonCapability(request, {
    capability: 'adult_text',
    inputFields: ['prompt', 'input', 'message'],
    adult: true,
  })
}
