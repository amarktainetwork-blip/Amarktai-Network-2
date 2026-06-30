import type React from 'react'
import { Activity, Brain, Calendar, Shield } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Agents &amp; Learning</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Controlled agent foundations</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          Agent autonomy is a controlled future foundation. Learning is tenant-private and never shared across apps.
        </p>
      </section>

      <section className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-amber-400" />
          <p className="text-sm font-black text-amber-200">Learning is controlled. Tenant-private data is not shared across apps.</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Activity, title: 'App Agents', desc: 'Goal-driven agents scoped to specific apps with approval gates.', status: 'Future foundation' },
          { icon: Calendar, title: 'Schedules', desc: 'Recurring agent runs with triggers and budget caps.', status: 'Future foundation' },
          { icon: Brain, title: 'Learning Logs', desc: 'Provider performance, creative metrics, and retry patterns.', status: 'Controlled' },
          { icon: Shield, title: 'Rollback', desc: 'Versioned prompts and presets with shadow testing.', status: 'Controlled' },
        ].map((item) => (
          <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
            <item.icon className="h-4 w-4 text-cyan-400" />
            <p className="mt-3 text-sm font-black text-white">{item.title}</p>
            <p className="mt-1 text-[11px] text-slate-500">{item.desc}</p>
            <span className="mt-2 inline-block rounded-full border border-slate-700 bg-slate-950/55 px-2 py-0.5 text-[10px] font-bold text-slate-400">{item.status}</span>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Agent Controls</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {['Agent name', 'App scope', 'Allowed capabilities', 'Goal', 'Schedule', 'Triggers', 'Memory scope', 'Approval mode', 'Budget cap', 'Success metric', 'Evaluation rubric', 'Shadow testing'].map((control) => (
            <div key={control} className="rounded-lg border border-slate-800 bg-slate-950/55 px-3 py-2 text-xs text-slate-400">{control}</div>
          ))}
        </div>
      </section>
    </div>
  )
}
