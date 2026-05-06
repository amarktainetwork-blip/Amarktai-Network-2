import Link from 'next/link'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import { APPROVED_AI_PROVIDERS, APPROVED_WORKBENCH_MODELS } from '@/lib/approved-ai-catalog'

const workflow = [
  'Select repo',
  'Select branch',
  'Choose AI and cost mode',
  'Write prompt',
  'Review plan and patch',
  'Run checks',
  'Create PR',
]

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Overview</p>
            <h1 className="mt-3 text-3xl font-black text-white">Repo Workbench is the core workflow.</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
              Use the dashboard to improve this app and connected apps: pick a repository, choose an approved AI route, request a change, review the plan, apply the patch, run checks, and ship through GitHub.
            </p>
          </div>
          <Link href="/admin/dashboard/workbench" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400">
            Start in Workbench
          </Link>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="Dashboard sections" value={String(DASHBOARD_NAV_ITEMS.length)} />
        <Metric label="Approved AI providers" value={String(APPROVED_AI_PROVIDERS.length)} />
        <Metric label="Workbench models" value={String(APPROVED_WORKBENCH_MODELS.length)} />
        <Metric label="Cost modes" value="3" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-base font-bold text-white">Main workflow</h2>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {workflow.map((step, index) => (
              <div key={step} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">Step {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-base font-bold text-white">Canonical navigation</h2>
          <div className="mt-4 space-y-2">
            {DASHBOARD_NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="block rounded-lg border border-white/10 bg-black/20 p-3 hover:border-cyan-400/30">
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  )
}
