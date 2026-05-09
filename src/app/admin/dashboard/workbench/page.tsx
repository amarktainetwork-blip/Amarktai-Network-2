'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, GitPullRequest, Loader2, Play, ShieldCheck } from 'lucide-react'
import { type CostMode, providerLabel } from '@/lib/approved-ai-catalog'
import type { UniversalModelCatalog, UniversalModelRoute } from '@/lib/universal-model-catalog'

type Repo = { full_name: string; default_branch: string; private?: boolean }
type Branch = { name: string; sha: string; isDefault?: boolean }
type Workspace = { id: string; owner: string; repo: string; branch: string; currentCommit?: string; status?: string }
type ApiResult = Record<string, unknown> & { success?: boolean; error?: string; blocker?: string }
type PersistedWorkbenchJob = {
  id: string
  workspaceId: string
  workspace?: Workspace
  userRequest?: string
  plan?: unknown
  changedFiles?: unknown
  patch?: { id: string; diffText?: string; status?: string; branchName?: string; commitSha?: string | null; prUrl?: string | null }
  logs?: string
  status?: string
}
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
  const [currentJobId, setCurrentJobId] = useState('')
  const [patchId, setPatchId] = useState('')
  const [prNumber, setPrNumber] = useState<number | null>(null)
  const [checksPassed, setChecksPassed] = useState(false)
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
  const executionModel = modelIdForExecution(selectedModel?.modelId ?? modelId)
  const nextAction = getNextAction(stepStatus, Boolean(repoFullName), Boolean(prompt), Boolean(patchId), checksPassed, Boolean(prNumber))

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

  const loadBranches = useCallback(async (nextRepo: string) => {
    if (!nextRepo) return
    const data = await call('Load branches', `/api/admin/repo-workbench/github/branches?repo=${encodeURIComponent(nextRepo)}`)
    const nextBranches = Array.isArray(data.branches) ? data.branches as Branch[] : []
    setBranches(nextBranches)
  }, [call])

  const rehydrateJob = useCallback((job: PersistedWorkbenchJob | null | undefined) => {
    if (!job?.workspace) return
    const fullName = `${job.workspace.owner}/${job.workspace.repo}`
    setCurrentJobId(job.id)
    setWorkspace(job.workspace)
    setRepoFullName(fullName)
    setBranch(job.workspace.branch || 'auto')
    setPrompt(job.userRequest ?? '')
    setPatchId(job.patch?.id ?? '')
    setChecksPassed(Boolean(job.logs))
    const prUrl = job.patch?.prUrl ?? ''
    const match = prUrl.match(/\/pull\/(\d+)/)
    setPrNumber(match ? Number(match[1]) : null)
    setLog({
      plan: asText(job.plan ?? {}),
      files: asText(job.changedFiles ?? []),
      diff: String(job.patch?.diffText ?? ''),
      checks: job.logs ? String(job.logs) : '',
      commit: job.patch?.commitSha ? asText({ branch: job.patch.branchName, commitSha: job.patch.commitSha }) : '',
      pr: prUrl,
    })
    setStepStatus(statusForPersistedJob(job))
    loadBranches(fullName).catch(() => null)
  }, [loadBranches])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const incomingPrompt = params.get('prompt')
    if (incomingPrompt) setPrompt(incomingPrompt)
    Promise.all([
      call('Load repos', '/api/admin/repo-workbench/github/repos').catch(() => null),
      fetch('/api/admin/ai-model-catalog').then((response) => response.json()).catch(() => null),
      incomingPrompt ? Promise.resolve(null) : fetch('/api/admin/repo-workbench/jobs/latest').then((response) => response.json()).catch(() => null),
    ]).then(([repoData, modelData, latestData]) => {
      const nextRepos = Array.isArray(repoData?.repos) ? repoData!.repos as Repo[] : []
      setRepos(nextRepos)
      if (latestData?.job) {
        rehydrateJob(latestData.job as PersistedWorkbenchJob)
      } else if (nextRepos[0]) {
        setRepoFullName(nextRepos[0].full_name)
        setBranch('auto')
        loadBranches(nextRepos[0].full_name).catch(() => null)
      }
      setCatalog(modelData?.universal ?? null)
    })
  }, [call, loadBranches, rehydrateJob])

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
      modelId: executionModel,
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
    setCurrentJobId(String(task?.id ?? plan.taskId ?? ''))
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
    updateStep('Checks running', 'needs-approval')
  }

  async function runChecks() {
    if (!workspace) return
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
    setChecksPassed(true)
    updateStep('Checks running', 'done')
    updateStep('Commit ready', 'needs-approval')
  }

  async function commitAndPush() {
    if (!workspace || !patchId || !checksPassed) return
    updateStep('Commit ready', 'active')
    const commit = await call('Commit and prepare push', `/api/admin/repo-workbench/${workspace.id}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, message: prompt.slice(0, 180) || 'AmarktAI Workbench update', branchName: `amarktai/${Date.now()}`, confirm: true }),
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
      body: JSON.stringify({ title: prompt.slice(0, 90) || 'AmarktAI Workbench update', body: `Generated by AmarktAI Workbench.\n\nPrompt:\n${prompt}`, confirm: true }),
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

  async function retryFailedStep() {
    if (!error) return
    if (stepStatus['Planning'] === 'active' || !patchId) return startWork()
    if (stepStatus['Patch prepared'] === 'active' || stepStatus['Patch prepared'] === 'needs-approval') return approveChanges()
    if (stepStatus['Checks running'] === 'active' || stepStatus['Checks running'] === 'needs-approval') return runChecks()
    if (stepStatus['Commit ready'] === 'active' || stepStatus['Commit ready'] === 'needs-approval') return commitAndPush()
    if (stepStatus['PR ready'] === 'active' || stepStatus['PR ready'] === 'needs-approval') return createPr()
  }

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-sky-500/10 via-cyan-500/6 to-transparent blur-3xl" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Workbench</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Autonomous repo workflow.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Prompt → Plan → Patch → Checks → Commit → PR → Deploy. The Workbench orchestrates each step with approval gates.
            </p>
          </div>
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 text-xs font-semibold text-cyan-400/80">
            Token-safe · branch-validated · artifact-logged · guarded merge
            {currentJobId && <span className="mt-1 block text-cyan-500/60">Resumed: {currentJobId}</span>}
          </div>
        </div>
      </section>

      {/* Prompt + controls */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WbField label="Repo">
            <select
              value={repoFullName}
              onChange={(event) => {
                setRepoFullName(event.target.value)
                setWorkspace(null)
                loadBranches(event.target.value).catch(() => null)
              }}
              className="wb-select"
            >
              <option value="">Select repo</option>
              {repos.map((repo) => <option key={repo.full_name} value={repo.full_name}>{repo.full_name}</option>)}
            </select>
          </WbField>
          <WbField label="Branch">
            <select value={branch} onChange={(event) => setBranch(event.target.value)} className="wb-select">
              <option value="auto">Auto work branch</option>
              {branches.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </WbField>
          <WbField label="AI / model">
            <select value={modelId} onChange={(event) => setModelId(event.target.value)} className="wb-select">
              <option value="auto">Auto best model</option>
              {codingModels.map((model: UniversalModelRoute) => <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>{providerLabel(model.provider)} – {model.displayName}</option>)}
            </select>
          </WbField>
          <WbField label="Cost mode">
            <select value={costMode} onChange={(event) => setCostMode(event.target.value as CostMode)} className="wb-select">
              <option value="cheap">cheap</option>
              <option value="balanced">balanced</option>
              <option value="premium">premium</option>
            </select>
          </WbField>
        </div>

        <div className="mt-4">
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={5}
              placeholder="Describe the change. The Workbench will audit context, choose the right agent/model, plan, prepare a patch, and wait for your approval."
              className="mt-1.5 min-h-32 w-full resize-none rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2.5">
          <WbButton onClick={startWork} disabled={!repoFullName || !prompt || Boolean(loading)} loading={loading === 'Start work' || loading === 'Prepare patch'} label="Start work" icon={<Play className="h-3.5 w-3.5" />} primary />
          <WbButton onClick={approveChanges} disabled={!workspace || !patchId || Boolean(loading)} loading={loading.includes('approved')} label="Approve changes" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
          <WbButton onClick={runChecks} disabled={!workspace || stepStatus['Checks running'] === 'waiting' || Boolean(loading)} loading={loading.startsWith('Run ') || loading === 'Detect checks'} label="Run checks" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
          <WbButton onClick={commitAndPush} disabled={!workspace || !patchId || !checksPassed || Boolean(loading)} loading={loading.includes('Commit') || loading.includes('Push')} label="Commit and push" icon={<GitPullRequest className="h-3.5 w-3.5" />} />
          <WbButton onClick={createPr} disabled={!workspace || Boolean(loading)} loading={loading === 'Create PR'} label="Create PR" icon={<GitPullRequest className="h-3.5 w-3.5" />} />
        </div>
        <div className="mt-4 rounded-xl border border-slate-700/40 bg-slate-950/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400/70">Next action</p>
          <p className="mt-1 text-sm font-bold text-slate-300">{nextAction}</p>
          <p className="mt-1 text-xs font-semibold text-slate-600">Model route: {selectedModel ? `${providerLabel(selectedModel.provider)} / ${executionModel || 'auto resolved'}` : 'Auto best model'}</p>
        </div>
        {log.pr && (
          <a href={log.pr} className="mt-3 inline-block rounded-xl border border-cyan-500/20 bg-cyan-500/8 px-3 py-2 text-xs font-black text-cyan-300 hover:bg-cyan-500/15">
            Open PR URL
          </a>
        )}
        {error && (
          <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/8 p-3">
            <p className="text-sm font-semibold text-red-400">{error}</p>
            <button onClick={retryFailedStep} disabled={Boolean(loading)} className="mt-2 rounded-lg border border-red-400/30 px-2.5 py-1 text-xs font-black text-red-200 disabled:opacity-40">Retry failed step</button>
          </div>
        )}
      </section>

      {/* Timeline + logs */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black text-slate-300"
        >
          Progress timeline & logs
          <ChevronDown className={['h-4 w-4 text-slate-500 transition-transform', advancedOpen ? 'rotate-180' : ''].join(' ')} />
        </button>
        {advancedOpen && (
          <div className="border-t border-slate-800/60 p-5">
            {/* Step pills */}
            <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
              {timeline.map((step) => {
                const st = stepStatus[step]
                return (
                  <div key={step} className={[
                    'rounded-xl border p-2.5',
                    st === 'done' ? 'border-emerald-500/20 bg-emerald-500/8' :
                    st === 'active' ? 'border-cyan-500/25 bg-cyan-500/8' :
                    st === 'needs-approval' ? 'border-amber-500/20 bg-amber-500/8' :
                    'border-slate-700/40 bg-slate-800/30',
                  ].join(' ')}>
                    <CheckCircle2 className={[
                      'h-3.5 w-3.5',
                      st === 'done' ? 'text-emerald-400' :
                      st === 'active' ? 'text-cyan-400' :
                      st === 'needs-approval' ? 'text-amber-400' :
                      'text-slate-700',
                    ].join(' ')} />
                    <p className="mt-1.5 text-[10px] font-black text-slate-300">{step}</p>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-600">{st}</p>
                  </div>
                )
              })}
            </div>

            {/* Log panels */}
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {Object.entries(log).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-slate-700/40 bg-slate-950/80 p-3.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-400/70">{key}</p>
                  <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-400">{value}</pre>
                </div>
              ))}
              {Object.keys(log).length === 0 && (
                <p className="text-sm font-semibold text-slate-500">Plan, diff, checks, commit, PR, and deploy logs appear here after steps complete.</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={mergePr} disabled={!workspace || !prNumber || Boolean(loading)} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40">Merge when allowed</button>
              <button onClick={deploy} disabled={!workspace || Boolean(loading)} className="rounded-full border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-bold text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-40">Deploy when allowed</button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function WbField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="mt-1.5 block [&_.wb-select]:w-full [&_.wb-select]:rounded-xl [&_.wb-select]:border [&_.wb-select]:border-slate-700/50 [&_.wb-select]:bg-slate-800/60 [&_.wb-select]:px-3 [&_.wb-select]:py-2 [&_.wb-select]:text-sm [&_.wb-select]:font-semibold [&_.wb-select]:text-slate-300 [&_.wb-select]:outline-none [&_.wb-select]:focus:border-cyan-500/50">{children}</span>
    </label>
  )
}

function WbButton({ label, onClick, disabled, loading, icon, primary = false }: { label: string; onClick: () => void; disabled: boolean; loading: boolean; icon?: React.ReactNode; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-40',
        primary
          ? 'bg-cyan-500 text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:bg-cyan-400 disabled:shadow-none'
          : 'border border-slate-700/50 bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-slate-100',
      ].join(' ')}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  )
}

function statusForPersistedJob(job: PersistedWorkbenchJob): Record<StepId, 'waiting' | 'active' | 'done' | 'needs-approval'> {
  const base: Record<StepId, 'waiting' | 'active' | 'done' | 'needs-approval'> = {
    Planning: job.plan ? 'done' : 'waiting',
    'Files selected': Array.isArray(job.changedFiles) && job.changedFiles.length ? 'done' : job.plan ? 'done' : 'waiting',
    'Patch prepared': job.patch ? 'needs-approval' : 'waiting',
    'Checks running': job.logs ? 'done' : 'waiting',
    'Commit ready': job.patch?.commitSha ? 'done' : 'waiting',
    'PR ready': job.patch?.prUrl ? 'done' : job.patch?.commitSha ? 'needs-approval' : 'waiting',
    'Deploy ready': job.patch?.prUrl ? 'needs-approval' : 'waiting',
  }
  if (job.patch?.status === 'applied') base['Checks running'] = 'needs-approval'
  if (job.patch?.status === 'committed') base['PR ready'] = 'needs-approval'
  if (job.patch?.status === 'pr_created') base['Deploy ready'] = 'needs-approval'
  return base
}

function modelIdForExecution(value: string | undefined) {
  if (!value || value === 'auto' || value.startsWith('auto:')) return undefined
  return value
}

function getNextAction(
  steps: Record<StepId, 'waiting' | 'active' | 'done' | 'needs-approval'>,
  hasRepo: boolean,
  hasPrompt: boolean,
  hasPatch: boolean,
  checksPassed: boolean,
  hasPr: boolean,
) {
  if (!hasRepo) return 'Select a repository.'
  if (!hasPrompt) return 'Write the operator prompt.'
  if (steps['Patch prepared'] === 'waiting') return 'Start work to generate a plan and patch.'
  if (hasPatch && steps['Patch prepared'] === 'needs-approval') return 'Review the diff and approve changes.'
  if (steps['Checks running'] === 'needs-approval') return 'Run checks before commit.'
  if (!checksPassed && steps['Checks running'] !== 'waiting') return 'Wait for checks or retry failed checks.'
  if (steps['Commit ready'] === 'needs-approval') return 'Commit and push the guarded branch.'
  if (steps['PR ready'] === 'needs-approval') return 'Create the pull request.'
  if (hasPr || steps['Deploy ready'] === 'needs-approval') return 'Review PR, then merge/deploy only when backend guards allow it.'
  return 'Start work.'
}
