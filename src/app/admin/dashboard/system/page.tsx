import type React from 'react'
import { Activity, FileText, HardDrive, Server, ShieldCheck } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getVpsSnapshot } from '@/lib/vps-monitor'

export const dynamic = 'force-dynamic'

type DatabasePing = {
  status: 'working' | 'failed'
  message: string
}

async function pingDatabase(): Promise<DatabasePing> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { status: 'working', message: 'Database connection accepted a read query.' }
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : 'Database connection failed.' }
  }
}

export default async function SystemPage() {
  const [vps, database] = await Promise.all([
    getVpsSnapshot().catch(() => null),
    pingDatabase(),
  ])
  const serviceRows = vps ? Object.entries(vps.services) : []
  const queueCounts = vps?.queue.counts ?? {}

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">System</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">VPS, services, worker, logs, and database diagnostics</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Technical health lives here. Provider keys and tests stay in Settings, while product work stays in Studio.
            </p>
          </div>
          <StatusPill status={vps ? 'snapshot available' : 'snapshot unavailable'} />
        </div>
      </section>

      <nav className="flex flex-wrap gap-2 rounded-lg border border-slate-800 bg-slate-900/55 p-2" aria-label="System sections">
        {['VPS', 'Services', 'Worker', 'Logs', 'Database'].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="rounded-lg px-3 py-2 text-xs font-black text-slate-300 hover:bg-slate-800 hover:text-white">
            {item}
          </a>
        ))}
      </nav>

      <section id="vps" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Server />} label="Host" value={vps?.host.hostname || 'Unknown'} />
        <Metric icon={<HardDrive />} label="Memory used" value={vps ? `${vps.host.memory.usedPercent}%` : 'Unknown'} />
        <Metric icon={<Activity />} label="Uptime" value={vps ? formatDuration(vps.host.uptimeSeconds) : 'Unknown'} />
        <Metric icon={<ShieldCheck />} label="Queue backend" value={vps?.queue.backendAvailable ? 'Configured' : 'Unavailable'} />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel id="services" title="Services">
          {serviceRows.length ? serviceRows.map(([name, value]) => (
            <Row key={name} label={name} value={formatService(value)} />
          )) : (
            <Empty text="Service snapshot is unavailable on this host." />
          )}
        </Panel>

        <Panel id="worker" title="Worker">
          <Row label="Queue health" value={vps?.queue.healthy ? 'Healthy' : 'Needs attention'} />
          <Row label="Queue backend" value={vps?.queue.backendAvailable ? 'Available' : 'Not configured or unreachable'} />
          {Object.keys(queueCounts).length ? Object.entries(queueCounts).map(([name, count]) => (
            <Row key={name} label={name} value={String(count)} />
          )) : (
            <Empty text="No queue counts returned. The worker may be idle, Redis may be unavailable, or no jobs have been queued." />
          )}
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel id="database" title="Database">
          <Row label="Connection" value={database.status === 'working' ? 'Working' : 'Failed'} />
          <Row label="Read query" value={database.message} />
        </Panel>

        <Panel id="logs" title="Logs">
          <div className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-950/55 p-4">
            <FileText className="mt-0.5 h-5 w-5 text-cyan-300" />
            <div>
              <p className="text-sm font-black text-white">Log stream route not wired</p>
              <p className="mt-2 text-xs leading-6 text-slate-500">
                This dashboard can show service logs after a real admin log route is connected. Until then, use VPS service logs directly.
              </p>
            </div>
          </div>
        </Panel>
      </section>
    </div>
  )
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  if (days) return `${days}d ${hours}h`
  return `${hours}h`
}

function formatService(value: unknown) {
  if (!value) return 'Unknown'
  if (typeof value === 'string') return value
  if (typeof value === 'object' && 'available' in value) {
    const service = value as { available: boolean; output?: string }
    return service.available ? (service.output || 'Available').split('\n')[0] : 'Needs attention'
  }
  if (typeof value === 'object' && 'status' in value) {
    return String((value as { status?: unknown }).status ?? 'Unknown')
  }
  return 'Checked'
}

function Metric({ icon, label, value }: { icon: React.ReactElement; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <span className="text-cyan-300 [&_svg]:h-5 [&_svg]:w-5">{icon}</span>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-white">{value}</p>
    </div>
  )
}

function Panel({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-2 text-xs last:border-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className="max-w-[65%] break-words text-right font-bold text-slate-300">{value}</span>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const lower = status.toLowerCase()
  const tone = lower.includes('available')
    ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
    : 'border-amber-300/20 bg-amber-300/10 text-amber-100'
  return <span className={['rounded-full border px-2.5 py-1 text-[11px] font-black', tone].join(' ')}>{status}</span>
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-slate-800 bg-slate-950/55 p-4 text-sm leading-7 text-slate-500">{text}</p>
}
