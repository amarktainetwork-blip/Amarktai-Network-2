/**
 * GET /api/admin/system/live-ai-smoke-tests
 *
 * Run live smoke tests against all approved AI providers and return results.
 *
 * Response shape per provider:
 *   - provider: provider id
 *   - displayName: human-readable name
 *   - configured: whether credentials are present
 *   - testable: whether a live test was attempted
 *   - status: 'pass' | 'fail' | 'not_configured' | 'skipped'
 *   - latencyMs: round-trip latency in ms (null if not tested)
 *   - safeErrorReason: sanitized error message (no secrets)
 *   - testedAt: ISO timestamp of test (null if not tested)
 *   - supportedCapabilityGroups: capability groups this provider supports
 *   - smokeCapability: which capability was tested
 *   - smokeModel: which model was used for the test
 *
 * Query params:
 *   ?provider=genx  — test a single provider only
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runAllProviderSmokeTests, runProviderSmokeTestById } from '@/lib/live-smoke-tests'
import { isApprovedDirectProvider, type ApprovedDirectProviderId } from '@/lib/provider-mesh'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const providerParam = req.nextUrl.searchParams.get('provider')

  if (providerParam) {
    if (!isApprovedDirectProvider(providerParam)) {
      return NextResponse.json(
        { error: `Unknown provider: ${providerParam}` },
        { status: 400 },
      )
    }
    const result = await runProviderSmokeTestById(providerParam as ApprovedDirectProviderId)
    return NextResponse.json({ results: [result], testedAt: new Date().toISOString() })
  }

  const results = await runAllProviderSmokeTests()
  const summary = {
    total: results.length,
    pass: results.filter((r) => r.status === 'pass').length,
    fail: results.filter((r) => r.status === 'fail').length,
    not_configured: results.filter((r) => r.status === 'not_configured').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
  }

  return NextResponse.json({
    summary,
    results,
    testedAt: new Date().toISOString(),
  })
}
