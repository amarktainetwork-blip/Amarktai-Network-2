'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Blocks, ClipboardList } from 'lucide-react'

const DRAFT_KEY = 'amarktai-app-plan-draft'

export default function AppBuilderPage() {
  const [idea, setIdea] = useState('')
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(DRAFT_KEY) ?? ''
    setIdea(saved)
    setStarted(Boolean(saved))
  }, [])

  function updateIdea(value: string) {
    setIdea(value)
    window.localStorage.setItem(DRAFT_KEY, value)
  }

  function startNewPlan() {
    setIdea('')
    setStarted(true)
    window.localStorage.removeItem(DRAFT_KEY)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6 lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">App Builder</p>
        <h1 className="mt-2 text-3xl font-black text-white">Turn an idea into an approved build plan.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">Clarify the problem, users, constraints, data, and success criteria. This workspace saves a planning draft only; it does not create fake apps, agents, or integrations.</p>
        <button onClick={startNewPlan} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-300">
          <Blocks className="h-4 w-4" />
          Start a new app plan
        </button>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-400" htmlFor="app-plan-idea">Planning brief</label>
          <textarea
            id="app-plan-idea"
            value={idea}
            onChange={(event) => updateIdea(event.target.value)}
            rows={14}
            placeholder="Describe the app idea, intended users, core workflow, constraints, and what success looks like."
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-sm leading-7 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-400/60"
          />
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{idea.trim() ? 'Draft saved in this browser.' : started ? 'New plan ready for input.' : 'No app plan started yet.'}</p>
            <Link href={`/admin/dashboard/workspace${idea.trim() ? `?prompt=${encodeURIComponent(`Help me clarify and plan this standalone app idea without creating or integrating an app yet:\n\n${idea}`)}` : ''}`} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-black text-cyan-200 hover:bg-cyan-400/15">
              Debate and clarify
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5">
          <ClipboardList className="h-6 w-6 text-cyan-300" />
          <h2 className="mt-4 font-black text-white">Honest planning state</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">A plan becomes build work only after it is reviewed and sent to Repo Workbench. Future app registry and handoff contracts remain intentionally unwired in this release.</p>
        </aside>
      </section>
    </div>
  )
}
