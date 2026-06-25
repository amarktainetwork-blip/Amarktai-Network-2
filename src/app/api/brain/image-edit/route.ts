import { NextRequest, NextResponse } from 'next/server'
import { getVaultApiKey } from '@/lib/brain'

const ALLOWED_SIZES = ['256x256', '512x512', '1024x1024'] as const
type EditSize = (typeof ALLOWED_SIZES)[number]

const HF_INPAINT_MODELS = [
  'runwayml/stable-diffusion-inpainting',
  'stabilityai/stable-diffusion-2-inpainting',
] as const

function stripDataUri(b64: string): string {
  const idx = b64.indexOf(',')
  return idx !== -1 ? b64.slice(idx + 1) : b64
}

function b64ToBuffer(b64: string): Buffer {
  return Buffer.from(stripDataUri(b64), 'base64')
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({})) as {
    prompt?: string
    image?: string
    mask?: string
    size?: string
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: 'prompt is required and must be a non-empty string' }, { status: 400 })
  }

  if (!body.image?.trim()) {
    return NextResponse.json({
      error: 'image is required for image editing. Provide a base64-encoded PNG image.',
      code: 'image_required',
    }, { status: 400 })
  }

  let imageBuffer: Buffer
  try {
    imageBuffer = b64ToBuffer(body.image)
    if (imageBuffer.length === 0) throw new Error('empty')
  } catch {
    return NextResponse.json({ error: 'Invalid image: could not decode base64 data.', code: 'invalid_image_format' }, { status: 400 })
  }

  const resolvedSize: EditSize = ALLOWED_SIZES.includes(body.size as EditSize)
    ? body.size as EditSize
    : '1024x1024'

  const hfKey = await getVaultApiKey('huggingface')
  if (!hfKey) {
    return NextResponse.json({
      executed: false,
      capability: 'image_editing',
      code: 'no_eligible_edit_model',
      error: 'No image editing provider is configured. Add a HuggingFace key for Stable Diffusion inpainting.',
      providers_checked: ['huggingface'],
    }, { status: 503 })
  }

  const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`
  const maskDataUrl = body.mask
    ? (() => {
        try {
          const maskBuffer = b64ToBuffer(body.mask!)
          return maskBuffer.length > 0 ? `data:image/png;base64,${maskBuffer.toString('base64')}` : null
        } catch {
          return null
        }
      })()
    : null

  for (const hfModel of HF_INPAINT_MODELS) {
    const payload: Record<string, unknown> = {
      inputs: imageDataUrl,
      parameters: {
        prompt: body.prompt.trim(),
        num_inference_steps: 25,
        guidance_scale: 7.5,
      },
    }
    if (maskDataUrl) {
      ;(payload.parameters as Record<string, unknown>).mask_image = maskDataUrl
    }

    const response = await fetch(`https://api-inference.huggingface.co/models/${hfModel}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hfKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000),
    }).catch(() => null)

    if (!response?.ok) continue

    const contentType = response.headers.get('content-type') ?? 'image/png'
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength === 0) continue

    return NextResponse.json({
      executed: true,
      imageBase64: `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`,
      provider: 'huggingface',
      model: hfModel,
      size: resolvedSize,
      promptUsed: body.prompt.trim(),
    })
  }

  return NextResponse.json({
    executed: false,
    capability: 'image_editing',
    code: 'provider_error',
    error: 'HuggingFace image editing did not return an edited image.',
    providers_checked: ['huggingface'],
  }, { status: 503 })
}
