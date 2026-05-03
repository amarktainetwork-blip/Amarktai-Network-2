import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { setGlobalAdultMode, getGlobalAdultMode, loadGlobalAdultModeFromDB } from '@/lib/content-filter'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'

/**
 * GET  /api/admin/global-adult-mode — returns current global adult mode state (synced from DB).
 * POST /api/admin/global-adult-mode — sets global adult mode for the platform (persisted to DB).
 *
 * Global adult mode upgrades any app that has safeMode=false to adultMode=true
 * without requiring per-app configuration. Apps with safeMode=true are unaffected.
 *
 * This is an admin-only operation. CSAM, violence, and self-harm are ALWAYS
 * blocked regardless of adult mode state.
 */
export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // Always sync from DB so we reflect the persisted value after a server restart
  const enabled = await loadGlobalAdultModeFromDB()
  const truth = await getDashboardRuntimeTruth().catch(() => null)
  const gate = truth?.adultGate
  return NextResponse.json({
    enabled,
    providerAvailable: gate?.providerAvailable ?? false,
    selectedProvider: gate?.selectedProvider ?? null,
    selectedModel: gate?.selectedModel ?? null,
    allowedCategories: gate?.allowedCategories ?? ['consensual_adult_suggestive'],
    blockedCategories: gate?.blockedCategories ?? ['minors', 'age_ambiguous', 'non_consensual', 'sexual_violence', 'real_person_sexual_deepfakes', 'explicit_sex_acts', 'visible_genitals', 'illegal_content', 'self_harm'],
    lastTestStatus: gate?.lastTestStatus ?? null,
    lastError: gate?.lastError ?? null,
    configuredProviders: gate?.configuredProviders ?? [],
    status: gate?.status ?? (enabled ? 'not_wired' : 'global_flag_disabled'),
    blocker: gate?.blocker ?? null,
    note: 'When enabled, any app with safeMode=false will have adultMode treated as true. CSAM, violence, and self-harm are always blocked.',
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { enabled?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.enabled !== 'boolean') {
    return NextResponse.json(
      { error: '"enabled" must be a boolean' },
      { status: 400 },
    )
  }

  setGlobalAdultMode(body.enabled)

  return NextResponse.json({
    enabled: getGlobalAdultMode(),
    note: 'When enabled, any app with safeMode=false will have adultMode treated as true. CSAM, violence, and self-harm are always blocked.',
  })
}
