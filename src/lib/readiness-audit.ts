import {
  getDashboardRuntimeTruth,
  type RuntimeReadinessState,
} from '@/lib/runtime-capability-truth'

export interface AuditCheck {
  id: string
  category: 'provider' | 'capability' | 'adult' | 'local_core'
  name: string
  description: string
  status: RuntimeReadinessState
  details: string
  critical: boolean
}

export interface ReadinessReport {
  timestamp: string
  overallReady: boolean
  score: number
  totalChecks: number
  passed: number
  failed: number
  warnings: number
  criticalFailures: number
  checks: AuditCheck[]
  summary: string
}

export function getReadinessScore(checks: AuditCheck[]): number {
  if (!checks.length) return 0
  const weights: Record<RuntimeReadinessState, number> = {
    READY: 1,
    DEGRADED: 0.5,
    NEEDS_CONFIGURATION: 0,
    BLOCKED: 0,
    UNAVAILABLE: 0,
  }
  return Math.round(checks.reduce((total, item) => total + weights[item.status], 0) / checks.length * 100)
}

export function generateReadinessSummary(report: ReadinessReport): string {
  return report.overallReady
    ? `READY: ${report.passed}/${report.totalChecks} runtime checks are ready.`
    : `BLOCKED: ${report.criticalFailures} critical checks require action; readiness score ${report.score}.`
}

export async function runReadinessAudit(): Promise<ReadinessReport> {
  const truth = await getDashboardRuntimeTruth()
  const checks: AuditCheck[] = [
    ...truth.providers.map((provider) => ({
      id: `provider:${provider.key}`,
      category: 'provider' as const,
      name: provider.displayName,
      description: 'Approved provider or infrastructure connection.',
      status: provider.status,
      details: provider.reason,
      critical: provider.key === 'genx',
    })),
    ...truth.capabilities.map((capability) => ({
      id: `capability:${capability.name}`,
      category: 'capability' as const,
      name: capability.name,
      description: 'Capability execution readiness.',
      status: capability.status,
      details: capability.blocker ?? `Ready through ${capability.models.join(', ')}.`,
      critical: ['Text / Chat', 'Coding Agent', 'Repo / GitHub'].includes(capability.name),
    })),
    {
      id: 'adult:policy',
      category: 'adult',
      name: 'Adult mode policy',
      description: 'Explicit global opt-in plus approved route readiness.',
      status: truth.adultGate.status,
      details: truth.adultGate.blocker ?? 'Adult mode is explicitly enabled and routed.',
      critical: false,
    },
    {
      id: 'local:core',
      category: 'local_core',
      name: 'Local execution stores',
      description: 'Memory, approvals, artifacts, research, apps, and agents are writable.',
      status: truth.localCore.allWorking ? 'READY' : 'BLOCKED',
      details: truth.localCore.allWorking ? 'All local stores are writable.' : 'One or more local stores are not writable.',
      critical: true,
    },
  ]

  const passed = checks.filter((item) => item.status === 'READY').length
  const failed = checks.filter((item) => item.status === 'BLOCKED' || item.status === 'NEEDS_CONFIGURATION').length
  const warnings = checks.filter((item) => item.status === 'DEGRADED' || item.status === 'UNAVAILABLE').length
  const criticalFailures = checks.filter((item) => item.critical && item.status !== 'READY').length
  const report: ReadinessReport = {
    timestamp: new Date().toISOString(),
    overallReady: criticalFailures === 0,
    score: getReadinessScore(checks),
    totalChecks: checks.length,
    passed,
    failed,
    warnings,
    criticalFailures,
    checks,
    summary: '',
  }
  report.summary = generateReadinessSummary(report)
  return report
}
