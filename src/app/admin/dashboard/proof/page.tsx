import type React from 'react'
import { CheckCircle2, CircleDashed, AlertTriangle, FlaskConical, Settings } from 'lucide-react'
import Link from 'next/link'
import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'

export const dynamic = 'force-dynamic'

type TestStatus = 'passed' | 'failed' | 'not_tested'

const TEST_TONE: Record<TestStatus, string> = {
  passed: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  failed: 'border-red-300/20 bg-red-300/10 text-red-100',
  not_tested: 'border-slate-600/50 bg-slate-800/80 text-slate-300',
}

const TEST_LABEL: Record<TestStatus, string> = {
  passed: 'Passed',
  failed: 'Failed',
  not_tested: 'Not tested',
}

export default async function ProofPage() {
  const providers = await getProviderRuntimeTruth()

  const summary = {
    passed: providers.filter((p) => p.lastTestStatus === 'passed').length,
    failed: providers.filter((p) => p.lastTestStatus === 'failed').length,
    not_tested: providers.filter((p) => p.lastTestStatus === 'not_tested').length,
    connected: providers.filter((p) => p.connected).length,
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Proof</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Proof &amp; Tests</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Provider proof status is derived from actual test results stored in the database.
              A provider is only considered connected when it has a key and has passed a live test.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Summary label="Passed" value={summary.passed} />
            <Summary label="Failed" value={summary.failed} />
            <Summary label="Not tested" value={summary.not_tested} />
            <Summary label="Connected" value={summary.connected} />
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-amber-300/15 bg-amber-300/5 p-4">
        <div className="flex items-start gap-3">
          <FlaskConical className="mt-0.5 h-4 w-4 text-amber-300" />
          <div className="text-sm leading-6 text-amber-100">
            <span className="font-black">Run tests in Settings.</span>{' '}
            Test execution is available on the{' '}
            <Link href="/admin/dashboard/settings" className="underline hover:text-white">
              Settings page
            </Link>
            . This page shows the last recorded result for each provider.
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_1fr] gap-px bg-slate-800/70 text-xs">
          {['Provider ID', 'Display name', 'Last test status', 'Last tested at', 'Connected'].map((h) => (
            <div key={h} className="bg-slate-950/80 px-3 py-2 font-black uppercase tracking-[0.12em] text-slate-500">
              {h}
            </div>
          ))}
          {providers.map((p) => (
            <ProofRow key={p.providerId} provider={p} />
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center gap-3">
          <Settings className="h-4 w-4 text-cyan-300" />
          <p className="text-sm text-slate-400">
            To run a provider test, go to{' '}
            <Link href="/admin/dashboard/settings" className="font-black text-cyan-300 underline hover:text-white">
              Settings
            </Link>{' '}
            and use the provider test controls there.
          </p>
        </div>
      </section>
    </div>
  )
}

function ProofRow({ provider }: { provider: Awaited<ReturnType<typeof getProviderRuntimeTruth>>[number] }) {
  const status = provider.lastTestStatus
  return (
    <>
      <Cell strong>
        <span className="font-mono">{provider.providerId}</span>
      </Cell>
      <Cell>{provider.displayName}</Cell>
      <Cell>
        <TestStatusPill status={status} />
      </Cell>
      <Cell>{provider.lastTestedAt ?? '—'}</Cell>
      <Cell>
        {provider.connected ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Yes
          </span>
        ) : (
          <span className="text-slate-500">No</span>
        )}
      </Cell>
    </>
  )
}

function TestStatusPill({ status }: { status: TestStatus }) {
  const Icon =
    status === 'passed' ? CheckCircle2 :
    status === 'failed' ? AlertTriangle :
    CircleDashed
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', TEST_TONE[status]].join(' ')}>
      <Icon className="h-3.5 w-3.5" />
      {TEST_LABEL[status]}
    </span>
  )
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return (
    <div className={['min-h-14 bg-slate-950/55 px-3 py-3 text-xs leading-5', strong ? 'font-black text-slate-100' : 'font-semibold text-slate-400'].join(' ')}>
      {children}
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}
