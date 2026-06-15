import { getProviderKeyWithSource } from '@/lib/provider-config'
import { getMeshTestNotes } from '@/lib/provider-mesh-status'
import type { ProviderHealthSnapshot, ProviderId } from './provider-types'

export async function getCanonicalProviderHealth(
  provider: ProviderId,
): Promise<ProviderHealthSnapshot> {
  const [credential, notes] = await Promise.all([
    getProviderKeyWithSource(provider),
    getMeshTestNotes(provider),
  ])
  const configured = Boolean(credential.key)
  const tested = Boolean(notes.lastTestedAt)
  const passed = notes.lastTestStatus === 'passed' && notes.lastTestPassed !== false
  const failed = notes.lastTestStatus === 'failed'
  return {
    provider,
    state: !configured
      ? 'unconfigured'
      : passed
        ? 'healthy'
        : failed ? 'degraded' : 'unknown',
    configured,
    tested,
    healthy: passed,
    checkedAt: notes.lastTestedAt ?? null,
    detail: String(
      notes.detail
      ?? notes.lastError
      ?? (!configured
        ? 'Provider credential is not configured.'
        : 'Provider is configured but has no current live health proof.'),
    ).slice(0, 280),
  }
}
