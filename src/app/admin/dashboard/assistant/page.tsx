'use client'

import { useState } from 'react'
import { APPROVED_ASSISTANT_MODELS, providerLabel } from '@/lib/approved-ai-catalog'

export default function AssistantPage() {
  const [modelId, setModelId] = useState(APPROVED_ASSISTANT_MODELS[0]?.id ?? '')
  const [message, setMessage] = useState('')

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Assistant</p>
        <h1 className="mt-3 text-3xl font-black text-white">AmarktAI Assistant</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Ask about the current dashboard, Workbench flow, provider settings, costs, checks, and PR status. The Assistant uses approved model routes only.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Model route</label>
          <select
            value={modelId}
            onChange={(event) => setModelId(event.target.value)}
            className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {APPROVED_ASSISTANT_MODELS.map((model) => (
              <option key={`${model.provider}:${model.id}`} value={model.id}>
                {providerLabel(model.provider)} - {model.label}
              </option>
            ))}
          </select>
          <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-slate-400">
            Context includes the active dashboard section, selected repo, selected branch, model route, cost mode, current plan, diff, checks, PR, and deploy log when available.
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Message</label>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={8}
            placeholder="Ask for help reviewing a Workbench plan, choosing a cost mode, or preparing a PR summary."
            className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600"
          />
          <button className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-400">
            Ask AmarktAI Assistant
          </button>
        </div>
      </section>
    </div>
  )
}
