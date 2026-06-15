import { NextRequest } from 'next/server'
import { delegateJsonCapability } from '@/lib/brain-route-delegate'

export async function POST(request: NextRequest) {
  return delegateJsonCapability(request, {
    capability: 'image_edit',
    inputFields: ['prompt', 'input'],
  })
}
