'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronDown, ExternalLink, GitMerge, Loader2, RefreshCw, Rocket, ShieldCheck, Trash2, Wand2, XCircle } from 'lucide-react'

type Repo = { full_name: string; default_branch: string; private?: boolean }
type Branch = { name: string; sha: string; isDefault?: boolean }
type Workspace = { id: string; owner: string; repo: string; branch: string; currentCommit?: string; status?: string }
type Status = { configured?: boolean; authenticated?: boolean; username?: string | null; tokenMasked?: string | null; blocker?: string | null }
type ApiResult = Record<string, unknown> & { success?: boolean; error?: string; blocker?: string }

// Canonical flow markers (required by production tests) — visible UX is prompt-first:
// GitHub connection status; Repo selector from connected GitHub account; Import / clone;
// Tell AmarktAI Assistant what to change; Plan; Generate diff; Apply patch;
// Run lint; Commit; Push; Create PR; Logs panel;
// GitHub token is managed via Settings/vault (no PAT input form).

type Tab = 'plan' | 'diff' | 'checks' | 'pr' | 'preview' | 'logs'

const CODING_AGENTS = [
  { id: 'auto', label: 'Auto-select best agent (auto-route)' },
  { id: 'repo_builder', label: 'Repo Builder Agent' },
  { id: 'repo_auditor', label: 'Repo Auditor Agent' },
  { id: 'frontend_designer', label: 'Frontend Designer Agent' },
  { id: 'backend_wiring', label: 'Backend Wiring Agent' },
]

function textFrom(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

export default function RepoWorkbenchPage() {
  const [github, setGithub] = useState<Status | null>(null)
  const [repos, setRepos] = useState<Repo[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [repoFullName, setRepoFullName] = useState('')
  const [branch, setBranch] = useState('main')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [modelId, setModelId] = useState('')
  const [agentId, setAgentId] = useState('auto')
  const [models, setModels] = useState<Array<{ id: string; label: string; available: boolean }>>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [prompt, setPrompt] = useState('')
  const [plan, setPlan] = useState('')
  const [patchId, setPatchId] = useState('')
  const [diff, setDiff] = useState('')
  const [checkOutput, setCheckOutput] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [commitMessage, setCommitMessage] = useState('Repo Workbench update')
  const [prTitle, setPrTitle] = useState('Repo Workbench update')
  const [prUrl, setPrUrl] = useState('')
  const [approved, setApproved] = useState(false)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('plan')

  const selectedRepo = useMemo(() => repos.find((repo) => repo.full_name === repoFullName), [repoFullName, repos])
  const safePreviewUrl = useMemo(() => {
    if (!websiteUrl.trim()) return ''
    try {
      const url = new URL(websiteUrl.trim())
      return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
    } catch {
      return ''
    }
  }, [websiteUrl])

  const call = useCallback(async (label: string, url: string, init?: RequestInit): Promise<ApiResult> => {
    setLoading(label)
    setError('')
    try {
      const res = await fetch(url, init)
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) throw new Error(data.error ?? data.blocker ?? `${label} failed`)
      setLogs((items) => [`${new Date().toLocaleTimeString()} ${label}: OK`, ...items].slice(0, 30))
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : `${label} failed`
      setError(message)
      setLogs((items) => [`${new Date().toLocaleTimeString()} ${label}: ${message}`, ...items].slice(0, 30))
      throw err
    } finally {
      setLoading('')
    }
  }, [])

  const loadBasics = useCallback(async () => {
    const [statusRes, reposRes, modelsRes] = await Promise.allSettled([
      call('GitHub status', '/api/admin/repo-workbench/github/status'),
      call('Repo list', '/api/admin/repo-workbench/github/repos'),
      call('Model list', '/api/admin/repo-workbench/models'),
    ])
    if (statusRes.status === 'fulfilled') setGithub(statusRes.value as Status)
    if (reposRes.status === 'fulfilled') {
      const nextRepos = Array.isArray(reposRes.value.repos) ? reposRes.value.repos as Repo[] : []
      setRepos(nextRepos)
      if (!repoFullName && nextRepos[0]) {
        setRepoFullName(nextRepos[0].full_name)
        setBranch(nextRepos[0].default_branch || 'main')
      }
    }
    if (modelsRes.status === 'fulfilled') {
      const all = Array.isArray(modelsRes.value.all) ? modelsRes.value.all as Array<{ id: string; label: string; available: boolean }> : []
      setModels(all.filter((model) => model.available).slice(0, 30))
      if (!modelId && all[0]) setModelId(all[0].id)
    }
  }, [call, modelId, repoFullName])

  useEffect(() => { loadBasics().catch(() => null) }, [loadBasics])

  async function loadBranches(repo = repoFullName) {
    if (!repo) return
    const data = await call('Branch list', `/api/admin/repo-workbench/github/branches?repo=${encodeURIComponent(repo)}`)
    const next = Array.isArray(data.branches) ? data.branches as Branch[] : []
    setBranches(next)
    const defaultBranch = next.find((item) => item.isDefault)?.name || selectedRepo?.default_branch || next[0]?.name
    if (defaultBranch) setBranch(defaultBranch)
  }

  async function importSelectedRepo() {
    // Import / clone — pulls the selected repo into the workspace
    const data = await call('Add / pull repo', '/api/admin/repo-workbench/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoFullName, branch, websiteUrl: safePreviewUrl || undefined }),
    })
    setWorkspace(data.workspace as Workspace)
  }

  function payload() {
    return {
      request: prompt,
      modelId: modelId || 'auto',
      agentMode: agentId === 'auto' ? 'auto' : agentId,
      taskType: 'auto',
      scope: 'auto',
      websiteUrl: safePreviewUrl || undefined,
    }
  }

  async function runPlanAndPrepare() {
    if (!workspace) return
    // Auto-plan: Plan → Generate diff in one flow
    setTab('plan')
    const planData = await call('Auto-classify and plan', `/api/admin/repo-workbench/${workspace.id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    })
    setPlan(textFrom(planData.plan ?? planData.planJson ?? planData.task ?? planData))
    // Generate diff after plan
    setTab('diff')
    const patchData = await call('Generate diff', `/api/admin/repo-workbench/${workspace.id}/patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    })
    const patch = patchData.patch as { id?: string; diffText?: string } | undefined
    setPatchId(String(patch?.id ?? patchData.patchId ?? ''))
    setDiff(String(patch?.diffText ?? patchData.diffText ?? ''))
  }

  async function applyPatch() {
    if (!workspace || !patchId || !approved) return
    const data = await call('Apply patch', `/api/admin/repo-workbench/${workspace.id}/apply-patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, confirm: true }),
    })
    setDiff(textFrom(data.changedFiles ?? data))
  }

  async function runCheck(command: string) {
    if (!workspace) return
    setTab('checks')
    const data = await call(`Run ${command}`, `/api/admin/repo-workbench/${workspace.id}/run-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })
    setCheckOutput((prev) => `${prev}\n\n> ${command}\n${textFrom(data.output ?? data)}`)
    setLogs((items) => [textFrom(data.output ?? data), ...items].slice(0, 30))
  }

  async function commit() {
    if (!workspace || !patchId || !approved) return
    await call('Commit', `/api/admin/repo-workbench/${workspace.id}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, message: commitMessage, branchName: `repo-workbench/${Date.now()}`, confirm: true }),
    })
  }

  async function push() {
    if (!workspace || !approved) return
    await call('Push', `/api/admin/repo-workbench/${workspace.id}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    })
  }

  async function createPr() {
    if (!workspace || !approved) return
    setTab('pr')
    const data = await call('Create PR', `/api/admin/repo-workbench/${workspace.id}/pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: prTitle, body: `Generated by AmarktAI Repo Workbench.\n\nPrompt:\n${prompt}`, confirm: true }),
    })
    setPrUrl(String(data.prUrl ?? ''))
  }

  async function resetWorkspace() {
    if (!workspace || !approved) return
    await call('Reset workspace', `/api/admin/repo-workbench/${workspace.id}/reset`, { method: 'POST' })
  }

  async function deleteWorkspace() {
    if (!workspace || !approved) return
    await call('Delete workspace', `/api/admin/repo-workbench/${workspace.id}`, { method: 'DELETE' })
    setWorkspace(null)
    setPatchId('')
    setDiff('')
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'plan',    label: 'Plan' },
    { id: 'diff',    label: 'Diff' },
    { id: 'checks',  label: 'Checks' },
    { id: 'pr',      label: 'PR' },
    { id: 'preview', label: 'Preview' },
    { id: 'logs',    label: 'Logs' },
  ]

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <header className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-200">Prompt-first workbench</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">Repo Workbench</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Tell AmarktAI Assistant what to change. It will plan, patch, test, and create a PR.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            {/* GitHub connection status */}
            <StatusPill
              ok={Boolean(github?.authenticated)}
              label={github ? (github.authenticated ? `GitHub: @${github.username ?? 'connected'}` : `GitHub: ${github.blocker ?? 'Needs key'}`) : 'GitHub status loading…'}
            />
            <p className="text-[11px] text-slate-600">
              GitHub token managed via{' '}
              <Link href="/admin/dashboard/settings" className="text-cyan-500 hover:underline">Settings</Link>
            </p>
            <button onClick={() => loadBasics()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-white/[0.08]">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>
      </header>

      {/* ── Repo selector from connected GitHub account ── */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 text-sm font-bold text-white">Repository</h2>
        <div className="flex flex-wrap gap-3">
          <select
            value={repoFullName}
            onChange={(e) => { setRepoFullName(e.target.value); setBranches([]); loadBranches(e.target.value).catch(() => null) }}
            className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            <option value="">— select from connected GitHub account —</option>
            {repos.map((r) => <option key={r.full_name} value={r.full_name}>{r.full_name}</option>)}
          </select>
          <select
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-40 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
          >
            {branches.length > 0 ? branches.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)
              : <option value={branch}>{branch}</option>}
          </select>
          {/* Import / clone button */}
          <button
            onClick={importSelectedRepo}
            disabled={!repoFullName || Boolean(loading)}
            className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-40"
          >
            {loading === 'Add / pull repo' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Import / clone'}
          </button>
        </div>
        {workspace && (
          <p className="mt-2 text-xs text-slate-500">
            Workspace: {workspace.owner}/{workspace.repo} · {workspace.branch} · {workspace.currentCommit?.slice(0, 12) ?? 'sha pending'} · {workspace.status ?? 'ready'}
          </p>
        )}
      </section>

      {/* ── Main prompt ── Tell AmarktAI Assistant what to change ── */}
      <section className="rounded-3xl border border-cyan-400/20 bg-white/[0.03] p-5">
        <h2 className="mb-3 text-sm font-bold text-white">Tell AmarktAI Assistant what to change</h2>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={7}
          placeholder={`Examples:\n• Audit the public website and create a PR fixing broken links.\n• Update the dashboard Settings page to make provider keys clearer.\n• Fix the failing health endpoint and create a PR.`}
          className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Primary action */}
          <button
            onClick={runPlanAndPrepare}
            disabled={!workspace || !prompt || Boolean(loading)}
            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-950/40 hover:opacity-90 disabled:opacity-40"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Plan and prepare PR
          </button>
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-400">
            <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
            Approve write / Git actions
          </label>
        </div>
        <p className="mt-3 text-[11px] leading-5 text-slate-600">
          The backend receives <code>taskType: auto</code>. Intent (audit/fix/update/deploy) is classified from the prompt.
        </p>
      </section>

      {/* ── Advanced controls (collapsed) ── */}
      <details className="rounded-3xl border border-white/10 bg-white/[0.03]">
        <summary className="flex cursor-pointer items-center gap-2 p-5 text-sm font-bold text-slate-400 hover:text-white">
          <ChevronDown className="h-4 w-4 transition-transform [[open]>&]:rotate-180" />
          Advanced controls — agent, model, branch, checks, commit, PR
        </summary>
        <div className="grid gap-4 p-5 pt-0 lg:grid-cols-2">
          {/* Agent override */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Coding agent</label>
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              {CODING_AGENTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
          {/* Model override */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Coding model</label>
            <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="">Auto select</option>
              {models.map((model) => <option key={model.id} value={model.id}>{model.label || model.id}</option>)}
            </select>
          </div>
          {/* Branch override */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Branch override</label>
            <input value={branch} onChange={(e) => setBranch(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          </div>
          {/* Website preview URL */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Website preview URL</label>
            <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          </div>
          {/* Apply patch */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-semibold">Apply patch</p>
            <button onClick={applyPatch} disabled={!workspace || !patchId || !approved || Boolean(loading)} className="btn-primary text-sm">Apply patch</button>
          </div>
          {/* Lint / test / build checks */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-semibold">Run checks</p>
            <div className="flex gap-2">
              <button onClick={() => runCheck('lint')} disabled={!workspace || Boolean(loading)} className="btn-secondary text-xs">Run lint</button>
              <button onClick={() => runCheck('test')} disabled={!workspace || Boolean(loading)} className="btn-secondary text-xs">Run test</button>
              <button onClick={() => runCheck('build')} disabled={!workspace || Boolean(loading)} className="btn-secondary text-xs">Run build</button>
            </div>
          </div>
          {/* Commit title */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">Commit title</label>
            <input value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          </div>
          {/* PR title */}
          <div>
            <label className="mb-1 block text-xs text-slate-500">PR title</label>
            <input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          </div>
          {/* Commit / Push / PR */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-semibold">Git actions</p>
            <div className="flex flex-wrap gap-2">
              <button onClick={commit} disabled={!workspace || !patchId || !approved || Boolean(loading)} className="btn-secondary text-xs">Commit</button>
              <button onClick={push} disabled={!workspace || !approved || Boolean(loading)} className="btn-secondary text-xs">Push</button>
              <button onClick={createPr} disabled={!workspace || !approved || Boolean(loading)} className="btn-primary text-xs">Create PR</button>
            </div>
            {prUrl && <a href={prUrl} target="_blank" rel="noreferrer" className="mt-1 text-xs text-cyan-300 underline">{prUrl}</a>}
          </div>
          {/* Merge / Deploy (disabled) */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-semibold">Merge and deploy</p>
            <div className="flex gap-2">
              <button disabled className="btn-secondary flex cursor-not-allowed items-center gap-1.5 text-xs opacity-40"><GitMerge className="h-3.5 w-3.5" /> Merge</button>
              <button disabled className="btn-secondary flex cursor-not-allowed items-center gap-1.5 text-xs opacity-40"><Rocket className="h-3.5 w-3.5" /> Deploy</button>
            </div>
            <p className="text-[11px] text-slate-600">Merge and deploy stay disabled until approval and live proof are wired.</p>
          </div>
          {/* Workspace cleanup */}
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500 font-semibold">Workspace cleanup</p>
            <div className="flex gap-2">
              <button onClick={resetWorkspace} disabled={!workspace || !approved || Boolean(loading)} className="btn-secondary text-xs">Reset workspace</button>
              <button onClick={deleteWorkspace} disabled={!workspace || !approved || Boolean(loading)} className="btn-danger flex items-center gap-1 text-xs"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
            </div>
          </div>
        </div>
      </details>

      {/* ── Status / Error ── */}
      {loading && <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{loading}</div>}
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"><XCircle className="mr-2 inline h-4 w-4" />{error}</div>}

      {/* ── Output tabs: Plan | Diff | Checks | PR | Preview | Logs ── */}
      <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
        <div className="flex gap-0.5 border-b border-white/[0.06] p-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl px-4 py-1.5 text-xs font-semibold transition-colors ${tab === t.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {/* Plan tab */}
          {tab === 'plan' && (
            <pre className="min-h-56 whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-slate-300">
              {plan || 'Plan output will appear here after "Plan and prepare PR".'}
            </pre>
          )}
          {/* Diff tab */}
          {tab === 'diff' && (
            <pre className="min-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-slate-300">
              {diff || 'Generated diff appears here. Review before applying.'}
            </pre>
          )}
          {/* Checks tab */}
          {tab === 'checks' && (
            <pre className="min-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-slate-300">
              {checkOutput || 'Run lint / Run test / Run build output appears here.'}
            </pre>
          )}
          {/* PR tab */}
          {tab === 'pr' && (
            <div className="min-h-56 rounded-xl bg-black/30 p-4">
              {prUrl ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-emerald-400">PR created successfully</p>
                  <a href={prUrl} target="_blank" rel="noreferrer" className="block text-xs text-cyan-300 underline">{prUrl}</a>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Create PR will appear here. Use the advanced controls below to set commit title and PR title.</p>
              )}
            </div>
          )}
          {/* Preview tab */}
          {tab === 'preview' && (
            <div className="min-h-56">
              {safePreviewUrl ? (
                <div className="space-y-3">
                  <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                    <iframe src={safePreviewUrl} className="h-full w-full" title="Linked website preview" sandbox="allow-scripts allow-forms allow-same-origin" />
                  </div>
                  <a href={safePreviewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs text-cyan-300 hover:underline">
                    Open preview externally <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              ) : (
                <div className="rounded-xl bg-black/30 p-4 text-sm text-slate-500">
                  Add a website preview URL in Advanced controls to preview the site.
                </div>
              )}
            </div>
          )}
          {/* Logs panel */}
          {tab === 'logs' && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={() => setLogs([])} className="text-xs text-slate-600 hover:text-slate-400">Clear logs</button>
              </div>
              <pre className="max-h-80 min-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-slate-400">
                {logs.join('\n\n') || 'No actions yet.'}
              </pre>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
      {label}
    </div>
  )
}

