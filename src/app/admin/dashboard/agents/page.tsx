'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Users } from 'lucide-react'
import { EmptyState, PageHeader, SectionCard, StatusBadge } from '@/components/dashboard/ui'

// Adult creator only visible inside Adult Mode page — not listed here
const AGENT_TYPES = [
  { value: 'marketing', label: 'Marketing', description: 'Campaign planning, content strategy, social media' },
  { value: 'customer_service', label: 'Customer Service', description: 'FAQ responses, support drafts, feedback analysis' },
  { value: 'research', label: 'Research', description: 'Web research, content summarization, fact finding' },
  { value: 'automation', label: 'Automation', description: 'Workflow automation, task scheduling, process drafts' },
] as const

type AgentType = typeof AGENT_TYPES[number]['value']

const DEFAULT_CAPABILITIES: Record<AgentType, string[]> = {
  marketing: ['chat', 'image_generation', 'research', 'embeddings'],
  customer_service: ['chat', 'research'],
  research: ['research', 'embeddings', 'chat'],
  automation: ['chat', 'code'],
}

interface AgentStep {
  stepId: string
  capability: string
  success: boolean
  error: string | null
  latencyMs: number | null
  output: string | null
}

interface AgentTaskResult {
  taskId: string
  agentType: string
  status: string
  steps: AgentStep[]
  output: string | null
  error: string | null
  latencyMs: number | null
  metadata: Record<string, unknown>
}

export default function AgentsPage() {
  const [agentType, setAgentType] = useState<AgentType>('research')
  const [task, setTask] = useState('')
  const [context, setContext] = useState('')
  const [urls, setUrls] = useState('')
  const [budget, setBudget] = useState<'cheap' | 'balanced' | 'premium'>('balanced')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AgentTaskResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stepsOpen, setStepsOpen] = useState(true)
  const [history, setHistory] = useState<AgentTaskResult[]>([])

  const selectedAgent = AGENT_TYPES.find(a => a.value === agentType)!

  async function run() {
    if (!task.trim()) { setError('Task description is required'); return }
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const payload: Record<string, unknown> = {
        agentType,
        task: task.trim(),
        context: context.trim() || undefined,
        budget,
        allowedCapabilities: DEFAULT_CAPABILITIES[agentType],
        // urls only for research
        ...(agentType === 'research' && urls.trim() ? { urls: urls.split('\n').map(s => s.trim()).filter(Boolean) } : {}),
        // No provider/model/providerOverride/modelOverride/endpoint fields
      }
      const res = await fetch('/api/admin/agents/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { task?: AgentTaskResult; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Agent run failed')
      const taskResult = data.task ?? { taskId: '', agentType, status: 'completed', steps: [], output: 'No output', error: null, latencyMs: null, metadata: {} }
      setResult(taskResult)
      setHistory(h => [taskResult, ...h.slice(0, 9)])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Agent run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        label="Agents"
        title="Agent Tasks"
        description="Run autonomous agents for marketing, research, customer service, and automation. Runtime selects providers automatically."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <SectionCard title="Run Agent">
          <div className="space-y-4">
            {/* Agent type */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Agent Type</label>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {AGENT_TYPES.map(a => (
                  <button
                    key={a.value}
                    onClick={() => setAgentType(a.value)}
                    className={`rounded-xl border p-3 text-left transition ${agentType === a.value ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-slate-700/40 bg-slate-950/45 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
                  >
                    <p className="text-sm font-black">{a.label}</p>
                    <p className="mt-0.5 text-[11px] opacity-70">{a.description}</p>
                  </button>
                ))}
              </div>
              {/* Adult creator note */}
              <p className="mt-2 text-[10px] text-slate-600">Note: adult_creator agent type is only accessible from the Adult Mode page with explicit gate confirmation.</p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Task Description *</label>
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder={agentType === 'marketing' ? 'Create a 7-day Instagram campaign for a coffee brand targeting millennials…' : agentType === 'research' ? 'Research the latest trends in AI marketing tools…' : 'Describe the task…'}
                rows={4}
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
              />
            </div>

            {agentType === 'research' && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Reference URLs (one per line, optional)</label>
                <textarea
                  value={urls}
                  onChange={e => setUrls(e.target.value)}
                  placeholder="https://example.com"
                  rows={3}
                  className="mt-1.5 w-full resize-none rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Context (optional)</label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="Additional context or constraints…"
                rows={2}
                className="mt-1.5 w-full resize-none rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 placeholder-slate-600 outline-none focus:border-cyan-500/40"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Budget</label>
              <select value={budget} onChange={e => setBudget(e.target.value as typeof budget)} className="mt-1.5 w-full rounded-xl border border-slate-700/60 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-300 outline-none focus:border-cyan-500/40">
                <option value="cheap">Cheap</option>
                <option value="balanced">Balanced</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-1.5">
              <p className="w-full text-[10px] text-slate-600">Capabilities: {DEFAULT_CAPABILITIES[agentType].join(', ')}</p>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
              </div>
            )}

            <button
              onClick={run}
              disabled={running || !task.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-sm font-black text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running {selectedAgent.label} agent…</> : `Run ${selectedAgent.label} Agent`}
            </button>
          </div>
        </SectionCard>

        {/* Result panel */}
        <div className="space-y-4">
          {running && (
            <SectionCard title="Running…">
              <div className="flex items-center gap-3 py-6 justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                <p className="text-sm text-slate-400">{selectedAgent.label} agent is working…</p>
              </div>
            </SectionCard>
          )}

          {result && (
            <>
              <SectionCard title="Result">
                <div className="flex items-center gap-2 mb-3">
                  {result.status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                  <StatusBadge status={result.status === 'completed' ? 'healthy' : result.status === 'failed' ? 'failed' : 'warning'} label={result.status} />
                  {result.latencyMs !== null && <span className="text-xs text-slate-500">{result.latencyMs}ms</span>}
                </div>
                {result.output && (
                  <div className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">{result.output}</p>
                  </div>
                )}
                {result.error && <p className="mt-2 text-xs text-red-300">{result.error}</p>}
              </SectionCard>

              <SectionCard
                title={`Steps (${result.steps.length})`}
                action={<button onClick={() => setStepsOpen(v => !v)}>{stepsOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}</button>}
              >
                {stepsOpen && result.steps.length > 0 && (
                  <div className="space-y-2">
                    {result.steps.map((step, i) => (
                      <div key={step.stepId ?? i} className="rounded-xl border border-slate-700/30 bg-slate-950/30 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-300">{step.capability}</span>
                          <StatusBadge status={step.success ? 'healthy' : 'failed'} label={step.success ? 'ok' : 'failed'} />
                        </div>
                        {step.output && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{step.output}</p>}
                        {step.error && <p className="mt-1 text-xs text-red-400">{step.error}</p>}
                        {step.latencyMs !== null && <p className="mt-0.5 text-[10px] text-slate-600">{step.latencyMs}ms</p>}
                      </div>
                    ))}
                  </div>
                )}
                {(!stepsOpen || result.steps.length === 0) && <p className="text-xs text-slate-500">{result.steps.length === 0 ? 'No step detail available' : 'Click to expand'}</p>}
              </SectionCard>
            </>
          )}

          {!running && !result && (
            <SectionCard>
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title="No task run yet"
                description="Configure an agent type and task, then run it."
              />
            </SectionCard>
          )}

          {history.length > 0 && (
            <SectionCard title={`Recent Tasks (${history.length})`}>
              <div className="space-y-2">
                {history.slice(0, 5).map((h, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/30 p-2.5">
                    <div>
                      <p className="text-xs font-bold text-slate-300">{h.agentType}</p>
                      <p className="text-[10px] text-slate-600">{h.taskId.slice(0, 12) || 'run'}</p>
                    </div>
                    <StatusBadge status={h.status === 'completed' ? 'healthy' : 'failed'} label={h.status} />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  )
}
