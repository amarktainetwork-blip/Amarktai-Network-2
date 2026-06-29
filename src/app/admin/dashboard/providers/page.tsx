import type React from 'react'
import { CheckCircle2, CircleDashed, AlertTriangle, CircleSlash, Plug } from 'lucide-react'
import { getProviderRuntimeTruth } from '@/lib/provider-runtime-truth'

export const dynamic = 'force-dynamic'

type UiStatus = 'Connected' | 'Needs proof' | 'Blocked' | 'No key'

function deriveStatus(p: Awaited<ReturnType<typeof getProviderRuntimeTruth>>[number]): UiStatus {
  if (p.connected) return 'Connected'
  if (!p.hasKey) return 'No key'
  if (p.blocker) return 'Blocked'
  return 'Needs proof'
}

const STATUS_TONE: Record<UiStatus, string> = {
  Connected: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  'Needs proof': 'border-amber-300/20 bg-amber-300/10 text-amber-100',
  Blocked: 'border-red-300/20 bg-red-300/10 text-red-100',
  'No key': 'border-slate-600/50 bg-slate-800/80 text-slate-300',
}

export default async function ProvidersPage() {
  const providers = await getProviderRuntimeTruth()

  const summary = {
    connected: providers.filter((p) => p.connected).length,
    needsProof: providers.filter((p) => !p.connected && p.hasKey && !p.blocker).length,
    blocked: providers.filter((p) => !!p.blocker).length,
    noKey: providers.filter((p) => !p.hasKey).length,
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Providers</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Providers &amp; Models</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Every provider in the mesh is listed here with its honest runtime status.
              Connected = has a key AND has passed a live test. Status pills reflect live truth, not configuration intent.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <Summary label="Connected" value={summary.connected} />
            <Summary label="Needs proof" value={summary.needsProof} />
            <Summary label="Blocked" value={summary.blocked} />
            <Summary label="No key" value={summary.noKey} />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-[1.4fr_1.2fr_0.6fr_0.7fr_0.9fr_0.9fr_0.7fr_1.2fr] gap-px bg-slate-800/70 text-xs">
          {['Provider ID', 'Display name', 'Has key', 'Key source', 'Endpoint', 'Last test', 'Connected', 'Blocker'].map((h) => (
            <div key={h} className="bg-slate-950/80 px-3 py-2 font-black uppercase tracking-[0.12em] text-slate-500">
              {h}
            </div>
          ))}
          {providers.map((p) => (
            <ProviderRow key={p.providerId} provider={p} />
          ))}
        </div>
      </section>
    </div>
  )
}

function ProviderRow({ provider: p }: { provider: Awaited<ReturnType<typeof getProviderRuntimeTruth>>[number] }) {
  const uiStatus = deriveStatus(p)
  return (
    <>
      <Cell strong icon={<Plug />}>
        <span className="font-mono">{p.providerId}</span>
      </Cell>
      <Cell>{p.displayName}</Cell>
      <Cell>
        {p.hasKey ? (
          <span className="text-emerald-300">Yes</span>
        ) : (
          <span className="text-slate-500">No</span>
        )}
      </Cell>
      <Cell>{p.keySource}</Cell>
      <Cell>
        <EndpointPill status={p.endpointStatus} />
      </Cell>
      <Cell>
        <StatusPill status={uiStatus} />
      </Cell>
      <Cell>
        {p.connected ? (
          <span className="inline-flex items-center gap-1 text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Yes
          </span>
        ) : (
          <span className="text-slate-500">No</span>
        )}
      </Cell>
      <Cell>{p.blocker || '—'}</Cell>
    </>
  )
}

function StatusPill({ status }: { status: UiStatus }) {
  const Icon =
    status === 'Connected' ? CheckCircle2 :
    status === 'Needs proof' ? CircleDashed :
    status === 'Blocked' ? AlertTriangle :
    CircleSlash
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', STATUS_TONE[status]].join(' ')}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  )
}

function EndpointPill({ status }: { status: string }) {
  const tone =
    status === 'ok' ? 'text-emerald-300' :
    status === 'not_required' ? 'text-slate-400' :
    status === 'failed' ? 'text-red-300' :
    'text-amber-300'
  return <span className={['font-black', tone].join(' ')}>{status}</span>
}

function Cell({ children, strong = false, icon }: { children: React.ReactNode; strong?: boolean; icon?: React.ReactElement }) {
  return (
    <div className={['min-h-14 bg-slate-950/55 px-3 py-3 text-xs leading-5', strong ? 'font-black text-slate-100' : 'font-semibold text-slate-400'].join(' ')}>
      <span className="flex items-start gap-2">
        {icon && <span className="mt-0.5 text-cyan-300 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
        <span>{children}</span>
      </span>
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
