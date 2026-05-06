import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { runReadinessAudit } from '@/lib/readiness-audit'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { getProviderScoreSummaries } from '@/lib/provider-intelligence'
import { listAppAiPackages } from '@/lib/app-ai-package-store'
import { listMediaArtifacts } from '@/lib/artifact-gallery'

export const dynamic = 'force-dynamic'

type SystemState = 'ready' | 'warning' | 'blocked' | 'unknown'

function stateFrom(ok: boolean, warning = false): SystemState {
  if (ok) return warning ? 'warning' : 'ready'
  return 'blocked'
}

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [readiness, runtime, providerScores, appPackages, artifacts] = await Promise.allSettled([
    runReadinessAudit(),
    getDashboardRuntimeTruth(),
    getProviderScoreSummaries({ appSlug: 'amarktai-network', days: 14 }),
    listAppAiPackages(),
    listMediaArtifacts({ appSlug: 'amarktai-network', limit: 12 }),
  ])

  const readinessReport = readiness.status === 'fulfilled' ? readiness.value : null
  const truth = runtime.status === 'fulfilled' ? runtime.value : null
  const scores = providerScores.status === 'fulfilled' ? providerScores.value : []
  const packages = appPackages.status === 'fulfilled' ? appPackages.value : []
  const artifactList = artifacts.status === 'fulfilled' ? artifacts.value : []

  const configuredProviders = truth?.providers?.filter((provider) => provider.configured).length ?? 0
  const availableCapabilities = truth?.capabilities?.filter((capability) => capability.status === 'available').length ?? 0
  const blockedCapabilities = truth?.capabilities?.filter((capability) => capability.status !== 'available').length ?? 0
  const degradedProviders = scores.filter((score) => score.status === 'degraded' || score.status === 'failing')

  const systems = [
    {
      id: 'aiva',
      name: 'AmarktAI Assistant conversation',
      state: stateFrom(truth?.genx?.available || configuredProviders > 0, !truth?.genx?.available),
      detail: truth?.genx?.available ? 'Streaming route available through the AI engine.' : `${configuredProviders} direct provider route(s) configured.`,
      nextAction: truth?.genx?.available || configuredProviders > 0 ? null : 'Configure at least one working AI provider route.',
    },
    {
      id: 'routing',
      name: 'Smart routing',
      state: stateFrom(configuredProviders > 0, degradedProviders.length > 0),
      detail: `${configuredProviders} configured provider(s), ${scores.length} provider score record(s).`,
      nextAction: degradedProviders.length ? 'Review Provider Intelligence and rerun stream/capability tests.' : null,
    },
    {
      id: 'capabilities',
      name: 'Capabilities',
      state: stateFrom(availableCapabilities > 0, blockedCapabilities > 0),
      detail: `${availableCapabilities} available, ${blockedCapabilities} blocked or pending.`,
      nextAction: blockedCapabilities ? 'Open AI Engine capability/provider tests and resolve pending specialist routes.' : null,
    },
    {
      id: 'apps',
      name: 'App AI packages',
      state: packages.length > 0 ? stateFrom(true, packages.some((pkg) => pkg.status !== 'ready')) : ('warning' as SystemState),
      detail: `${packages.length} saved app package(s).`,
      nextAction: packages.length ? 'Review package blockers before onboarding real apps.' : 'Create and save the first app AI package when ready — not a launch blocker.',
    },
    {
      id: 'artifacts',
      name: 'Artifacts',
      state: artifactList.length > 0 ? 'ready' : 'warning',
      detail: `${artifactList.length} recent generated artifact(s).`,
      nextAction: artifactList.length ? null : 'Run a specialist generation test to verify artifact storage.',
    },
    {
      id: 'go-live',
      name: 'Go-live audit',
      state: readinessReport?.overallReady ? 'ready' : 'blocked',
      detail: readinessReport ? `${readinessReport.score}/100 · ${readinessReport.criticalFailures} critical failure(s), ${readinessReport.warnings} warning(s).` : 'Readiness audit unavailable.',
      nextAction: readinessReport?.overallReady ? null : 'Open the readiness audit and resolve critical failures.',
    },
  ]

  const blockers = [
    ...(truth?.blockers ?? []),
    ...(readinessReport?.checks?.filter((check) => check.critical && check.status === 'fail').map((check) => `${check.name}: ${check.details}`) ?? []),
    ...systems.flatMap((system) => system.nextAction ? [`${system.name}: ${system.nextAction}`] : []),
  ]

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    overallReady: systems.every((system) => system.state !== 'blocked') && readinessReport?.overallReady === true,
    score: readinessReport?.score ?? Math.round((systems.filter((system) => system.state === 'ready').length / systems.length) * 100),
    systems,
    blockers: [...new Set(blockers)].slice(0, 20),
    metrics: {
      configuredProviders,
      availableCapabilities,
      blockedCapabilities,
      savedAppPackages: packages.length,
      recentArtifacts: artifactList.length,
      providerScoreRecords: scores.length,
      degradedProviders: degradedProviders.length,
    },
    links: {
      readiness: '/admin/dashboard/readiness',
      aiOps: '/admin/dashboard/ai-engine/ops',
      providerIntelligence: '/admin/dashboard/ai-engine/intelligence',
      appSetup: '/admin/dashboard/ai-engine/app-setup',
      artifacts: '/admin/dashboard/ai-engine/artifacts',
      repoWorkbench: '/admin/dashboard/repo-workbench',
    },
  })
}
