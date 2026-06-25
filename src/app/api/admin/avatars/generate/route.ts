/**
 * POST /api/admin/avatars/generate
 * Validate and trigger avatar generation through capability router.
 * No direct provider calls — validation via avatar-capability.ts, generation via capability-router.
 * Voice cloning requires consentConfirmed=true.
 * No provider/model selection exposed.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { validateAvatarPayload, buildAvatarPrompt, type AvatarPayload } from '@/lib/avatar-capability'
import { executeCapability } from '@/lib/capability-router'
import { createGeneratedAsset } from '@/lib/campaign-storage'

const FORBIDDEN = ['provider', 'model', 'providerOverride', 'modelOverride', 'endpoint'] as const

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  // Strip forbidden provider/model override fields
  for (const key of FORBIDDEN) delete body[key]

  const appSlug = (body.appSlug as string) ?? 'dashboard'
  const payload = body as unknown as AvatarPayload

  // Validate avatar payload (includes consent checks for voice cloning)
  const validation = validateAvatarPayload(payload)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const prompt = buildAvatarPrompt(payload)

    // Route through capability-router — runtime selects provider/model
    const result = await executeCapability({
      input: prompt.prompt,
      capability: 'image_generation',
      appId: appSlug,
      metadata: { avatarPayload: payload, negativePrompt: prompt.negativePrompt },
    })

    // Persist as generated asset
    const asset = await createGeneratedAsset({
      appSlug,
      assetType: 'avatar',
      capability: 'image_generation',
      runtimeSelectedProvider: result.provider ?? '',
      runtimeSelectedModel: result.model ?? '',
      fallbackUsed: result.fallbackUsed ?? false,
      generationMode: 'image',
      promptSummary: payload.avatarName,
      resultUrl: result.output !== null ? result.output : undefined,
      error: result.error !== null ? result.error : undefined,
      metadata: { avatarPayload: payload },
    })

    return NextResponse.json({
      assetId: asset.id,
      status: asset.status,
      resultUrl: asset.resultUrl,
      error: asset.error,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Generation failed' }, { status: 500 })
  }
}
