'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, GitBranch, Loader2, Wand2 } from 'lucide-react'

interface SimpleRunResult {
  success: boolean
  workspace?: { id: string; owner: string; repo: string; branch: string; status: string; currentCommit?: string }
  run?: { patchId?: string; reportArtifactId?: string; status?: string; summary?: string; error?: string }
  nextSteps?: string[]
  truth?: string
  error?: string
}

export default function RepoWorkbenchSimplePage() {
  const [repoUrl, setRepoUrl] = useState('https://github.com/amarktainetwork-blip/Amarktai-Network-2')
  const [branch, setBranch] = useState('main')
  const [quality, setQuality] = useState<'best' | 'good' | 'balanced' | 'cheap'>('balanced')
  const [command, setCommand] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SimpleRunResult | null>(null)
  const [error, setError] = useState('')

  async function run() {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/admin/repo-workbench/simple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, branch, quality, command }),
      })
      const data = await res.json()
      if (!res.ok || data.success === false) throw new Error(data.error ?? 'Simple Repo Workbench failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simple Repo Workbench failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-[#0d1a2e] to-[#060d1b] p-6">
        <Link href="/admin/dashboard/repo-workbench" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> Repo Workbench</Link>
        <div className="flex items-center gap-2"><GitBranch className="h-6 w-6 text-cyan-300" /><h1 className="text-2xl font-bold text-white">Simple Repo Workbench</h1></div>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">The simple flow: add/select repo, type one command, generate a patch, review, then create PR. No auto-merge and no hidden deploys.</p>
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
          <Field label="Repo URL" value={repoUrl} onChange={setRepoUrl} />
          <Field label="Branch" value={branch} onChange={setBranch} />
          <label className="space-y-1 text-xs text-slate-500">Quality
            <select value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none">
              <option value="cheap">Cheap</option>
              <option value="balanced">Balanced</option>
              <option value="good">Good</option>
              <option value="best">Best</option>
            </select>
          </label>
        </div>
        <label className="mt-4 block space-y-1 text-xs text-slate-500">Command
          <textarea value={command} onChange={(e) => setCommand(e.target.value)} rows={8} placeholder="Tell the repo agent what to do…" className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600" />
        </label>
        <div className="mt-4 flex justify-end">
          <button onClick={run} disabled={loading || !repoUrl.trim() || !command.trim()} className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 disabled:opacity-40">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Run command
          </button>
        </div>
      </section>

      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      {result && (
        <section className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-lg font-bold text-white">Result</h2>
            {result.workspace && <p className="mt-2 text-sm text-slate-400">Workspace: {result.workspace.owner}/{result.workspace.repo} · {result.workspace.branch} · {result.workspace.status}</p>}
            {result.run?.patchId && <p className="mt-2 text-sm text-cyan-200">Patch generated: {result.run.patchId}</p>}
            {result.run?.reportArtifactId && <p className="mt-2 text-sm text-slate-400">Report artifact: {result.run.reportArtifactId}</p>}
            {result.truth && <p className="mt-3 text-xs text-slate-500">{result.truth}</p>}
          </div>
          {result.nextSteps && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><h3 className="mb-3 text-sm font-bold text-white">Next steps</h3><ol className="list-decimal space-y-1 pl-5 text-sm text-slate-400">{result.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol></div>}
        </section>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs text-slate-500">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none" /></label>
}
