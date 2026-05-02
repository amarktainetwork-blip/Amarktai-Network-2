'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bot, ShieldCheck } from 'lucide-react'

interface AivaAction {
  id: string
  label: string
  category: string
  risk: string
  defaultAllowed: boolean
  requiresConfirmation: boolean
  requiresAdmin: boolean
  description: string
}

export default function AivaActionsPage() {
  const [actions, setActions] = useState<AivaAction[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/admin/aiva/actions')
      .then((res) => res.json())
      .then((data) => {
        if (data.success === false) throw new Error(data.error ?? 'Failed to load Aiva actions')
        setActions(data.actions ?? [])
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load Aiva actions'))
  }, [])

  const grouped = actions.reduce<Record<string, AivaAction[]>>((acc, action) => {
    acc[action.category] ??= []
    acc[action.category].push(action)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/ai-engine" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> AI Engine</Link>
        <div className="flex items-center gap-2"><Bot className="h-6 w-6 text-cyan-300" /><h1 className="text-2xl font-bold text-white">Aiva Action Permissions</h1></div>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">Aiva can read and propose freely, but writes, spend, deploys, PRs, marketing sends, adult-mode changes and destructive actions require explicit confirmation.</p>
      </div>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        {Object.entries(grouped).map(([category, items]) => (
          <section key={category} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="mb-3 text-sm font-bold capitalize text-white">{category}</h2>
            <div className="space-y-2">
              {items.map((action) => (
                <div key={action.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{action.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{action.description}</p>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">{action.risk}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    <Pill ok={action.defaultAllowed} label={action.defaultAllowed ? 'Default allowed' : 'Manual only'} />
                    <Pill ok={!action.requiresConfirmation} label={action.requiresConfirmation ? 'Confirmation required' : 'No confirmation'} />
                    <Pill ok={action.requiresAdmin} label={action.requiresAdmin ? 'Admin only' : 'User allowed'} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${ok ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/20 bg-amber-400/10 text-amber-100'}`}><ShieldCheck className="h-3 w-3" />{label}</span>
}
