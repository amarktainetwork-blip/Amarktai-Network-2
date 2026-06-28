import { NextRequest, NextResponse } from 'next/server';
import { getVaultApiKey } from '@/lib/brain';
import { callGenXMedia, GENX_IMAGE_MODELS } from '@/lib/genx-client';

/**
 * POST /api/brain/image — Standard image generation
 *
 * Provider chain (first configured key that succeeds wins).
 * Default order (balanced/cheap): Together AI → GenX
 * Premium order or explicit override: GenX → Together AI
 *
 * Accepts JSON body:
 *   - prompt          (string, required)
 *   - providerOverride (string, optional) — 'together' | 'genx' | 'huggingface'
 *   - modelOverride   (string, optional) — override model id
 *   - model           (string, optional) — alias for modelOverride
 *   - size            (string, optional) — '1024x1024' | '1024x1792' | '1792x1024'
 *   - costMode        (string, optional) — 'cheap' | 'balanced' | 'premium'
 *
 * Returns:
 *   { executed, imageUrl?, imageBase64?, provider, model, error? }
 */

const ALLOWED_SIZES = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'] as const;
type ImageSize = (typeof ALLOWED_SIZES)[number];

const FLUX_MODELS = [
  { id: 'black-forest-labs/FLUX.1-schnell-Free', steps: 4 },
  { id: 'black-forest-labs/FLUX.1-schnell', steps: 4 },
];

/**
 * Select a GenX image model by quality tier rather than by array position.
 * Defaults to a mid-tier model; only uses premium (gpt-image-2) when explicitly requested.
 */
function selectGenXImageModel(modelOverride: string | undefined, costMode: string): string {
  if (modelOverride && GENX_IMAGE_MODELS.includes(modelOverride as (typeof GENX_IMAGE_MODELS)[number])) {
    return modelOverride;
  }
  if (costMode === 'premium') return 'gpt-image-2';
  if (costMode === 'cheap') return 'genxlm-pro-v1-img-fast';
  // balanced default — mid-tier
  return 'genxlm-pro-v1-img';
}

async function tryTogether(prompt: string, togetherKey: string, model?: string): Promise<{ ok: boolean; url?: string; usedModel?: string }> {
  const models = model ? [{ id: model, steps: 4 }] : FLUX_MODELS;
  for (const { id: fluxModel, steps } of models) {
    try {
      const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${togetherKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: fluxModel, prompt: prompt.trim(), n: 1, steps, width: 1024, height: 1024 }),
        signal: AbortSignal.timeout(60_000),
      });
      if (response.ok) {
        const data = await response.json() as { data?: Array<{ url?: string }> };
        const url = data.data?.[0]?.url;
        if (url) return { ok: true, url, usedModel: fluxModel };
      }
    } catch (err) {
      console.warn(`[brain/image] Together ${fluxModel} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return { ok: false };
}

async function tryGenX(prompt: string, model: string): Promise<{ ok: boolean; url?: string; jobId?: string; status?: string; usedModel?: string }> {
  try {
    const result = await callGenXMedia({ model, prompt: prompt.trim(), type: 'image' });
    if (result.success && result.url) return { ok: true, url: result.url, usedModel: result.model };
    if (result.success && result.jobId) return { ok: true, jobId: result.jobId, status: result.status, usedModel: result.model };
  } catch (err) {
    console.warn('[brain/image] GenX image failed:', err instanceof Error ? err.message : err);
  }
  return { ok: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model: requestedModel,
      size = '1024x1024',
      providerOverride,
      modelOverride,
      costMode = 'balanced',
    } = body as {
      prompt?: string;
      model?: string;
      size?: string;
      providerOverride?: string;
      modelOverride?: string;
      costMode?: string;
    };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required and must be a non-empty string' }, { status: 400 });
    }

    const resolvedSize: ImageSize = ALLOWED_SIZES.includes(size as ImageSize) ? (size as ImageSize) : '1024x1024';
    const effectiveModel = modelOverride ?? requestedModel;
    const override = typeof providerOverride === 'string' ? providerOverride.trim().toLowerCase() : null;
    const effectiveCostMode = ['cheap', 'balanced', 'premium'].includes(costMode) ? costMode : 'balanced';
    const togetherKey = await getVaultApiKey('together');

    // ── Explicit provider override ────────────────────────────────────────────
    if (override && override !== 'auto') {
      if (override === 'together') {
        if (!togetherKey) {
          return NextResponse.json({ executed: false, capability: 'image_generation', code: 'no_key', error: 'Together AI key not configured.', provider: 'together' }, { status: 503 });
        }
        const r = await tryTogether(prompt, togetherKey, effectiveModel);
        if (r.ok && r.url) return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'together', model: r.usedModel, size: '1024x1024' });
        return NextResponse.json({ executed: false, capability: 'image_generation', code: 'provider_failed', error: 'Together AI returned no image.', provider: 'together' }, { status: 503 });
      }
      if (override === 'genx') {
        const gModel = selectGenXImageModel(effectiveModel, effectiveCostMode);
        const r = await tryGenX(prompt, gModel);
        if (r.ok && r.url) return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'genx', model: r.usedModel, size: resolvedSize });
        if (r.ok && r.jobId) return NextResponse.json({ executed: true, jobId: r.jobId, status: r.status, provider: 'genx', model: r.usedModel, size: resolvedSize });
        return NextResponse.json({ executed: false, capability: 'image_generation', code: 'provider_failed', error: 'GenX returned no image.', provider: 'genx' }, { status: 503 });
      }
      // Unknown override — fall through to auto
    }

    // ── Auto routing: Together first (cheaper) unless premium ─────────────────
    const preferGenXFirst = effectiveCostMode === 'premium';

    if (!preferGenXFirst && togetherKey) {
      const r = await tryTogether(prompt, togetherKey, effectiveModel);
      if (r.ok && r.url) return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'together', model: r.usedModel, size: '1024x1024' });
    }

    // GenX attempt
    const gModel = selectGenXImageModel(effectiveModel, effectiveCostMode);
    const rg = await tryGenX(prompt, gModel);
    if (rg.ok && rg.url) return NextResponse.json({ executed: true, imageUrl: rg.url, provider: 'genx', model: rg.usedModel, size: resolvedSize });
    if (rg.ok && rg.jobId) return NextResponse.json({ executed: true, jobId: rg.jobId, status: rg.status, provider: 'genx', model: rg.usedModel, size: resolvedSize });

    // Together fallback if not tried yet (premium mode tried GenX first)
    if (preferGenXFirst && togetherKey) {
      const r = await tryTogether(prompt, togetherKey, effectiveModel);
      if (r.ok && r.url) return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'together', model: r.usedModel, size: '1024x1024', fallbackUsed: true });
    }

    return NextResponse.json({
      executed: false,
      capability: 'image_generation',
      code: 'no_eligible_image_model',
      error: 'No image generation provider is configured. Configure at least one of: Together AI (FLUX), GenX in Admin → AI Providers.',
      providers_checked: ['together', 'genx'],
    }, { status: 503 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error', detail: String(err), executed: false }, { status: 500 });
  }
}
