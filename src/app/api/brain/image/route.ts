import { NextRequest, NextResponse } from 'next/server';
import { getVaultApiKey } from '@/lib/brain';
import { callGenXMedia, GENX_IMAGE_MODELS } from '@/lib/genx-client';
import { parseTogetherImageResponse } from '@/lib/together-image-parser';

/**
 * POST /api/brain/image — Standard image generation
 *
 * Provider chain (first configured key that succeeds wins).
 * Default order (balanced/cheap): Together AI → GenX
 * Premium order: GenX → Together AI
 * Explicit override: try preferred provider first, then fallback chain unless capability is adult.
 *
 * Accepts JSON body:
 *   - prompt           (string, required)
 *   - preferProvider   (string, optional) — 'together' | 'genx' | 'huggingface' — hint, not hard lock
 *   - providerOverride (string, optional) — kept for compat; treated same as preferProvider
 *   - modelOverride    (string, optional)
 *   - model            (string, optional)
 *   - size             (string, optional)
 *   - costMode         (string, optional) — 'cheap' | 'balanced' | 'premium'
 *   - noFallback       (boolean, optional) — set true to disable fallback (explicit override semantics)
 *   - capability       (string, optional) — 'image_generation' | 'adult_image' (adult never falls back to genx)
 *
 * Returns:
 *   { executed, imageUrl?, imageBase64?, provider, model, error?, attempts }
 */

const ALLOWED_SIZES = ['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024'] as const;
type ImageSize = (typeof ALLOWED_SIZES)[number];

const FLUX_MODELS = [
  { id: process.env.TOGETHER_IMAGE_MODEL?.trim() || 'black-forest-labs/FLUX.2-dev', steps: 8 },
  { id: 'black-forest-labs/FLUX.1-schnell', steps: 4 },
].filter((entry, index, list) => entry.id && list.findIndex((item) => item.id === entry.id) === index);

type ImageAttempt = {
  provider: string;
  model: string;
  status: 'ok' | 'no_image' | 'http_error' | 'no_key' | 'exception';
  error?: string;
  responseShape?: string[];
}

/** Select a GenX image model by quality tier rather than by array position. */
function selectGenXImageModel(modelOverride: string | undefined, costMode: string): string {
  if (modelOverride && GENX_IMAGE_MODELS.includes(modelOverride as (typeof GENX_IMAGE_MODELS)[number])) {
    return modelOverride;
  }
  if (costMode === 'premium') return 'gpt-image-2';
  if (costMode === 'cheap') return 'genxlm-pro-v1-img-fast';
  // balanced default — mid-tier
  return 'genxlm-pro-v1-img';
}

/**
 * Parse a Together AI image response body into a usable image URL or base64 string.
 * Together can return multiple shapes depending on the model and endpoint version:
 *   - { data: [{ url }] }             — standard SDXL/FLUX URL
 *   - { data: [{ b64_json }] }        — base64 encoded image
 *   - { data: [{ image_url }] }       — alternate key (some models)
 *   - { artifacts: [{ uri }] }        — legacy Together artifact shape
 *   - { output: { choices: [{ url }]}} — older Together generations shape
 */


async function tryTogether(
  prompt: string,
  togetherKey: string,
  model?: string,
): Promise<{ ok: boolean; url?: string; base64?: string; usedModel?: string; attempt: ImageAttempt }> {
  const models = model ? [{ id: model, steps: 4 }] : FLUX_MODELS;
  for (const { id: fluxModel, steps } of models) {
    let responseShapeKeys: string[] = [];
    try {
      const response = await fetch('https://api.together.xyz/v1/images/generations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${togetherKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: fluxModel, prompt: prompt.trim(), n: 1, steps, width: 1024, height: 1024 }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        return {
          ok: false,
          attempt: {
            provider: 'together',
            model: fluxModel,
            status: 'http_error',
            error: `HTTP ${response.status}${errText ? ': ' + errText.slice(0, 200) : ''}`,
          },
        };
      }

      const rawBody = await response.json().catch(() => null);
      const parsed = parseTogetherImageResponse(rawBody);
      responseShapeKeys = parsed.responseShapeKeys;

      if (parsed.url) {
        return { ok: true, url: parsed.url, usedModel: fluxModel, attempt: { provider: 'together', model: fluxModel, status: 'ok' } };
      }
      if (parsed.base64) {
        return { ok: true, base64: parsed.base64, usedModel: fluxModel, attempt: { provider: 'together', model: fluxModel, status: 'ok' } };
      }

      // Response was OK but no usable image found — return diagnostics
      return {
        ok: false,
        attempt: {
          provider: 'together',
          model: fluxModel,
          status: 'no_image',
          error: `Together response did not contain a usable image. Response keys: [${responseShapeKeys.join(', ')}]. Check model availability for: ${fluxModel}`,
          responseShape: responseShapeKeys,
        },
      };
    } catch (err) {
      return {
        ok: false,
        attempt: {
          provider: 'together',
          model: fluxModel,
          status: 'exception',
          error: err instanceof Error ? err.message : String(err),
          responseShape: responseShapeKeys,
        },
      };
    }
  }
  return { ok: false, attempt: { provider: 'together', model: model ?? 'black-forest-labs/FLUX.2-dev', status: 'exception', error: 'No models to try' } };
}

async function tryGenX(
  prompt: string,
  model: string,
): Promise<{ ok: boolean; url?: string; jobId?: string; status?: string; usedModel?: string; attempt: ImageAttempt }> {
  try {
    const result = await callGenXMedia({ model, prompt: prompt.trim(), type: 'image' });
    if (result.success && result.url) return { ok: true, url: result.url, usedModel: result.model, attempt: { provider: 'genx', model, status: 'ok' } };
    if (result.success && result.jobId) return { ok: true, jobId: result.jobId, status: result.status, usedModel: result.model, attempt: { provider: 'genx', model, status: 'ok' } };
    return { ok: false, attempt: { provider: 'genx', model, status: 'no_image', error: result.error ?? 'GenX returned no image or job.' } };
  } catch (err) {
    return { ok: false, attempt: { provider: 'genx', model, status: 'exception', error: err instanceof Error ? err.message : String(err) } };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model: requestedModel,
      size = '1024x1024',
      providerOverride,
      preferProvider,
      modelOverride,
      costMode = 'balanced',
      noFallback = false,
      capability = 'image_generation',
    } = body as {
      prompt?: string;
      model?: string;
      size?: string;
      providerOverride?: string;
      preferProvider?: string;
      modelOverride?: string;
      costMode?: string;
      noFallback?: boolean;
      capability?: string;
    };

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt is required and must be a non-empty string' }, { status: 400 });
    }

    const resolvedSize: ImageSize = ALLOWED_SIZES.includes(size as ImageSize) ? (size as ImageSize) : '1024x1024';
    const effectiveModel = modelOverride ?? requestedModel;
    // preferProvider / providerOverride both act as preference hints.
    // noFallback=true makes them hard overrides (used by direct provider test flows).
    const preferredProvider = (preferProvider ?? providerOverride ?? '').trim().toLowerCase() || null;
    const effectiveCostMode = ['cheap', 'balanced', 'premium'].includes(costMode) ? costMode : 'balanced';
    const isAdult = capability === 'adult_image';
    const togetherKey = await getVaultApiKey('together');
    const attempts: ImageAttempt[] = [];

    // ── Explicit hard override (noFallback=true) ──────────────────────────────
    if (preferredProvider && noFallback && preferredProvider !== 'auto') {
      if (preferredProvider === 'together') {
        if (!togetherKey) {
          return NextResponse.json({ executed: false, capability, code: 'no_key', error: 'Together AI key not configured.', provider: 'together', attempts }, { status: 503 });
        }
        const r = await tryTogether(prompt, togetherKey, effectiveModel);
        attempts.push(r.attempt);
        if (r.ok && r.url) return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'together', model: r.usedModel, size: '1024x1024', attempts });
        if (r.ok && r.base64) return NextResponse.json({ executed: true, imageBase64: r.base64, provider: 'together', model: r.usedModel, size: '1024x1024', attempts });
        return NextResponse.json({ executed: false, capability, code: 'provider_failed', error: r.attempt.error, provider: 'together', attempts }, { status: 503 });
      }
      if (preferredProvider === 'genx') {
        const gModel = selectGenXImageModel(effectiveModel, effectiveCostMode);
        const r = await tryGenX(prompt, gModel);
        attempts.push(r.attempt);
        if (r.ok && r.url) return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'genx', model: r.usedModel, size: resolvedSize, attempts });
        if (r.ok && r.jobId) return NextResponse.json({ executed: true, jobId: r.jobId, status: r.status, provider: 'genx', model: r.usedModel, size: resolvedSize, attempts });
        return NextResponse.json({ executed: false, capability, code: 'provider_failed', error: r.attempt.error, provider: 'genx', attempts }, { status: 503 });
      }
    }

    // ── Auto routing with fallback ────────────────────────────────────────────
    // Build ordered provider list based on cost mode and preference hint.
    // Adult image never falls back to GenX.
    type ImageProvider = 'together' | 'genx';
    const providerOrder: ImageProvider[] = (() => {
      const preferGenX = effectiveCostMode === 'premium';
      const base: ImageProvider[] = preferGenX ? ['genx', 'together'] : ['together', 'genx'];
      // If a preferred provider is specified, move it to front
      if (preferredProvider === 'together' || preferredProvider === 'genx') {
        const pref = preferredProvider as ImageProvider;
        return [pref, ...base.filter((p) => p !== pref)];
      }
      return base;
    })();

    // Filter out GenX for adult capability
    const eligibleProviders = isAdult
      ? providerOrder.filter((p) => p !== 'genx')
      : providerOrder;

    for (const provider of eligibleProviders) {
      if (provider === 'together') {
        if (!togetherKey) {
          attempts.push({ provider: 'together', model: process.env.TOGETHER_IMAGE_MODEL?.trim() || 'black-forest-labs/FLUX.2-dev', status: 'no_key', error: 'Together AI key not configured.' });
          continue;
        }
        const r = await tryTogether(prompt, togetherKey, effectiveModel);
        attempts.push(r.attempt);
        if (r.ok && r.url) {
          return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'together', model: r.usedModel, size: '1024x1024', fallbackUsed: attempts.length > 1, attempts });
        }
        if (r.ok && r.base64) {
          return NextResponse.json({ executed: true, imageBase64: r.base64, provider: 'together', model: r.usedModel, size: '1024x1024', fallbackUsed: attempts.length > 1, attempts });
        }
        // Together failed — log and continue to next provider
        console.warn(`[brain/image] Together failed, falling back. Reason: ${r.attempt.error}`);
        continue;
      }

      if (provider === 'genx') {
        const gModel = selectGenXImageModel(effectiveModel, effectiveCostMode);
        const r = await tryGenX(prompt, gModel);
        attempts.push(r.attempt);
        if (r.ok && r.url) return NextResponse.json({ executed: true, imageUrl: r.url, provider: 'genx', model: r.usedModel, size: resolvedSize, fallbackUsed: attempts.length > 1, attempts });
        if (r.ok && r.jobId) return NextResponse.json({ executed: true, jobId: r.jobId, status: r.status, provider: 'genx', model: r.usedModel, size: resolvedSize, fallbackUsed: attempts.length > 1, attempts });
        continue;
      }
    }

    const attemptSummary = attempts.map((a) => `${a.provider}/${a.model}: ${a.error ?? a.status}`).join('; ');
    return NextResponse.json({
      executed: false,
      capability,
      code: 'all_providers_failed',
      error: `All image providers failed. ${attemptSummary || 'No providers were available.'}`,
      providers_checked: eligibleProviders,
      attempts,
    }, { status: 503 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error', detail: String(err), executed: false }, { status: 500 });
  }
}
