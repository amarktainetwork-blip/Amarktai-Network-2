'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, GitMerge, Loader2, RefreshCw, Rocket, ShieldCheck, Trash2, Wand2, XCircle } from 'lucide-react'

type Repo = { full_name: string; default_branch: string; private?: boolean }
type Branch = { name: string; sha: string; isDefault?: boolean }
type Workspace = { id: string; owner: string; repo: string; branch: string; currentCommit?: string; status?: string }
type Status = { configured?: boolean; authenticated?: boolean; username?: string | null; tokenMasked?: string | null; blocker?: string | null }

// Coding agents available for repo tasks
const CODING_AGENTS = [
  { id: 'aiva_operator',        label: 'Aiva Operator (auto-route)' },
  { id: 'repo_builder',         label: 'Repo Builder Agent' },
  { id: 'repo_auditor',         label: 'Repo Auditor Agent' },
  { id: 'frontend_designer',    label: 'Frontend Designer Agent' },
  { id: 'backend_wiring',       label: 'Backend Wiring Agent' },
]

// Task type options for the selected coding agent
const TASK_TYPES = [
  { id: 'audit',         label: 'Audit' },
  { id: 'fix',           label: 'Fix' },
  { id: 'update',        label: 'Update' },
  { id: 'add',           label: 'Add' },
  { id: 'redesign',      label: 'Redesign' },
  { id: 'wire_backend',  label: 'Wire Backend' },
  { id: 'deploy',        label: 'Deploy' },
]
type ApiResult = Record<string, unknown> & { success?: boolean; error?: string; blocker?: string }

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
  const [modelId, setModelId] = useState('')
  const [agentId, setAgentId] = useState('aiva_operator')
  const [taskType, setTaskType] = useState('update')
  const [models, setModels] = useState<Array<{ id: string; label: string; available: boolean }>>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [prompt, setPrompt] = useState('')
  const [plan, setPlan] = useState('')
  const [patchId, setPatchId] = useState('')
  const [diff, setDiff] = useState('')
  const [logs, setLogs] = useState<string[]>([])
  const [commitMessage, setCommitMessage] = useState('Repo Workbench update')
  const [prTitle, setPrTitle] = useState('Repo Workbench update')
  const [prUrl, setPrUrl] = useState('')
  const [approved, setApproved] = useState(false)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  const selectedRepo = useMemo(() => repos.find((repo) => repo.full_name === repoFullName), [repoFullName, repos])

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
    const data = await call('Import repo', '/api/admin/repo-workbench/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoFullName, branch }),
    })
    setWorkspace(data.workspace as Workspace)
  }

  async function runPlan() {
    if (!workspace) return
    const data = await call('Plan', `/api/admin/repo-workbench/${workspace.id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: prompt, modelId, agentMode: agentId, taskType, scope: 'auto' }),
    })
    setPlan(textFrom(data.plan ?? data.planJson ?? data.task ?? data))
  }

  async function runPatch() {
    if (!workspace) return
    const data = await call('Generate patch', `/api/admin/repo-workbench/${workspace.id}/patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request: prompt, modelId, agentMode: agentId, taskType }),
    })
    const patch = data.patch as { id?: string; diffText?: string } | undefined
    setPatchId(String(patch?.id ?? data.patchId ?? ''))
    setDiff(String(patch?.diffText ?? data.diffText ?? ''))
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
    const data = await call(`Run ${command}`, `/api/admin/repo-workbench/${workspace.id}/run-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    })
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
    const data = await call('Create PR', `/api/admin/repo-workbench/${workspace.id}/pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: prTitle, body: `Generated by Amarktai Repo Workbench.\n\nPrompt:\n${prompt}`, confirm: true }),
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

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-black text-white">Repo Workbench</h1>
        <button onClick={() => loadBasics()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mt-1 text-sm text-slate-400">Choose agent and task type → import → plan → diff → checks → commit → PR → merge (approval-gated) → deploy (approval-gated).</p>
          </div>
          <StatusPill ok={Boolean(github?.configured && github.authenticated)} label={github?.authenticated ? `GitHub connected: ${github.username ?? 'token valid'}` : github?.blocker || 'GitHub connection required'} />
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="space-y-4">
          <Panel title="1. GitHub connection status">
            <p className="text-sm text-slate-300">Saved token: {github?.tokenMasked || 'not detected'}</p>
            <p className="mt-1 text-xs text-slate-500">
              {github?.blocker
                ? github.blocker
                : <>Token managed automatically via vault. To change it, go to <Link href="/admin/dashboard/settings" className="text-cyan-400 hover:underline">Settings → GitHub</Link>.</>}
            </p>
          </Panel>

          <Panel title="2. Repo selector from connected GitHub account">
            <select value={repoFullName} onChange={(e) => { setRepoFullName(e.target.value); const repo = repos.find((item) => item.full_name === e.target.value); setBranch(repo?.default_branch || 'main') }} className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              <option value="">Select repo</option>
              {repos.map((repo) => <option key={repo.full_name} value={repo.full_name}>{repo.full_name}{repo.private ? ' (private)' : ''}</option>)}
            </select>
            <div className="mt-3 flex gap-2">
              <button onClick={() => loadBranches()} disabled={!repoFullName || Boolean(loading)} className="btn-secondary">Load branches</button>
              <button onClick={importSelectedRepo} disabled={!repoFullName || !branch || Boolean(loading)} className="btn-primary">Import / clone</button>
            </div>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className="mt-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
              <option value={branch}>{branch}</option>
              {branches.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </Panel>

          <Panel title="3. Choose agent, model, and task type">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Coding agent</label>
                <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                  {CODING_AGENTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Task type</label>
                <select value={taskType} onChange={(e) => setTaskType(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                  {TASK_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Coding model</label>
                <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white">
                  <option value="">Auto select</option>
                  {models.map((model) => <option key={model.id} value={model.id}>{model.label || model.id}</option>)}
                </select>
              </div>
            </div>
          </Panel>
        </div>

        <Panel title="4. Tell Aiva what to change">
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={7} placeholder="Describe one focused repo change. Aiva will plan first, then generate a patch for approval." className="w-full resize-none rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40" />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={runPlan} disabled={!workspace || !prompt || Boolean(loading)} className="btn-secondary"><Wand2 className="h-4 w-4" /> Plan</button>
            <button onClick={runPatch} disabled={!workspace || !prompt || Boolean(loading)} className="btn-primary">Generate diff</button>
            <label className="ml-auto inline-flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} /> I approve write/Git actions</label>
          </div>
        </Panel>
      </section>

      {workspace && <Panel title="Selected repo status">
        <p className="text-sm text-slate-300">{workspace.owner}/{workspace.repo} · {workspace.branch} · {workspace.currentCommit?.slice(0, 12) || 'sha pending'} · {workspace.status || 'ready'}</p>
      </Panel>}

      <section className="grid gap-4 lg:grid-cols-2">
        <Panel title="Plan output / audit and safety output"><pre className="min-h-36 whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-slate-300">{plan || 'Plan output will appear here.'}</pre></Panel>
        <Panel title="Patch preview / diff"><pre className="min-h-36 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-slate-300">{diff || 'Generated diff appears here before apply.'}</pre></Panel>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <Panel title="5. Apply patch and checks">
          <button onClick={applyPatch} disabled={!workspace || !patchId || !approved || Boolean(loading)} className="btn-primary">Apply patch</button>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => runCheck('lint')} disabled={!workspace || Boolean(loading)} className="btn-secondary">Run lint</button>
            <button onClick={() => runCheck('test')} disabled={!workspace || Boolean(loading)} className="btn-secondary">Run test</button>
            <button onClick={() => runCheck('build')} disabled={!workspace || Boolean(loading)} className="btn-secondary">Run build</button>
          </div>
        </Panel>
        <Panel title="6. Commit / push / PR / merge / deploy">
          <input value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} className="mb-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          <input value={prTitle} onChange={(e) => setPrTitle(e.target.value)} className="mb-3 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white" />
          <div className="flex flex-wrap gap-2">
            <button onClick={commit} disabled={!workspace || !patchId || !approved || Boolean(loading)} className="btn-secondary">Commit</button>
            <button onClick={push} disabled={!workspace || !approved || Boolean(loading)} className="btn-secondary">Push</button>
            <button onClick={createPr} disabled={!workspace || !approved || Boolean(loading)} className="btn-primary">Create PR</button>
          </div>
          {prUrl && <a href={prUrl} target="_blank" rel="noreferrer" className="mt-3 block text-xs text-cyan-300 underline">{prUrl}</a>}
          {/* Merge and Deploy — approval-gated. Disabled until PR exists and proof is verified. */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled
              title="Merge requires: PR created, checks passing, and admin approval"
              className="btn-secondary flex items-center gap-1.5 opacity-40 cursor-not-allowed"
            >
              <GitMerge className="h-3.5 w-3.5" />
              Merge (approval-gated)
            </button>
            <button
              disabled
              title="Deploy requires: merge completed, deploy path configured, and admin approval"
              className="btn-secondary flex items-center gap-1.5 opacity-40 cursor-not-allowed"
            >
              <Rocket className="h-3.5 w-3.5" />
              Deploy (approval-gated)
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">Merge and Deploy are shown but remain disabled until PR is created, checks pass, and an explicit admin approval is recorded.</p>
        </Panel>
        <Panel title="7. Workspace hygiene">
          <p className="mb-3 text-xs text-slate-500">Reset/delete require the approval checkbox.</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={resetWorkspace} disabled={!workspace || !approved || Boolean(loading)} className="btn-secondary">Reset workspace</button>
            <button onClick={deleteWorkspace} disabled={!workspace || !approved || Boolean(loading)} className="btn-danger"><Trash2 className="h-4 w-4" /> Delete workspace</button>
            <button onClick={() => setLogs([])} className="btn-secondary">Clear logs</button>
          </div>
        </Panel>
      </section>

      {loading && <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-sm text-cyan-100"><Loader2 className="mr-2 inline h-4 w-4 animate-spin" />{loading}</div>}
      {error && <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200"><XCircle className="mr-2 inline h-4 w-4" />{error}</div>}
      <Panel title="Logs panel">
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-black/30 p-3 text-xs text-slate-400">{logs.join('\n\n') || 'No actions yet.'}</pre>
      </Panel>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><h2 className="mb-3 text-sm font-bold text-white">{title}</h2>{children}</section>
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${ok ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100' : 'border-amber-400/30 bg-amber-400/10 text-amber-100'}`}>{ok ? <CheckCircle2 className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}{label}</div>
}
