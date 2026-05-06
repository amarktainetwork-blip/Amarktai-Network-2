'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, GitPullRequest, Loader2, Play, ShieldCheck } from 'lucide-react'
import { type CostMode, providerLabel } from '@/lib/approved-ai-catalog'
import type { UniversalModelCatalog, UniversalModelRoute } from '@/lib/universal-model-catalog'

type Repo = { full_name: string; default_branch: string; private?: boolean }
type Branch = { name: string; sha: string; isDefault?: boolean }
type Workspace = { id: string; owner: string; repo: string; branch: string; currentCommit?: string; status?: string }
type ApiResult = Record<string, unknown> & { success?: boolean; error?: string; blocker?: string }
type StepId = 'Planning' | 'Files selected' | 'Patch prepared' | 'Checks running' | 'Commit ready' | 'PR ready' | 'Deploy ready'

const timeline: StepId[] = ['Planning', 'Files selected', 'Patch prepared', 'Checks running', 'Commit ready', 'PR ready', 'Deploy ready']

function asText(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

export default function WorkbenchPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [catalog, setCatalog] = useState<UniversalModelCatalog | null>(null)
  const [repoFullName, setRepoFullName] = useState('')
  const [branch, setBranch] = useState('auto')
  const [modelId, setModelId] = useState('auto')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [prompt, setPrompt] = useState('')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [patchId, setPatchId] = useState('')
  const [prNumber, setPrNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(true)
  const [stepStatus, setStepStatus] = useState<Record<StepId, 'waiting' | 'active' | 'done' | 'needs-approval'>>({
    Planning: 'waiting',
    'Files selected': 'waiting',
    'Patch prepared': 'waiting',
    'Checks running': 'waiting',
    'Commit ready': 'waiting',
    'PR ready': 'waiting',
    'Deploy ready': 'waiting',
  })
  const [log, setLog] = useState<Record<string, string>>({})

  const codingModels = useMemo(() => catalog?.grouped.coding ?? catalog?.models ?? [], [catalog])
  const selectedModel = codingModels.find((model) => model.modelId === modelId)

  const updateStep = (step: StepId, status: 'waiting' | 'active' | 'done' | 'needs-approval') => {
    setStepStatus((current) => ({ ...current, [step]: status }))
  }

  const call = useCallback(async (label: string, url: string, init?: RequestInit): Promise<ApiResult> => {
    setLoading(label)
    setError('')
    try {
      const response = await fetch(url, init)
      const data = await response.json().catch(() => ({}))
      if (!response.ok || data.success === false) throw new Error(data.error ?? data.blocker ?? `${label} failed`)
      return data
    } catch (err) {
      const message = err instanceof Error ? err.message : `${label} failed`
      setError(message)
      throw err
    } finally {
      setLoading('')
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const incomingPrompt = params.get('prompt')
    if (incomingPrompt) setPrompt(incomingPrompt)
    Promise.all([
      call('Load repos', '/api/admin/repo-workbench/github/repos').catch(() => null),
      fetch('/api/admin/ai-model-catalog').then((response) => response.json()).catch(() => null),
    ]).then(([repoData, modelData]) => {
      const nextRepos = Array.isArray(repoData?.repos) ? repoData!.repos as Repo[] : []
      setRepos(nextRepos)
      if (nextRepos[0]) {
        setRepoFullName(nextRepos[0].full_name)
        setBranch('auto')
      }
      setCatalog(modelData?.universal ?? null)
    })
  }, [call])

  async function loadBranches(nextRepo = repoFullName) {
    if (!nextRepo) return
    const data = await call('Load branches', `/api/admin/repo-workbench/github/branches?repo=${encodeURIComponent(nextRepo)}`)
    const nextBranches = Array.isArray(data.branches) ? data.branches as Branch[] : []
    setBranches(nextBranches)
  }

  async function ensureWorkspace() {
    if (workspace) return workspace
    const selectedRepo = repos.find((repo) => repo.full_name === repoFullName)
    const selectedBranch = branch === 'auto' ? selectedRepo?.default_branch ?? 'main' : branch
    const data = await call('Import repo', '/api/admin/repo-workbench/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoFullName, branch: selectedBranch }),
    })
    const nextWorkspace = data.workspace as Workspace
    setWorkspace(nextWorkspace)
    return nextWorkspace
  }

  function payload() {
    return {
      request: prompt,
      modelId: selectedModel?.modelId,
      provider: selectedModel?.provider ?? 'auto',
      costMode,
      taskType: 'auto',
      scope: 'auto',
    }
  }

  async function startWork() {
    if (!prompt.trim() || !repoFullName) return
    updateStep('Planning', 'active')
    const activeWorkspace = await ensureWorkspace()
    const plan = await call('Start work', `/api/admin/repo-workbench/${activeWorkspace.id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    })
    const task = plan.task as { id?: string } | undefined
    setLog((current) => ({ ...current, plan: asText(plan.plan ?? plan.planJson ?? plan.task ?? plan) }))
    updateStep('Planning', 'done')
    updateStep('Files selected', 'done')
    updateStep('Patch prepared', 'active')
    const patch = await call('Prepare patch', `/api/admin/repo-workbench/${activeWorkspace.id}/patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload(), taskId: String(task?.id ?? plan.taskId ?? '') || undefined }),
    })
    const proposed = patch.patch as { id?: string; diffText?: string; filesAffected?: string[] } | undefined
    setPatchId(String(proposed?.id ?? patch.patchId ?? ''))
    setLog((current) => ({
      ...current,
      files: asText(proposed?.filesAffected ?? patch.filesAffected ?? patch.changedFiles ?? []),
      diff: String(proposed?.diffText ?? patch.diffText ?? ''),
    }))
    updateStep('Patch prepared', 'needs-approval')
  }

  async function approveChanges() {
    if (!workspace || !patchId) return
    updateStep('Patch prepared', 'active')
    const applied = await call('Apply approved changes', `/api/admin/repo-workbench/${workspace.id}/apply-patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, confirm: true }),
    })
    setLog((current) => ({ ...current, files: asText(applied.changedFiles ?? applied.files ?? applied) }))
    updateStep('Patch prepared', 'done')
    updateStep('Checks running', 'active')
    const checks = await call('Detect checks', `/api/admin/repo-workbench/${workspace.id}/checks`)
    const commands = Array.isArray(checks.checks) && checks.checks.length ? checks.checks as string[] : ['lint', 'test', 'build']
    const outputs: string[] = []
    for (const command of commands) {
      const result = await call(`Run ${command}`, `/api/admin/repo-workbench/${workspace.id}/run-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      outputs.push(`> ${command}\n${asText(result.output ?? result)}`)
    }
    setLog((current) => ({ ...current, checks: outputs.join('\n\n') }))
    updateStep('Checks running', 'done')
    updateStep('Commit ready', 'active')
    const commit = await call('Commit and prepare push', `/api/admin/repo-workbench/${workspace.id}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, message: prompt.slice(0, 180) || 'Superbrain Workbench update', branchName: `superbrain/${Date.now()}`, confirm: true }),
    })
    const push = await call('Push approved branch', `/api/admin/repo-workbench/${workspace.id}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    })
    setLog((current) => ({ ...current, commit: asText({ commit, push }) }))
    updateStep('Commit ready', 'done')
    updateStep('PR ready', 'needs-approval')
  }

  async function createPr() {
    if (!workspace) return
    updateStep('PR ready', 'active')
    const pr = await call('Create PR', `/api/admin/repo-workbench/${workspace.id}/pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: prompt.slice(0, 90) || 'Superbrain Workbench update', body: `Generated by AmarktAI Superbrain Workbench.\n\nPrompt:\n${prompt}`, confirm: true }),
    })
    const prUrl = String(pr.prUrl ?? '')
    const match = prUrl.match(/\/pull\/(\d+)/)
    setPrNumber(match ? Number(match[1]) : null)
    setLog((current) => ({ ...current, pr: asText(pr.prUrl ?? pr) }))
    updateStep('PR ready', 'done')
    updateStep('Deploy ready', 'needs-approval')
  }

  async function mergePr() {
    if (!workspace || !prNumber) return
    const data = await call('Merge', `/api/admin/repo-workbench/${workspace.id}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prNumber, confirm: true }),
    })
    setLog((current) => ({ ...current, pr: `${current.pr ?? ''}\n\n${asText(data)}` }))
  }

  async function deploy() {
    if (!workspace) return
    const confirmation = `DEPLOY ${workspace.owner}/${workspace.repo}`
    const data = await call('Deploy', `/api/admin/repo-workbench/${workspace.id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation, confirm: true }),
    })
    setLog((current) => ({ ...current, deploy: asText(data.output ?? data) }))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Workbench</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">Autonomous repo workflow.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              Choose a repo, branch, AI route, and prompt. Start work creates the plan and patch; approval runs checks, commits, pushes, and prepares a PR.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-xs font-bold text-cyan-900">
            Token-safe GitHub auth, branch validation, path checks, artifact logs, guarded merge and deploy.
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Repo">
            <select
              value={repoFullName}
              onChange={(event) => {
                setRepoFullName(event.target.value)
                setWorkspace(null)
                loadBranches(event.target.value).catch(() => null)
              }}
              className="input"
            >
              <option value="">Select repo</option>
              {repos.map((repo) => <option key={repo.full_name} value={repo.full_name}>{repo.full_name}</option>)}
            </select>
          </Field>
          <Field label="Branch">
            <select value={branch} onChange={(event) => setBranch(event.target.value)} className="input">
              <option value="auto">Auto work branch</option>
              {branches.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="AI / model">
            <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="input">
              <option value="auto">Auto best agent/model</option>
              {codingModels.map((model: UniversalModelRoute) => <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>{providerLabel(model.provider)} - {model.displayName}</option>)}
            </select>
          </Field>
          <Field label="Cost mode">
            <select value={costMode} onChange={(event) => setCostMode(event.target.value as CostMode)} className="input">
              <option value="cheap">cheap</option>
              <option value="balanced">balanced</option>
              <option value="premium">premium</option>
            </select>
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Prompt">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={6}
              placeholder="Describe the change. The Workbench will audit context, choose the right agent/model, plan, prepare a patch, and wait for approval."
              className="min-h-36 w-full resize-none rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-sm leading-6 text-slate-950 outline-none placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <MainButton onClick={startWork} disabled={!repoFullName || !prompt || Boolean(loading)} label="Start work" loading={loading === 'Start work' || loading === 'Prepare patch'} icon={<Play className="h-4 w-4" />} />
          <MainButton onClick={approveChanges} disabled={!workspace || !patchId || Boolean(loading)} label="Approve changes" loading={loading.startsWith('Run ') || loading.includes('approved') || loading.includes('Commit') || loading.includes('Push')} icon={<ShieldCheck className="h-4 w-4" />} />
          <MainButton onClick={createPr} disabled={!workspace || Boolean(loading)} label="Create PR" loading={loading === 'Create PR'} icon={<GitPullRequest className="h-4 w-4" />} />
        </div>
        {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      </section>

      <section className="rounded-3xl border border-white/70 bg-white/65 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
        <button
          onClick={() => setAdvancedOpen((value) => !value)}
          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black text-slate-950"
        >
          Advanced / Progress Timeline
          <ChevronDown className={['h-4 w-4 transition', advancedOpen ? 'rotate-180' : ''].join(' ')} />
        </button>
        {advancedOpen && (
          <div className="border-t border-white/70 p-5">
            <div className="grid gap-3 lg:grid-cols-7">
              {timeline.map((step) => (
                <div key={step} className="rounded-2xl border border-slate-200 bg-white/75 p-3">
                  <CheckCircle2 className={['h-4 w-4', stepStatus[step] === 'done' ? 'text-emerald-600' : stepStatus[step] === 'active' ? 'text-cyan-700' : stepStatus[step] === 'needs-approval' ? 'text-amber-600' : 'text-slate-300'].join(' ')} />
                  <p className="mt-2 text-xs font-black text-slate-800">{step}</p>
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">{stepStatus[step]}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {Object.entries(log).map(([key, value]) => (
                <div key={key} className="rounded-2xl border border-slate-200 bg-slate-950 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">{key}</p>
                  <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-200">{value}</pre>
                </div>
              ))}
              {Object.keys(log).length === 0 && <p className="text-sm font-semibold text-slate-500">Plan, files, diff, checks, commit, PR, and deploy logs appear here.</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={mergePr} disabled={!workspace || !prNumber || Boolean(loading)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-45">Merge when allowed</button>
              <button onClick={deploy} disabled={!workspace || Boolean(loading)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-45">Deploy when allowed</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</span>
      <span className="mt-2 block [&_.input]:w-full [&_.input]:rounded-2xl [&_.input]:border [&_.input]:border-slate-200 [&_.input]:bg-white/85 [&_.input]:px-3 [&_.input]:py-2.5 [&_.input]:text-sm [&_.input]:font-semibold [&_.input]:text-slate-800 [&_.input]:outline-none [&_.input]:focus:border-cyan-300 [&_.input]:focus:ring-4 [&_.input]:focus:ring-cyan-100">{children}</span>
    </label>
  )
}

function MainButton({ label, onClick, disabled, loading, icon }: { label: string; onClick: () => void; disabled: boolean; loading: boolean; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}
