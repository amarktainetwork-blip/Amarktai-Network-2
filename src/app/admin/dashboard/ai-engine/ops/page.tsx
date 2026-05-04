import Link from 'next/link'
import { ArrowLeft, Bot, Boxes, GitBranch, ImageIcon, LineChart, ShieldCheck, Wand2 } from 'lucide-react'

const OPS = [
  {
    title: 'Provider Intelligence',
    href: '/admin/dashboard/ai-engine/intelligence',
    description: 'See provider success, failure, latency and routing recommendations.',
    icon: LineChart,
  },
  {
    title: 'Artifact Gallery',
    href: '/admin/dashboard/ai-engine/artifacts',
    description: 'Browse generated media and specialist provider task artifacts.',
    icon: ImageIcon,
  },
  {
    title: 'App AI Setup',
    href: '/admin/dashboard/ai-engine/app-setup',
    description: 'Recommend, save and reload per-app AI packages.',
    icon: Boxes,
  },
  {
    title: 'AI Actions',
    href: '/admin/dashboard/ai-engine/aiva-actions',
    description: 'Review what AmarktAI Assistant can read, propose and execute only after confirmation.',
    icon: Bot,
  },
  {
    title: 'Repo Workbench',
    href: '/admin/dashboard/repo-workbench',
    description: 'Repo URL + command → AI patch proposal and review steps.',
    icon: GitBranch,
  },
]

const READINESS = [
  'AmarktAI Assistant streams through smart routing by default.',
  'Providers have capability and stream tests.',
  'Generated media/task results are saved as artifacts.',
  'Provider scores are calculated from real result logs.',
  'App AI packages can be saved and reloaded.',
  'AmarktAI Assistant control is permission-gated before execution.',
]

export default function AiOpsCommandCenterPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/ai-engine" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> AI Engine</Link>
        <div className="flex items-center gap-2">
          <Wand2 className="h-6 w-6 text-cyan-300" />
          <h1 className="text-2xl font-bold text-white">AI Ops Command Center</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          AI operations surfaces for provider intelligence, artifact management, app AI packages, actions and repo management.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {OPS.map((item) => (
          <Link key={item.href} href={item.href} className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-400/30 hover:bg-cyan-400/[0.04]">
            <item.icon className="h-6 w-6 text-cyan-300" />
            <h2 className="mt-4 text-base font-bold text-white group-hover:text-cyan-100">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-500">{item.description}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.03] p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-300" />
          <h2 className="text-sm font-bold text-white">Platform status</h2>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {READINESS.map((item) => (
            <div key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-300">{item}</div>
          ))}
        </div>
      </section>
    </div>
  )
}
