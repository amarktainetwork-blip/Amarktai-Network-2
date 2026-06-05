import { REQUIRED_AGENT_NAMES } from '@/lib/product-contract'
import { OPERATOR_AGENTS } from '@/lib/agent-registry'

const existing = new Map(OPERATOR_AGENTS.map((agent) => [agent.name, agent]))

export default function AgentsPage() {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Agents</p><h1 className="mt-2 text-3xl font-black text-white">Specialists coordinated by the Network Orchestrator.</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Agent cards show contract readiness, not invented activity. Live job progress appears in Command timelines and the event stream.</p></section>
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{REQUIRED_AGENT_NAMES.map((name) => { const agent = existing.get(name); return <article key={name} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><div className="flex items-start justify-between gap-3"><h2 className="font-black text-white">{name}</h2><span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${agent ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/20 bg-amber-400/10 text-amber-300'}`}>{agent ? 'Registered' : 'Contract ready'}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{agent?.purpose || 'Required product agent. Execution contract is defined by the command router and will use GenX first with specialist routes where needed.'}</p><p className="mt-3 text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">Knows product positioning, modules, provider routes, approvals, artifacts, and runtime proof rules.</p></article> })}</section>
    </div>
  )
}
