'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, GitPullRequest, Loader2, Play, ShieldCheck } from 'lucide-react'
import { type CostMode, providerLabel } from '@/lib/approved-ai-catalog'
import type { UniversalModelCatalog } from '@/lib/universal-model-catalog'

type Repo = { full_name: string; default_branch: string; private?: boolean }
type Branch = { name: string; sha: string; isDefault?: boolean }
type WorkbenchModel = { provider: string; modelId: string; displayName: string }
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
  const [governedWorkbenchModels, setGovernedWorkbenchModels] = useState<WorkbenchModel[]>([])
  const [repoFullName, setRepoFullName] = useState('')
  const [branch, setBranch] = useState('auto')
  const [modelId, setModelId] = useState('auto')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [prompt, setPrompt] = useState('')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [taskId, setTaskId] = useState('')
  const [currentJobId, setCurrentJobId] = useState('')
  const [patchId, setPatchId] = useState('')
  const [prNumber, setPrNumber] = useState<number | null>(null)
  const [checksPassed, setChecksPassed] = useState(false)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
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

  const codingModels = useMemo<WorkbenchModel[]>(() => {
    if (governedWorkbenchModels.length) return governedWorkbenchModels
    return catalog?.grouped.coding ?? catalog?.models ?? []
  }, [catalog, governedWorkbenchModels])
  const selectedModel = codingModels.find((model) => model.modelId === modelId)
  const executionModel = modelIdForExecution(selectedModel?.modelId ?? modelId)
  const hasPlan = Boolean(taskId || log.plan)
  const nextAction = getNextAction(stepStatus, Boolean(repoFullName), Boolean(prompt), hasPlan, Boolean(patchId), checksPassed, Boolean(prNumber))
  const primaryAction = getPrimaryWorkbenchAction(stepStatus, Boolean(repoFullName), Boolean(prompt), hasPlan, Boolean(patchId), checksPassed, Boolean(prNumber))

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
    setTaskId(job.id)
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
      const governed = Array.isArray(modelData?.governance?.workbenchModels)
        ? modelData.governance.workbenchModels.map((model: { provider: string; modelId: string; label?: string; displayName?: string }) => ({
          provider: model.provider,
          modelId: model.modelId,
          displayName: model.displayName ?? model.label ?? model.modelId,
        }))
        : []
      setGovernedWorkbenchModels(governed)
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
    const plan = await call('Generate plan', `/api/admin/repo-workbench/${activeWorkspace.id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload()),
    })
    const task = plan.task as { id?: string } | undefined
    const nextTaskId = String(task?.id ?? plan.taskId ?? '')
    setTaskId(nextTaskId)
    setCurrentJobId(nextTaskId)
    setLog((current) => ({ ...current, plan: asText(plan.plan ?? plan.planJson ?? plan.task ?? plan) }))
    updateStep('Planning', 'done')
    updateStep('Files selected', 'done')
    updateStep('Patch prepared', 'waiting')
  }

  async function generatePatch() {
    if (!prompt.trim() || !repoFullName) return
    const activeWorkspace = await ensureWorkspace()
    updateStep('Patch prepared', 'active')
    const patch = await call('Generate patch', `/api/admin/repo-workbench/${activeWorkspace.id}/patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload(), taskId: taskId || currentJobId || undefined }),
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
    const confirmed = window.confirm(
      `⚠️ Deploy confirmation required\n\nThis will deploy "${workspace.owner}/${workspace.repo}" to production.\n\nType OK to confirm.`,
    )
    if (!confirmed) return
    const data = await call('Deploy', `/api/admin/repo-workbench/${workspace.id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation, confirm: true }),
    })
    setLog((current) => ({ ...current, deploy: asText(data.output ?? data) }))
  }

  async function retryFailedStep() {
    if (!error) return
    if (hasPlan && !patchId) return generatePatch()
    if (stepStatus['Planning'] === 'active' || !hasPlan) return startWork()
    if (stepStatus['Patch prepared'] === 'active' || stepStatus['Patch prepared'] === 'needs-approval') return approveChanges()
    if (stepStatus['Checks running'] === 'active' || stepStatus['Checks running'] === 'needs-approval') return runChecks()
    if (stepStatus['Commit ready'] === 'active' || stepStatus['Commit ready'] === 'needs-approval') return commitAndPush()
    if (stepStatus['PR ready'] === 'active' || stepStatus['PR ready'] === 'needs-approval') return createPr()
  }

  async function runPrimaryAction() {
    if (primaryAction.id === 'start') return startWork()
    if (primaryAction.id === 'patch') return generatePatch()
    if (primaryAction.id === 'approve') return approveChanges()
    if (primaryAction.id === 'checks') return runChecks()
    if (primaryAction.id === 'commit') return commitAndPush()
    if (primaryAction.id === 'pr') return createPr()
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

      {/* 3-column workspace: left command | center plan+diff | right checks+PR+action */}
      <div className="grid gap-4 xl:grid-cols-[320px_1fr_260px]">

        {/* LEFT: repo / branch / model / prompt */}
        <aside className="space-y-3 rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
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
              {codingModels.map((model) => <option key={`${model.provider}:${model.modelId}`} value={model.modelId}>{providerLabel(model.provider)} - {model.displayName}</option>)}
            </select>
          </WbField>
          <WbField label="Cost mode">
            <select value={costMode} onChange={(event) => setCostMode(event.target.value as CostMode)} className="wb-select">
              <option value="cheap">cheap</option>
              <option value="balanced">balanced</option>
              <option value="premium">premium</option>
            </select>
          </WbField>
          <label className="block">
            <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Prompt</span>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="Describe the change. The Workbench will plan, prepare a patch, and wait for your approval."
              className="mt-1.5 min-h-36 w-full resize-none rounded-xl border border-slate-700/50 bg-slate-800/60 px-4 py-3 text-sm leading-6 text-slate-200 outline-none placeholder:text-slate-600 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
            />
          </label>
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/8 p-3">
              <p className="text-sm font-semibold text-red-400">{error}</p>
              <button onClick={retryFailedStep} disabled={Boolean(loading)} className="mt-2 rounded-lg border border-red-400/30 px-2.5 py-1 text-xs font-black text-red-200 disabled:opacity-40">Retry failed step</button>
            </div>
          )}
        </aside>

        {/* CENTER: readable plan, diff, files */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400/70">Readable plan</p>
            <PlanSections value={log.plan} />
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400/70">Diff viewer</p>
            <div className="mt-3">
              {log.diff ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-400">{log.diff}</pre> : <p className="text-sm font-semibold text-slate-500">Generated patch diff appears after Generate patch.</p>}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400/70">Files changed</p>
            <div className="mt-3">
              {log.files ? <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-5 text-slate-400">{log.files}</pre> : <p className="text-sm font-semibold text-slate-500">File list appears with the generated patch.</p>}
            </div>
          </div>
        </div>

        {/* RIGHT: next action + checks + PR status */}
        <aside className="space-y-3">
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400/70">Primary next action</p>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-600">Next action</p>
            <p className="mt-1 text-sm font-bold text-slate-300">{nextAction}</p>
            <button
              onClick={runPrimaryAction}
              disabled={primaryAction.disabled || Boolean(loading)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-black text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.2)] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : primaryAction.icon}
              {primaryAction.label}
            </button>
            <p className="mt-2 text-[10px] font-semibold text-slate-600">
              {selectedModel ? `${providerLabel(selectedModel.provider)} / ${executionModel || 'auto'}` : 'Auto coding model'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400/70">Checks, PR, deploy</p>
            <div className="mt-3 space-y-0">
              <StatusLine label="Checks" value={checksPassed ? 'passed' : stepStatus['Checks running']} />
              <StatusLine label="PR" value={prNumber ? `#${prNumber}` : stepStatus['PR ready']} />
              <StatusLine label="Deploy" value={stepStatus['Deploy ready']} />
            </div>
            {log.pr && (
              <a href={log.pr} className="mt-3 inline-block w-full rounded-xl border border-cyan-500/20 bg-cyan-500/8 px-3 py-2 text-center text-xs font-black text-cyan-300 hover:bg-cyan-500/15">
                Open PR URL
              </a>
            )}
          </div>
          <details className="rounded-2xl border border-slate-700/40 bg-slate-900/60 p-4 backdrop-blur-xl">
            <summary className="cursor-pointer text-xs font-black uppercase tracking-[0.14em] text-slate-500">Manual controls</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              <WbButton onClick={startWork} disabled={!repoFullName || !prompt || hasPlan || Boolean(loading)} loading={loading === 'Generate plan'} label="Generate plan" icon={<Play className="h-3.5 w-3.5" />} />
              <WbButton onClick={generatePatch} disabled={!workspace || !hasPlan || Boolean(patchId) || Boolean(loading)} loading={loading === 'Generate patch'} label="Generate patch" icon={<Play className="h-3.5 w-3.5" />} />
              <WbButton onClick={approveChanges} disabled={!workspace || !patchId || stepStatus['Patch prepared'] !== 'needs-approval' || Boolean(loading)} loading={loading.includes('approved')} label="Approve changes" icon={<ShieldCheck className="h-3.5 w-3.5" />} />
              <WbButton onClick={runChecks} disabled={!workspace || stepStatus['Checks running'] !== 'needs-approval' || Boolean(loading)} loading={loading.startsWith('Run ') || loading === 'Detect checks'} label="Run checks" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
              <WbButton onClick={commitAndPush} disabled={!workspace || !patchId || !checksPassed || stepStatus['Commit ready'] !== 'needs-approval' || Boolean(loading)} loading={loading.includes('Commit') || loading.includes('Push')} label="Commit and push" icon={<GitPullRequest className="h-3.5 w-3.5" />} />
              <WbButton onClick={createPr} disabled={!workspace || stepStatus['PR ready'] !== 'needs-approval' || Boolean(loading)} loading={loading === 'Create PR'} label="Create PR" icon={<GitPullRequest className="h-3.5 w-3.5" />} />
            </div>
          </details>
        </aside>
      </div>

      {/* Timeline + logs */}
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl">
        <button
          onClick={() => setAdvancedOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-black text-slate-300"
        >
          Advanced details
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


function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/70 py-2 last:border-0">
      <span className="text-xs font-bold text-slate-500">{label}</span>
      <span className="text-xs font-black text-slate-300">{value}</span>
    </div>
  )
}

function PlanSections({ value }: { value?: string }) {
  const parsed = parsePlanSections(value ?? '')
  if (!value) return <p className="text-sm font-semibold text-slate-500">Start task to generate Summary, Findings, Files, Risks, Fixes, and Verification.</p>
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {(['Summary', 'Findings', 'Files', 'Risks', 'Fixes', 'Verification'] as const).map((key) => (
        <div key={key} className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-3">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{key}</p>
          <p className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-400">{parsed[key] || 'No entry returned yet.'}</p>
        </div>
      ))}
    </div>
  )
}

function parsePlanSections(value: string): Record<'Summary' | 'Findings' | 'Files' | 'Risks' | 'Fixes' | 'Verification', string> {
  const fallback = {
    Summary: value.slice(0, 700),
    Findings: '',
    Files: '',
    Risks: '',
    Fixes: '',
    Verification: '',
  }
  if (!value) return fallback
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    return {
      Summary: stringifyPlanField(parsed.summary ?? parsed.overview ?? parsed.reasoning ?? parsed.plan ?? value),
      Findings: stringifyPlanField(parsed.findings ?? parsed.analysis ?? parsed.notes),
      Files: stringifyPlanField(parsed.files ?? parsed.filesAffected ?? parsed.changedFiles),
      Risks: stringifyPlanField(parsed.risks ?? parsed.blockers),
      Fixes: stringifyPlanField(parsed.fixes ?? parsed.steps ?? parsed.tasks),
      Verification: stringifyPlanField(parsed.verification ?? parsed.checks ?? parsed.testPlan),
    }
  } catch {
    return fallback
  }
}

function stringifyPlanField(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(formatPlanItem).join('\n')
  return formatPlanItem(value)
}

function formatPlanItem(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return String(value)
  const record = value as Record<string, unknown>
  const severity = firstString(record.severity, record.priority, record.level)
  const location = firstString(record.file, record.route, record.path, record.component)
  const issue = firstString(record.issue, record.title, record.summary, record.description)
  const fix = firstString(record.fix, record.recommendation, record.action, record.resolution)
  const parts = [
    severity ? `Severity: ${severity}` : '',
    location ? `Location: ${location}` : '',
    issue ? `Issue: ${issue}` : '',
    fix ? `Fix: ${fix}` : '',
  ].filter(Boolean)
  if (parts.length) return parts.join('\n')
  return Object.entries(record)
    .map(([key, item]) => `${humanizePlanKey(key)}: ${Array.isArray(item) ? item.map(formatPlanItem).join('; ') : typeof item === 'object' && item ? formatPlanItem(item) : String(item ?? '')}`)
    .join('\n')
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number') return String(value)
  }
  return ''
}

function humanizePlanKey(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ')
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

function getPrimaryWorkbenchAction(
  steps: Record<StepId, 'waiting' | 'active' | 'done' | 'needs-approval'>,
  hasRepo: boolean,
  hasPrompt: boolean,
  hasPlan: boolean,
  hasPatch: boolean,
  checksPassed: boolean,
  hasPr: boolean,
) {
  if (!hasRepo || !hasPrompt) return { id: 'start', label: 'Start task', disabled: true, icon: <Play className="h-3.5 w-3.5" /> }
  if (!hasPlan) return { id: 'start', label: 'Start task', disabled: false, icon: <Play className="h-3.5 w-3.5" /> }
  if (!hasPatch && steps['Patch prepared'] === 'waiting') return { id: 'patch', label: 'Generate patch', disabled: false, icon: <Play className="h-3.5 w-3.5" /> }
  if (hasPatch && steps['Patch prepared'] === 'needs-approval') return { id: 'approve', label: 'Approve changes', disabled: false, icon: <ShieldCheck className="h-3.5 w-3.5" /> }
  if (steps['Checks running'] === 'needs-approval') return { id: 'checks', label: 'Run checks', disabled: false, icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
  if (steps['Commit ready'] === 'needs-approval' && checksPassed) return { id: 'commit', label: 'Commit and push', disabled: false, icon: <GitPullRequest className="h-3.5 w-3.5" /> }
  if (steps['PR ready'] === 'needs-approval') return { id: 'pr', label: 'Create PR', disabled: false, icon: <GitPullRequest className="h-3.5 w-3.5" /> }
  return { id: 'done', label: hasPr ? 'Review PR' : 'Waiting', disabled: true, icon: <CheckCircle2 className="h-3.5 w-3.5" /> }
}

function modelIdForExecution(value: string | undefined) {
  if (!value || value === 'auto' || value.startsWith('auto:')) return undefined
  return value
}

function getNextAction(
  steps: Record<StepId, 'waiting' | 'active' | 'done' | 'needs-approval'>,
  hasRepo: boolean,
  hasPrompt: boolean,
  hasPlan: boolean,
  hasPatch: boolean,
  checksPassed: boolean,
  hasPr: boolean,
) {
  if (!hasRepo) return 'Select a repository.'
  if (!hasPrompt) return 'Write the operator prompt.'
  if (!hasPlan) return 'Start task to generate a readable plan.'
  if (!hasPatch && steps['Patch prepared'] === 'waiting') return 'Generate patch from the approved plan.'
  if (hasPatch && steps['Patch prepared'] === 'needs-approval') return 'Review the diff and approve changes.'
  if (steps['Checks running'] === 'needs-approval') return 'Run checks before commit.'
  if (!checksPassed && steps['Checks running'] !== 'waiting') return 'Wait for checks or retry failed checks.'
  if (steps['Commit ready'] === 'needs-approval') return 'Commit and push the guarded branch.'
  if (steps['PR ready'] === 'needs-approval') return 'Create the pull request.'
  if (hasPr || steps['Deploy ready'] === 'needs-approval') return 'Review PR, then merge/deploy only when backend guards allow it.'
  return 'Start work.'
}
