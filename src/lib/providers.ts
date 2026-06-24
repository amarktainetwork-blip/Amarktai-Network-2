import { decryptVaultKey } from '@/lib/crypto-vault'
import { getProviderMeshNode, isApprovedDirectProvider } from '@/lib/provider-mesh'
import { buildProviderAuthHeaders } from '@/lib/provider-registry'

export function maskApiKey(key: string): string {
  const trimmed = key.trim()
  if (!trimmed) return ''
  if (trimmed.length <= 8) return '********'
  const dashIndex = trimmed.lastIndexOf('-', 10)
  const prefixLength = dashIndex > 0 ? dashIndex + 1 : Math.min(7, trimmed.length - 4)
  return `${trimmed.slice(0, prefixLength)}************${trimmed.slice(-4)}`
}

export interface HealthCheckResult {
  status: 'healthy' | 'configured' | 'degraded' | 'error' | 'unconfigured' | 'disabled'
  message: string
}

export type ProviderOperationalState = 'WORKING' | 'MISCONFIGURED' | 'UNAVAILABLE'

export function mapHealthStatusToTruthState(
  status: HealthCheckResult['status'],
): ProviderOperationalState {
  if (status === 'healthy') return 'WORKING'
  if (status === 'error' || status === 'unconfigured') return 'MISCONFIGURED'
  return 'UNAVAILABLE'
}

function resolveStoredApiKey(rawStoredKey: string): string {
  const decrypted = decryptVaultKey(rawStoredKey)
  const candidate = decrypted ?? rawStoredKey
  return candidate.trim().replace(/^Bearer\s+/i, '')
}

async function probe(
  url: string,
  apiKey: string,
  providerKey: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(url, {
    ...init,
    headers: {
      ...buildProviderAuthHeaders(providerKey as never, apiKey),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    signal: AbortSignal.timeout(10_000),
  })
}

function failedResponse(providerName: string, response: Response): HealthCheckResult {
  if (response.status === 401 || response.status === 403) {
    return { status: 'error', message: `${providerName} rejected the configured credential.` }
  }
  if (response.status === 429) {
    return { status: 'degraded', message: `${providerName} is rate limited.` }
  }
  return { status: 'degraded', message: `${providerName} returned HTTP ${response.status}.` }
}

export async function runProviderHealthCheck(
  providerKey: string,
  apiKey: string,
  baseUrl: string,
): Promise<HealthCheckResult> {
  if (!isApprovedDirectProvider(providerKey)) {
    return {
      status: 'error',
      message: `Provider "${providerKey}" is not an approved direct runtime provider.`,
    }
  }
  if (!apiKey) return { status: 'unconfigured', message: 'No API key configured.' }

  const resolvedApiKey = resolveStoredApiKey(apiKey)
  if (!resolvedApiKey || resolvedApiKey.startsWith('v1:')) {
    return {
      status: 'error',
      message: 'Stored API key could not be decrypted. Verify VAULT_ENCRYPTION_KEY.',
    }
  }

  const node = getProviderMeshNode(providerKey)!
  const root = (baseUrl || node.baseUrl).replace(/\/+$/, '')

  try {
    let response: Response
    switch (providerKey) {
      case 'genx':
        response = await probe(`${root}/api/v1/models`, resolvedApiKey, providerKey)
        break
      case 'huggingface':
        response = await probe('https://huggingface.co/api/whoami-v2', resolvedApiKey, providerKey)
        break
      case 'mimo':
      case 'together':
        response = await probe(`${root}/models`, resolvedApiKey, providerKey)
        break
      case 'groq':
        response = await probe(`${root}/chat/completions`, resolvedApiKey, providerKey, {
          method: 'POST',
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: 'health check' }],
            max_tokens: 1,
          }),
        })
        break
    }

    if (response.ok) {
      return { status: 'healthy', message: `Connected to ${node.displayName}.` }
    }
    return failedResponse(node.displayName, response)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown connection failure'
    return { status: 'degraded', message: `${node.displayName} health check failed: ${message}` }
  }
}
