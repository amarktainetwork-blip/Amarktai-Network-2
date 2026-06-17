import { getProviderKey } from '@/lib/provider-config'
import type { SpecialistResult } from '@/lib/specialist-provider-routes'

export async function pollQwenWanxTask(params: {
  taskId: string
  model?: string
  timeoutMs?: number
}): Promise<SpecialistResult> {
  const startedAt = Date.now()
  const key = (await getProviderKey('qwen'))?.trim().replace(/^Bearer\s+/i, '') ?? null
  const model = params.model ?? 'wanx2.1-t2i-turbo'

  if (!key) {
    return {
      ok: false,
      executed: false,
      provider: 'qwen',
      model,
      capability: 'text_to_image_poll',
      latencyMs: Date.now() - startedAt,
      error: 'Qwen/DashScope key not configured.',
    }
  }

  try {
    const response = await fetch(`https://dashscope-intl.aliyuncs.com/api/v1/tasks/${encodeURIComponent(params.taskId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(params.timeoutMs ?? 20_000),
    })

    const latencyMs = Date.now() - startedAt
    const contentType = response.headers.get('content-type') ?? 'application/json'
    if (!response.ok) {
      return {
        ok: false,
        executed: true,
        provider: 'qwen',
        model,
        capability: 'text_to_image_poll',
        latencyMs,
        contentType,
        error: `Qwen HTTP ${response.status}: ${(await response.text().catch(() => '')).slice(0, 800)}`,
      }
    }

    const json = await response.json().catch(() => null)
    return {
      ok: true,
      executed: true,
      provider: 'qwen',
      model,
      capability: 'text_to_image_poll',
      latencyMs,
      contentType,
      json,
    }
  } catch (error) {
    return {
      ok: false,
      executed: true,
      provider: 'qwen',
      model,
      capability: 'text_to_image_poll',
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'Qwen Wanx task poll failed',
    }
  }
}
