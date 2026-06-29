import type React from 'react'
import { Clock, CheckSquare, GitBranch, Layers } from 'lucide-react'
import { getQueueStatus } from '@/lib/job-queue'

export const dynamic = 'force-dynamic'

export default async function AutomationPage() {
  const queue = await getQueueStatus().catch(() => ({ healthy: false, backendAvailable: false, counts: {} }))

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div>
          <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Automation</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Automation, Scheduler &amp; Approvals</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
            Honest status of automated workflows, scheduled jobs, approvals, and the job queue worker.
            Nothing is marked active or working without proof.
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard
          icon={<Clock />}
          label="Scheduler"
          value="Needs proof"
          tone="warn"
          detail="No scheduler job has been proven. Status will update after a successful scheduled run."
        />
        <StatusCard
          icon={<CheckSquare />}
          label="Approvals"
          value="Not configured"
          tone="neutral"
          detail="Approval workflows require a configured approval queue and at least one approval rule."
        />
        <StatusCard
          icon={<GitBranch />}
          label="Social publishing"
          value="Not configured"
          tone="neutral"
          detail="No social platform credentials are wired. Configure provider keys to enable publishing."
        />
        <StatusCard
          icon={<Layers />}
          label="Trading execution"
          value="Not configured"
          tone="neutral"
          detail="Trading execution is disabled. No exchange API keys are present in the mesh."
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Scheduler">
          <Row label="Status" value="Needs proof" valueClass="text-amber-300" />
          <Row label="Last run" value="Never recorded" />
          <Row label="Next run" value="Unknown" />
          <Row label="Next action" value="Run a scheduled job successfully to prove scheduler is operational." />
        </Panel>

        <Panel title="Approvals">
          <Row label="Status" value="Not configured" valueClass="text-slate-400" />
          <Row label="Pending approvals" value="0" />
          <Row label="Approval rules" value="None configured" />
          <Row label="Next action" value="Define approval rules in settings to enable workflow approvals." />
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Job flow status">
          <Row label="Queue backend" value={queue.backendAvailable ? 'Available' : 'Not configured or unreachable'} valueClass={queue.backendAvailable ? 'text-emerald-300' : 'text-red-300'} />
          <Row label="Queue health" value={queue.healthy ? 'Healthy' : 'Needs attention'} valueClass={queue.healthy ? 'text-emerald-300' : 'text-amber-300'} />
          {Object.keys(queue.counts).length > 0 ? (
            Object.entries(queue.counts).map(([name, count]) => (
              <Row key={name} label={name} value={String(count)} />
            ))
          ) : (
            <Row label="Job counts" value="No counts returned — queue may be idle or Redis unavailable." />
          )}
        </Panel>

        <Panel title="Worker / Queue">
          <Row label="Status" value={queue.healthy ? 'Healthy' : 'Needs attention'} valueClass={queue.healthy ? 'text-emerald-300' : 'text-amber-300'} />
          <Row label="Backend" value={queue.backendAvailable ? 'Redis / BullMQ available' : 'Backend unavailable'} />
          <Row label="Social publishing" value="Not configured" />
          <Row label="Next action for social" value="Wire social provider credentials and configure publishing queue." />
          <Row label="Trading execution" value="Not configured" />
          <Row label="Next action for trading" value="Wire exchange API keys to enable automated trading execution." />
        </Panel>
      </div>
    </div>
  )
}

function StatusCard({ icon, label, value, tone, detail }: {
  icon: React.ReactElement
  label: string
  value: string
  tone: 'good' | 'warn' | 'bad' | 'neutral'
  detail: string
}) {
  const valueClass =
    tone === 'good' ? 'text-emerald-300' :
    tone === 'warn' ? 'text-amber-300' :
    tone === 'bad' ? 'text-red-300' :
    'text-slate-400'
  const iconClass = tone === 'neutral' ? 'text-slate-500' : 'text-cyan-300'
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <span className={['[&_svg]:h-5 [&_svg]:w-5', iconClass].join(' ')}>{icon}</span>
      <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={['mt-1 text-xl font-black', valueClass].join(' ')}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <h2 className="text-lg font-black text-white">{title}</h2>
      <div className="mt-4 space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-2 text-xs last:border-0">
      <span className="font-bold text-slate-500">{label}</span>
      <span className={['max-w-[65%] break-words text-right font-bold', valueClass ?? 'text-slate-300'].join(' ')}>{value}</span>
    </div>
  )
}
