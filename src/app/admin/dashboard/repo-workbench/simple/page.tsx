'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, GitBranch, Loader2, LockKeyhole, ShieldCheck, Wand2 } from 'lucide-react'

interface SimpleRunResult {
  success: boolean
  workspace?: { id: string; owner: string; repo: string; branch: string; status: string; currentCommit?: string }
  run?: { patchId?: string; reportArtifactId?: string; status?: string; summary?: string; error?: string }
  nextSteps?: string[]
  truth?: string
  error?: string
}

const examples = [
  'Audit the dashboard UX and create a safe patch for the worst layout issues.',
  'Improve the public homepage copy without changing backend logic.',
  'Find duplicated Aiva code paths and propose a cleanup patch.',
]

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
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#071426] via-[#050b17] to-[#140a22] p-6 shadow-2xl shadow-black/20 lg:p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative z-10">
          <Link href="/admin/dashboard/repo-workbench" className="mb-4 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-cyan-300"><ArrowLeft className="h-3.5 w-3.5" /> Repo Workbench</Link>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold text-cyan-100">
                <GitBranch className="h-3.5 w-3.5" /> Simple prompt-to-PR mode
              </div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl">Give the repo one clear command.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400">Aiva’s coding workspace should stay simple: choose a repo, describe the change, review the generated patch/report, then create a PR only after approval. No hidden deploys. No auto-merge.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
              <ShieldCheck className="mb-2 h-5 w-5" /> Review-gated by design
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.75fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="mb-5 grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <Field label="1. Repo URL" value={repoUrl} onChange={setRepoUrl} />
            <Field label="Branch" value={branch} onChange={setBranch} />
            <label className="space-y-1 text-xs text-slate-500">Quality
              <select value={quality} onChange={(e) => setQuality(e.target.value as typeof quality)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40">
                <option value="cheap">Cheap</option>
                <option value="balanced">Balanced</option>
                <option value="good">Good</option>
                <option value="best">Best</option>
              </select>
            </label>
          </div>
          <label className="block space-y-2 text-xs text-slate-500">2. Command
            <textarea value={command} onChange={(e) => setCommand(e.target.value)} rows={9} placeholder="Tell the repo agent exactly what to do. Keep it focused and reviewable…" className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          </label>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500"><LockKeyhole className="mr-1 inline h-3.5 w-3.5" /> PR creation, deploys and destructive actions still require explicit approval.</p>
            <button onClick={run} disabled={loading || !repoUrl.trim() || !command.trim()} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-400/20 disabled:opacity-40">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Run command
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-bold text-white">Good commands</h2>
            <div className="mt-3 space-y-2">
              {examples.map((example) => (
                <button key={example} onClick={() => setCommand(example)} className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left text-xs leading-5 text-slate-400 hover:border-cyan-400/30 hover:text-cyan-100">{example}</button>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-bold text-white">Workflow</h2>
            <ol className="mt-3 space-y-2 text-sm text-slate-400">
              {['Generate workspace/report', 'Review patch and proof', 'Create PR only after approval', 'Merge in GitHub', 'Redeploy when ready'].map((step, index) => (
                <li key={step} className="flex gap-2"><span className="text-cyan-300">{index + 1}.</span>{step}</li>
              ))}
            </ol>
          </div>
        </aside>
      </section>

      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}

      {result && (
        <section className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white"><CheckCircle2 className="h-5 w-5 text-emerald-300" /> Result</h2>
            {result.workspace && <p className="mt-3 text-sm text-slate-400">Workspace: <span className="text-white">{result.workspace.owner}/{result.workspace.repo}</span> · {result.workspace.branch} · {result.workspace.status}</p>}
            {result.run?.summary && <p className="mt-3 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-slate-300">{result.run.summary}</p>}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.run?.patchId && <Info label="Patch" value={result.run.patchId} />}
              {result.run?.reportArtifactId && <Info label="Report artifact" value={result.run.reportArtifactId} />}
              {result.run?.status && <Info label="Status" value={result.run.status} />}
              {result.truth && <Info label="Truth" value={result.truth} />}
            </div>
          </div>
          {result.nextSteps && <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h3 className="mb-3 text-sm font-bold text-white">3. Review next steps</h3><ol className="list-decimal space-y-2 pl-5 text-sm text-slate-400">{result.nextSteps.map((step) => <li key={step}>{step}</li>)}</ol></div>}
        </section>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1 text-xs text-slate-500">{label}<input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-cyan-400/40" /></label>
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-black/20 p-3"><p className="text-[10px] uppercase tracking-[0.14em] text-slate-600">{label}</p><p className="mt-1 break-all text-sm font-semibold text-white">{value}</p></div>
}
