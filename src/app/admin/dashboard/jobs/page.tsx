import type React from 'react'
import { Database, FileText, Webhook } from 'lucide-react'
import { JOB_LIFECYCLE_STATES } from '@/lib/dashboard-control-room'

export const dynamic = 'force-dynamic'

export default function JobsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Jobs &amp; Artifacts</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Job lifecycle &amp; artifact library</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Track jobs from creation through delivery. Browse artifacts, inspect webhook attempts, and retry failed deliveries.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <InfoCard icon={Database} title="Job States" items={[...JOB_LIFECYCLE_STATES]} />
        <InfoCard icon={FileText} title="Artifact Types" items={['document', 'image', 'video', 'audio', 'music', 'transcript', 'code']} />
        <InfoCard icon={Webhook} title="Webhook Events" items={['job.created', 'job.completed', 'job.failed', 'artifact.persisted', 'webhook.delivered']} />
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Recent Jobs</h2>
        <p className="mt-2 text-sm text-slate-500">
          Job history will appear here as capabilities are executed through Studio or connected apps.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Artifact Library</h2>
        <p className="mt-2 text-sm text-slate-500">
          Persisted artifacts from completed jobs will appear here with download links and metadata.
        </p>
      </section>
    </div>
  )
}

function InfoCard({ icon: Icon, title, items }: { icon: React.ElementType; title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-cyan-400" />
        <h3 className="text-sm font-black text-white">{title}</h3>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-slate-700 bg-slate-950/55 px-2 py-0.5 text-[10px] font-bold text-slate-400">{item}</span>
        ))}
      </div>
    </div>
  )
}
