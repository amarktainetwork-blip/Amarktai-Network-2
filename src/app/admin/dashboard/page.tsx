import type React from 'react'
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { getCapabilityRuntimeTruth } from '@/lib/capability-runtime-truth'
import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'
import { PROVIDER_MODEL_SURFACE } from '@/lib/dashboard-control-room'

export const dynamic = 'force-dynamic'

export default async function CommandCenterPage() {
  const [capabilities, providers] = await Promise.all([
    getCapabilityRuntimeTruth().catch(() => []),
    getProviderRuntimeTruth().catch(() => []),
  ])

  const summary = {
    working: capabilities.filter((c) => c.status === 'working').length,
    needsProof: capabilities.filter((c) => c.status === 'wired_unproven').length,
    blocked: capabilities.filter((c) => c.status === 'blocked').length,
    missing: capabilities.filter((c) => c.status === 'missing').length,
    total: capabilities.length,
  }

  const activeProviders = PROVIDER_MODEL_SURFACE.filter((p) => p.runtimeStatus === 'active_v1')
  const blockers = capabilities.filter((c) => c.blocker && c.status !== 'working')

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Command Center</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">AmarktAI Network</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Central AI capability engine. Platform readiness, active providers, and current blockers at a glance.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Working" value={summary.working} icon={CheckCircle2} color="emerald" />
        <SummaryCard label="Needs Proof" value={summary.needsProof} icon={Clock} color="amber" />
        <SummaryCard label="Blocked" value={summary.blocked} icon={AlertTriangle} color="red" />
        <SummaryCard label="Missing" value={summary.missing} icon={AlertTriangle} color="slate" />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <h2 className="font-black text-white">Active Providers</h2>
          <div className="mt-3 space-y-2">
            {activeProviders.map((provider) => {
              const runtime = providers.find((p) => p.providerId === provider.providerId)
              const connected = runtime?.connected ?? false
              return (
                <div key={provider.providerId} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
                  <div>
                    <p className="text-sm font-black text-slate-200">{provider.displayName}</p>
                    <p className="text-[11px] text-slate-500">{provider.role}</p>
                  </div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${connected ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
                    {connected ? 'Connected' : 'Not connected'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <h2 className="font-black text-white">Current Blockers</h2>
          <div className="mt-3 space-y-2">
            {blockers.length === 0 ? (
              <p className="text-sm text-slate-500">No blockers found.</p>
            ) : (
              blockers.slice(0, 8).map((cap) => (
                <div key={cap.capabilityId} className="rounded-xl border border-red-400/15 bg-red-400/5 px-4 py-3">
                  <p className="text-sm font-bold text-red-200">{cap.label}</p>
                  <p className="text-[11px] text-red-300/70">{cap.blocker}</p>
                  {cap.nextAction && <p className="mt-1 text-[11px] text-slate-400">Next: {cap.nextAction}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Quick Actions</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { label: 'Open Studio', href: '/admin/dashboard/studio' },
            { label: 'View Capabilities', href: '/admin/dashboard/capabilities' },
            { label: 'Provider Settings', href: '/admin/dashboard/settings' },
            { label: 'App Connections', href: '/admin/dashboard/apps' },
          ].map((action) => (
            <a key={action.href} href={action.href} className="rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/15">
              {action.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  const colors: Record<string, string> = {
    emerald: 'border-emerald-400/20 bg-emerald-400/8 text-emerald-300',
    amber: 'border-amber-400/20 bg-amber-400/8 text-amber-300',
    red: 'border-red-400/20 bg-red-400/8 text-red-300',
    slate: 'border-slate-600/30 bg-slate-800/50 text-slate-400',
  }
  return (
    <div className={`rounded-2xl border p-4 ${colors[color] ?? colors.slate}`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-[10px] font-black uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  )
}
