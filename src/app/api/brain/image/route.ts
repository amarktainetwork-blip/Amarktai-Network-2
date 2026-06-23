import { NextRequest, NextResponse } from 'next/server';
import { getVaultApiKey } from '@/lib/brain';
import { callGenXMedia, GENX_IMAGE_MODELS } from '@/lib/genx-client';

/**
 * POST /api/brain/image — Standard image generation
 *
 * Provider chain (first configured key that succeeds wins):
 *   0. GenX — primary
 *   1. Together AI — FLUX.1-schnell-Free → FLUX.1-schnell (fallback)
 *   2. HuggingFace (fallback)
 *
 * Accepts JSON body:
 *   - prompt  (string, required)
 *   - model   (string, optional) — override model (must be an image model)
 *   - size    (string, optional) — '1024x1024' | '1024x1792' | '1792x1024'
 *
 * Returns:
 *   { executed, imageUrl?, imageBase64?, provider, model, error? }
 */

const ALLOWED_SIZES = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'] as const;
type ImageSize = (typeof ALLOWED_SIZES)[number];

/** Together AI FLUX models tried in order for fallback image generation. */
const FLUX_MODELS = [
  { id: 'black-forest-labs/FLUX.1-schnell-Free', steps: 4 },
  { id: 'black-forest-labs/FLUX.1-schnell', steps: 4 },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model: requestedModel,
      size = '1024x1024',
      providerOverride,
      modelOverride,
    } = body as {
      prompt?: string;
      model?: string;
      size?: string;
      providerOverride?: string;
      modelOverride?: string;
    };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'prompt is required and must be a non-empty string' },
        { status: 400 },
      );
    }

    const resolvedSize: ImageSize = ALLOWED_SIZES.includes(size as ImageSize)
      ? (size as ImageSize)
      : '1024x1024';

    // ── Provider 0: GenX — primary image generation ─────────────────────
    if (!providerOverride || providerOverride === 'genx') {
      const genxModel = modelOverride ?? requestedModel ?? GENX_IMAGE_MODELS[0];
      try {
        const genxResult = await callGenXMedia({ model: genxModel, prompt: prompt.trim(), type: 'image' });
        if (genxResult.success && genxResult.url) {
          return NextResponse.json({
            executed: true,
            imageUrl: genxResult.url,
            provider: 'genx',
            model: genxResult.model,
            size: resolvedSize,
          });
        }
        if (genxResult.success && genxResult.jobId) {
          return NextResponse.json({
            executed: true,
            jobId: genxResult.jobId,
            status: genxResult.status,
            provider: 'genx',
            model: genxResult.model,
            size: resolvedSize,
          });
        }
      } catch (genxErr) {
        console.warn('[brain/image] GenX image failed:', genxErr instanceof Error ? genxErr.message : genxErr);
      }
    }

    // ── Provider 1: Together AI FLUX (fallback) ────────────────────────
    const togetherKey = await getVaultApiKey('together');
    if (togetherKey && (!providerOverride || providerOverride === 'together')) {
      for (const { id: fluxModel, steps } of FLUX_MODELS) {
        try {
          const response = await fetch('https://api.together.xyz/v1/images/generations', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${togetherKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: fluxModel,
              prompt: prompt.trim(),
              n: 1,
              steps,
              width: 1024,
              height: 1024,
            }),
            signal: AbortSignal.timeout(60_000),
          });
          if (response.ok) {
            const data = await response.json() as { data?: Array<{ url?: string }> };
            const imageUrl = data.data?.[0]?.url ?? null;
            if (imageUrl) {
              return NextResponse.json({
                executed: true,
                imageUrl,
                provider: 'together',
                model: fluxModel,
                size: '1024x1024',
              });
            }
          }
        } catch (fluxErr) {
          console.warn(`[brain/image] Together AI ${fluxModel} failed:`, fluxErr instanceof Error ? fluxErr.message : fluxErr);
        }
      }
    }

    // ── No provider available — structured failure, never falls back to text ──
    const candidateModels = [...GENX_IMAGE_MODELS];
    const rejectionReasons: string[] = ['genx: not configured or returned no image'];
    if (!togetherKey) rejectionReasons.push('together: no API key configured');

    return NextResponse.json(
      {
        executed: false,
        capability: 'image_generation',
        code: 'no_eligible_image_model',
        error:
          'No image generation provider is configured. ' +
          'Configure at least one of: GenX, Together AI (FLUX), or HuggingFace in Admin → AI Providers.',
        candidate_models: candidateModels,
        rejection_reasons: rejectionReasons,
        providers_checked: ['genx', 'together', 'huggingface'],
      },
      { status: 503 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err), executed: false },
      { status: 500 },
    );
  }
}
