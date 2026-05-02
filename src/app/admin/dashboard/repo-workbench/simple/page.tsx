'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, GitBranch, Loader2, Wand2 } from 'lucide-react'

interface SimpleRunResult {
  success: boolean
  mode: string
  workspace?: {
    id: string
    owner: string
    repo: string
    branch: string
    status: string
    currentCommit?: string
  }
  run?: {
    runId?: string
    patchId?: string | null
    summary?: string
    status?: string
    reportArtifactId?: string | null
    errors?: string[]
  }
  nextSteps?: string[]
  truth?: string
  error?: string
}

export default function SimpleRepoWorkbenchPage() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/amarktainetwork-blip/Amarktai-Network-2')
  const [branch, setBranch] = useState('main')
  const [quality, setQuality] = useState<'cheap' | 'balanced' | 'good' | 'best'>('balanced')
  const [command, setCommand] = useState('')
  const [result, setResult] = useState<SimpleRunResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/repo-workbench/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, command, quality }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? `HTTP ${res.status}`)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Repo Workbench simple run failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/repo-workbench" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Repo Workbench
        </Link>
        <div className="flex items-center gap-2">
          <GitBranch className="h-6 w-6 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Simple Repo Workbench</h1>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          The simplified operator flow: add/select repo, type the command, run, review the patch, then create a PR. No hidden merge or deploy claims.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="text-sm font-semibold text-white">Command</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-xs text-slate-400">Repo URL<input value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="block text-xs text-slate-400">Branch<input value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
            <label className="block text-xs text-slate-400">Quality<select value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"><option value="cheap">Cheap</option><option value="balanced">Balanced</option><option value="good">Good</option><option value="best">Best</option></select></label>
            <label className="block text-xs text-slate-400">What should the AI do?<textarea value={command} onChange={(e) => setCommand(e.target.value)} rows={8} placeholder="Example: Fix the dashboard mobile layout and create a small, safe patch. Do not remove features." className="mt-1 w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
            <button onClick={run} disabled={loading || !repoUrl || !command.trim()} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm font-semibold text-cyan-100 disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Run simple command
            </button>
            {error && <p className="rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{error}</p>}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          {!result ? (
            <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-slate-500">
              Run a command to see workspace, patch and review steps here.
            </div>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-white">Run result</h2>
                <p className="mt-1 text-xs text-slate-500">{result.truth}</p>
              </div>
              {result.workspace && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">Workspace</p><p className="font-mono text-sm text-white">{result.workspace.id}</p></div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">Repo</p><p className="text-sm text-white">{result.workspace.owner}/{result.workspace.repo}</p></div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">Branch</p><p className="text-sm text-white">{result.workspace.branch}</p></div>
                  <div className="rounded-xl border border-white/10 bg-black/20 p-4"><p className="text-xs text-slate-500">Status</p><p className="text-sm text-white">{result.workspace.status}</p></div>
                </div>
              )}
              {result.run && (
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">AI run</p>
                  <div className="mt-3 grid gap-2 text-xs text-slate-400">
                    <p>Run ID: <span className="font-mono text-slate-300">{result.run.runId ?? '—'}</span></p>
                    <p>Patch ID: <span className="font-mono text-cyan-200">{result.run.patchId ?? 'No patch generated'}</span></p>
                    <p>Status: <span className="text-white">{result.run.status ?? '—'}</span></p>
                    {result.run.summary && <p className="whitespace-pre-wrap text-slate-300">{result.run.summary}</p>}
                  </div>
                </div>
              )}
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-semibold text-white">Next steps</p>
                <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-slate-400">
                  {(result.nextSteps ?? []).map((step) => <li key={step}>{step}</li>)}
                </ol>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
