import { NextRequest, NextResponse } from 'next/server';
import { getVaultApiKey } from '@/lib/brain';

/**
 * POST /api/brain/embeddings — Create text embeddings
 *
 * Provider chain (first configured key that succeeds wins):
 *   1. HuggingFace — sentence-transformers/all-MiniLM-L6-v2 (feature-extraction pipeline)
 *   2. GenX — OpenAI-compatible /v1/embeddings endpoint
 *
 * Accepts JSON body:
 *   - input  (string | string[], required) — text(s) to embed
 *   - model  (string, optional) — override model
 *
 * Returns:
 *   { executed, embeddings?, provider, model, dimensions?, error?, capability }
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { input, model: requestedModel } = body as {
      input?: string | string[];
      model?: string;
    };

    if (!input || (typeof input !== 'string' && !Array.isArray(input))) {
      return NextResponse.json(
        { error: 'input is required and must be a string or array of strings', capability: 'embeddings' },
        { status: 400 },
      );
    }

    const texts = Array.isArray(input) ? input : [input];

    // ── Provider 1: HuggingFace feature-extraction (primary) ──────────────
    const hfKey = await getVaultApiKey('huggingface');
    if (hfKey) {
      const hfModel = requestedModel ?? 'sentence-transformers/all-MiniLM-L6-v2';
      try {
        const embeddingResults: number[][] = [];
        for (const text of texts) {
          const response = await fetch(
            `https://api-inference.huggingface.co/pipeline/feature-extraction/${encodeURIComponent(hfModel)}`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${hfKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ inputs: text.slice(0, 8000) }),
              signal: AbortSignal.timeout(30_000),
            },
          );

          if (!response.ok) {
            const errBody = await response.json().catch(() => ({})) as { error?: string };
            console.warn(
              `[brain/embeddings] HuggingFace ${hfModel} failed (${response.status}): ${errBody?.error ?? ''}`,
            );
            embeddingResults.length = 0;
            break;
          }

          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            embeddingResults.push(Array.isArray(data[0]) ? data[0] : data);
          } else {
            embeddingResults.length = 0;
            break;
          }
        }

        if (embeddingResults.length === texts.length) {
          return NextResponse.json({
            executed: true,
            embeddings: embeddingResults,
            provider: 'huggingface',
            model: hfModel,
            dimensions: embeddingResults[0]?.length ?? 0,
            capability: 'embeddings',
          });
        }
      } catch (err) {
        console.warn(
          '[brain/embeddings] HuggingFace call failed:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    // Provider 2: Together OpenAI-compatible embeddings (fallback)
    const togetherKey = await getVaultApiKey('together');
    if (togetherKey) {
      const togetherModel = requestedModel ?? 'BAAI/bge-large-en-v1.5';
      try {
        const response = await fetch('https://api.together.xyz/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${togetherKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: togetherModel, input }),
          signal: AbortSignal.timeout(30_000),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            data?: Array<{ embedding?: number[]; index?: number }>;
            model?: string;
            usage?: { prompt_tokens?: number; total_tokens?: number };
          };
          const embeddings = data.data?.map((d) => d.embedding).filter((embedding): embedding is number[] => Array.isArray(embedding)) ?? [];
          if (embeddings.length > 0) {
            return NextResponse.json({
              executed: true,
              embeddings,
              provider: 'together',
              model: data.model ?? togetherModel,
              dimensions: embeddings[0]?.length ?? 0,
              usage: data.usage,
              capability: 'embeddings',
            });
          }
        } else {
          const errBody = (await response.json().catch(() => ({}))) as {
            error?: { message?: string } | string;
          };
          const message = typeof errBody.error === 'string'
            ? errBody.error
            : errBody.error?.message;
          console.warn(
            `[brain/embeddings] Together ${togetherModel} failed: ${message ?? response.status}`,
          );
        }
      } catch (err) {
        console.warn(
          '[brain/embeddings] Together call failed:',
          err instanceof Error ? err.message : err,
        );
      }
    }

    try {
      const { resolveGenXConfig } = await import('@/lib/genx-client');
      const { apiUrl, apiKey, configured } = await resolveGenXConfig();
      if (configured && apiKey) {
        const genxModel = requestedModel ?? 'text-embedding-3-small';
        const response = await fetch(`${apiUrl}/v1/embeddings`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ model: genxModel, input }),
          signal: AbortSignal.timeout(30_000),
        });

        if (response.ok) {
          const data = (await response.json()) as {
            data?: Array<{ embedding?: number[]; index?: number }>;
            model?: string;
            usage?: { prompt_tokens?: number; total_tokens?: number };
          };
          const embeddings = data.data?.map((d) => d.embedding) ?? [];
          if (embeddings.length > 0) {
            return NextResponse.json({
              executed: true,
              embeddings,
              provider: 'genx',
              model: data.model ?? genxModel,
              dimensions: embeddings[0]?.length ?? 0,
              usage: data.usage,
              capability: 'embeddings',
            });
          }
        } else {
          const errBody = (await response.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          console.warn(
            `[brain/embeddings] GenX ${genxModel} failed: ${errBody?.error?.message ?? response.status}`,
          );
        }
      }
    } catch (err) {
      console.warn(
        '[brain/embeddings] GenX call failed:',
        err instanceof Error ? err.message : err,
      );
    }

    // ── No provider available ──────────────────────────────────────────
    return NextResponse.json(
      {
        executed: false,
        error:
          'No embeddings provider is configured. ' +
          'Add an API key via Admin → AI Providers. ' +
          'Supported: HuggingFace (sentence-transformers/all-MiniLM-L6-v2), Together, GenX.',
        providers_checked: ['huggingface', 'together', 'genx'],
        capability: 'embeddings',
      },
      { status: 503 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'Internal server error', detail: String(err), executed: false, capability: 'embeddings' },
      { status: 500 },
    );
  }
}
