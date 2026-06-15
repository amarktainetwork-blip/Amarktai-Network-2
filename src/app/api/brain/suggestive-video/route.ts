import { NextRequest } from 'next/server'
import { delegateJsonCapability } from '@/lib/brain-route-delegate'

export async function POST(request: NextRequest) {
  return delegateJsonCapability(request, {
    capability: 'suggestive_video',
    inputFields: ['prompt', 'input'],
  })
}
