/**
 * Together AI image response parser.
 * Handles all documented response shapes from Together's image generation API.
 * Exported from lib (not from the route) to avoid Next.js route type conflicts.
 */

export type TogetherImageParseResult = {
  url?: string;
  base64?: string;
  responseShapeKeys: string[];
};

/**
 * Parse a Together AI image response body into a usable image URL or base64 string.
 * Together can return multiple shapes depending on the model and endpoint version:
 *   - { data: [{ url }] }               — standard SDXL/FLUX URL
 *   - { data: [{ b64_json }] }          — base64 encoded image
 *   - { data: [{ image_url }] }         — alternate key (some models)
 *   - { artifacts: [{ uri }] }          — legacy Together artifact shape
 *   - { output: { choices: [{ url }] }} — older Together generations shape
 *   - { url } / { image_url }           — direct root-level keys
 */
export function parseTogetherImageResponse(body: unknown): TogetherImageParseResult {
  if (!body || typeof body !== 'object') return { responseShapeKeys: [] };
  const raw = body as Record<string, unknown>;
  const topKeys = Object.keys(raw).sort();

  // Standard data array shape
  if (Array.isArray(raw.data) && raw.data.length > 0) {
    const first = raw.data[0] as Record<string, unknown>;
    if (typeof first.url === 'string' && first.url) return { url: first.url, responseShapeKeys: topKeys };
    if (typeof first.image_url === 'string' && first.image_url) return { url: first.image_url, responseShapeKeys: topKeys };
    if (typeof first.b64_json === 'string' && first.b64_json) {
      return { base64: `data:image/png;base64,${first.b64_json}`, responseShapeKeys: topKeys };
    }
  }

  // Together artifacts shape
  if (Array.isArray(raw.artifacts) && raw.artifacts.length > 0) {
    const first = raw.artifacts[0] as Record<string, unknown>;
    if (typeof first.uri === 'string' && first.uri) return { url: first.uri, responseShapeKeys: topKeys };
    if (typeof first.url === 'string' && first.url) return { url: first.url, responseShapeKeys: topKeys };
  }

  // Legacy output.choices shape
  const output = raw.output as Record<string, unknown> | undefined;
  if (output && Array.isArray(output.choices) && output.choices.length > 0) {
    const first = output.choices[0] as Record<string, unknown>;
    if (typeof first.url === 'string' && first.url) return { url: first.url, responseShapeKeys: topKeys };
  }

  // Direct url/image_url at root level
  if (typeof raw.url === 'string' && raw.url) return { url: raw.url, responseShapeKeys: topKeys };
  if (typeof raw.image_url === 'string' && raw.image_url) return { url: raw.image_url, responseShapeKeys: topKeys };

  return { responseShapeKeys: topKeys };
}
