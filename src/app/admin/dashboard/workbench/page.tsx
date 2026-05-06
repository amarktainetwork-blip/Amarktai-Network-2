'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, GitCommit, GitMerge, GitPullRequest, Loader2, Rocket, Upload, Wand2 } from 'lucide-react'
import { APPROVED_WORKBENCH_MODELS, type CostMode, providerLabel } from '@/lib/approved-ai-catalog'

type Repo = { full_name: string; default_branch: string; private?: boolean }
type Branch = { name: string; sha: string; isDefault?: boolean }
type Workspace = { id: string; owner: string; repo: string; branch: string; currentCommit?: string; status?: string }
type ApiResult = Record<string, unknown> & { success?: boolean; error?: string; blocker?: string }
type OutputTab = 'plan' | 'files' | 'diff' | 'checks' | 'pr' | 'deploy'
type RouteEstimate = { selectedProvider?: string | null; selectedModel?: string | null; estimatedCostUsd?: number; reason?: string; blockedReason?: string | null }

const outputTabs: Array<{ id: OutputTab; label: string }> = [
  { id: 'plan', label: 'Plan' },
  { id: 'files', label: 'Files changed' },
  { id: 'diff', label: 'Diff' },
  { id: 'checks', label: 'Checks' },
  { id: 'pr', label: 'PR' },
  { id: 'deploy', label: 'Deploy log' },
]

function asText(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

export default function WorkbenchPage() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [repoFullName, setRepoFullName] = useState('')
  const [branch, setBranch] = useState('main')
  const [modelId, setModelId] = useState(APPROVED_WORKBENCH_MODELS[0]?.id ?? '')
  const [costMode, setCostMode] = useState<CostMode>('balanced')
  const [prompt, setPrompt] = useState('')
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [patchId, setPatchId] = useState('')
  const [taskId, setTaskId] = useState('')
  const [worktree, setWorktree] = useState<{ dirty?: boolean; currentBranch?: string; currentCommit?: string; dirtyFiles?: string[] } | null>(null)
  const [availableChecks, setAvailableChecks] = useState<string[]>([])
  const [routeEstimate, setRouteEstimate] = useState<RouteEstimate | null>(null)
  const [tab, setTab] = useState<OutputTab>('plan')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [outputs, setOutputs] = useState<Record<OutputTab, string>>({
    plan: '',
    files: '',
    diff: '',
    checks: '',
    pr: '',
    deploy: '',
  })

  const modelsForMode = useMemo(
    () => APPROVED_WORKBENCH_MODELS.filter((model) => model.costMode === costMode),
    [costMode],
  )

  const selectedModel = useMemo(
    () => modelId === 'auto' ? undefined : APPROVED_WORKBENCH_MODELS.find((model) => model.id === modelId) ?? modelsForMode[0],
    [modelId, modelsForMode],
  )

  const prNumber = useMemo(() => {
    const match = outputs.pr.match(/\/pull\/(\d+)/)
    return match ? Number(match[1]) : null
  }, [outputs.pr])

  const appendOutput = useCallback((target: OutputTab, text: string) => {
    setOutputs((current) => ({ ...current, [target]: text }))
  }, [])

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

  const loadRepos = useCallback(async () => {
    const data = await call('Load repos', '/api/admin/repo-workbench/github/repos')
    const nextRepos = Array.isArray(data.repos) ? data.repos as Repo[] : []
    setRepos(nextRepos)
    if (!repoFullName && nextRepos[0]) {
      setRepoFullName(nextRepos[0].full_name)
      setBranch(nextRepos[0].default_branch || 'main')
    }
  }, [call, repoFullName])

  useEffect(() => {
    loadRepos().catch(() => null)
  }, [loadRepos])

  useEffect(() => {
    if (modelId !== 'auto' && modelsForMode[0] && !modelsForMode.some((model) => model.id === modelId)) {
      setModelId(modelsForMode[0].id)
    }
  }, [modelId, modelsForMode])

  useEffect(() => {
    const provider = selectedModel?.provider ?? 'auto'
    const selected = selectedModel?.id
    fetch('/api/admin/ai-routing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capability: 'coding', appSlug: 'repo-workbench', selectedProvider: provider, selectedModel: selected, costMode }),
    })
      .then((response) => response.json())
      .then((data) => setRouteEstimate(data.route ?? null))
      .catch(() => setRouteEstimate(null))
  }, [costMode, selectedModel])

  async function loadBranches(nextRepo = repoFullName) {
    if (!nextRepo) return
    const data = await call('Load branches', `/api/admin/repo-workbench/github/branches?repo=${encodeURIComponent(nextRepo)}`)
    const nextBranches = Array.isArray(data.branches) ? data.branches as Branch[] : []
    setBranches(nextBranches)
    const defaultBranch = nextBranches.find((item) => item.isDefault)?.name ?? nextBranches[0]?.name
    if (defaultBranch) setBranch(defaultBranch)
  }

  async function ensureWorkspace() {
    if (workspace) return workspace
    const data = await call('Import repo', '/api/admin/repo-workbench/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoFullName, branch }),
    })
    const nextWorkspace = data.workspace as Workspace
    setWorkspace(nextWorkspace)
    await loadWorkspaceStatus(nextWorkspace.id)
    return nextWorkspace
  }

  async function loadWorkspaceStatus(workspaceId: string) {
    const [statusData, checksData] = await Promise.all([
      call('Load workspace status', `/api/admin/repo-workbench/${workspaceId}/status`).catch(() => null),
      call('Load checks', `/api/admin/repo-workbench/${workspaceId}/checks`).catch(() => null),
    ])
    if (statusData) setWorktree(statusData as never)
    if (checksData && Array.isArray(checksData.checks)) setAvailableChecks(checksData.checks as string[])
  }

  function workbenchPayload() {
    return {
      request: prompt,
      modelId: selectedModel?.id,
      provider: selectedModel?.provider ?? 'auto',
      costMode,
      taskType: 'auto',
      scope: 'auto',
    }
  }

  async function planFix() {
    const activeWorkspace = await ensureWorkspace()
    setTab('plan')
    const data = await call('Plan fix', `/api/admin/repo-workbench/${activeWorkspace.id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(workbenchPayload()),
    })
    const task = data.task as { id?: string } | undefined
    setTaskId(String(task?.id ?? data.taskId ?? ''))
    appendOutput('plan', asText(data.plan ?? data.planJson ?? data.task ?? data))
  }

  async function generatePatch() {
    const activeWorkspace = await ensureWorkspace()
    setTab('diff')
    const patchData = await call('Generate patch', `/api/admin/repo-workbench/${activeWorkspace.id}/patch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...workbenchPayload(), taskId: taskId || undefined }),
      })
    const patch = patchData.patch as { id?: string; diffText?: string; filesAffected?: string[] } | undefined
    const nextPatchId = String(patch?.id ?? patchData.patchId ?? '')
    setPatchId(nextPatchId)
    appendOutput('diff', String(patch?.diffText ?? patchData.diffText ?? ''))
    appendOutput('files', asText(patch?.filesAffected ?? patchData.filesAffected ?? patchData.changedFiles ?? []))
    return nextPatchId
  }

  async function applyFix() {
    const activeWorkspace = await ensureWorkspace()
    const activePatchId = patchId || await generatePatch()
    if (!activePatchId) return
    const applied = await call('Apply fix', `/api/admin/repo-workbench/${activeWorkspace.id}/apply-patch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId: activePatchId, confirm: true }),
    })
    appendOutput('files', asText(applied.changedFiles ?? applied.files ?? applied))
    await loadWorkspaceStatus(activeWorkspace.id)
  }

  async function runChecks() {
    const activeWorkspace = await ensureWorkspace()
    setTab('checks')
    const commands = availableChecks.length ? availableChecks : ['lint', 'test', 'build']
    const results: string[] = []
    for (const command of commands) {
      const data = await call(`Run ${command}`, `/api/admin/repo-workbench/${activeWorkspace.id}/run-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })
      results.push(`> ${command}\n${asText(data.output ?? data)}`)
    }
    appendOutput('checks', results.join('\n\n'))
  }

  async function commitChanges() {
    const activeWorkspace = await ensureWorkspace()
    setTab('files')
    if (!patchId) throw new Error('Generate and apply a patch before committing.')
    const data = await call('Commit', `/api/admin/repo-workbench/${activeWorkspace.id}/commit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patchId, message: prompt.slice(0, 180) || 'Repo Workbench update', branchName: `repo-workbench/${Date.now()}`, confirm: true }),
    })
    appendOutput('files', asText(data))
    await loadWorkspaceStatus(activeWorkspace.id)
  }

  async function pushBranch() {
    const activeWorkspace = await ensureWorkspace()
    setTab('pr')
    const data = await call('Push', `/api/admin/repo-workbench/${activeWorkspace.id}/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true }),
    })
    appendOutput('pr', asText(data))
  }

  async function createPr() {
    const activeWorkspace = await ensureWorkspace()
    setTab('pr')
    const data = await call('Create PR', `/api/admin/repo-workbench/${activeWorkspace.id}/pr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: prompt.slice(0, 90) || 'Repo Workbench update', body: `Generated by AmarktAI Repo Workbench.\n\nPrompt:\n${prompt}`, confirm: true }),
    })
    appendOutput('pr', asText(data.prUrl ?? data))
  }

  async function mergePr() {
    if (!workspace || !prNumber) return
    setTab('pr')
    const data = await call('Merge', `/api/admin/repo-workbench/${workspace.id}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prNumber, confirm: true }),
    })
    appendOutput('pr', asText(data))
  }

  async function deploy() {
    if (!workspace) return
    setTab('deploy')
    const confirmation = `DEPLOY ${workspace.owner}/${workspace.repo}`
    const data = await call('Deploy', `/api/admin/repo-workbench/${workspace.id}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation, confirm: true }),
    })
    appendOutput('deploy', asText(data.output ?? data))
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Workbench</p>
        <h1 className="mt-3 text-3xl font-black text-white">Repo Workbench</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Select repo, select branch, choose AI/model and cost mode, type a prompt, plan the fix, apply it, run checks, create a PR, then merge or deploy when allowed.
        </p>
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03] p-5">
        <div className="grid gap-4 lg:grid-cols-4">
          <Field label="Repo selector">
            <select
              value={repoFullName}
              onChange={(event) => {
                setRepoFullName(event.target.value)
                setBranches([])
                loadBranches(event.target.value).catch(() => null)
              }}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="">Select repo</option>
              {repos.map((repo) => (
                <option key={repo.full_name} value={repo.full_name}>{repo.full_name}</option>
              ))}
            </select>
          </Field>

          <Field label="Branch selector">
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              {branches.length > 0
                ? branches.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)
                : <option value={branch}>{branch}</option>}
            </select>
          </Field>

          <Field label="AI/model selector">
            <select
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="auto">Auto approved route</option>
              {modelsForMode.map((model) => (
                <option key={`${model.provider}:${model.id}`} value={model.id}>
                  {providerLabel(model.provider)} - {model.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Cost mode selector">
            <select
              value={costMode}
              onChange={(event) => setCostMode(event.target.value as CostMode)}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            >
              <option value="cheap">cheap</option>
              <option value="balanced">balanced</option>
              <option value="premium">premium</option>
            </select>
          </Field>
        </div>

        <div className="mt-5">
          <Field label="Prompt box">
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={7}
              placeholder="Describe the change you want. Example: clean the dashboard nav, remove old pages, update tests, run checks, and prepare a PR."
              className="w-full resize-none rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white placeholder:text-slate-600"
            />
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <ActionButton onClick={planFix} disabled={!repoFullName || !prompt || Boolean(loading)} label="Plan fix" loading={loading === 'Plan fix'} icon={<Wand2 className="h-4 w-4" />} />
          <ActionButton onClick={generatePatch} disabled={!workspace || !prompt || Boolean(loading)} label="Generate patch" loading={loading === 'Generate patch'} />
          <ActionButton onClick={applyFix} disabled={!repoFullName || !prompt || Boolean(loading)} label="Apply fix" loading={loading === 'Apply fix' || loading === 'Prepare patch'} />
          <ActionButton onClick={runChecks} disabled={!workspace || Boolean(loading)} label="Run checks" loading={loading.startsWith('Run ')} icon={<CheckCircle2 className="h-4 w-4" />} />
          <ActionButton onClick={commitChanges} disabled={!workspace || !patchId || Boolean(loading)} label="Commit" loading={loading === 'Commit'} icon={<GitCommit className="h-4 w-4" />} />
          <ActionButton onClick={pushBranch} disabled={!workspace || Boolean(loading)} label="Push" loading={loading === 'Push'} icon={<Upload className="h-4 w-4" />} />
          <ActionButton onClick={createPr} disabled={!workspace || Boolean(loading)} label="Create PR" loading={loading === 'Create PR'} icon={<GitPullRequest className="h-4 w-4" />} />
          <ActionButton onClick={mergePr} disabled={!workspace || !prNumber || Boolean(loading)} label="Merge" loading={loading === 'Merge'} icon={<GitMerge className="h-4 w-4" />} />
          <ActionButton onClick={deploy} disabled={!workspace || Boolean(loading)} label="Deploy" loading={loading === 'Deploy'} icon={<Rocket className="h-4 w-4" />} />
        </div>

        {routeEstimate && (
          <p className="mt-4 text-xs text-slate-500">
            Route: {routeEstimate.selectedProvider ?? 'auto'} / {routeEstimate.selectedModel ?? routeEstimate.selectedProvider ?? 'selected by policy'} - estimated ${Number(routeEstimate.estimatedCostUsd ?? 0).toFixed(2)}
          </p>
        )}
        {workspace && (
          <p className="mt-4 text-xs text-slate-500">
            Active workspace: {workspace.owner}/{workspace.repo} on {workspace.branch} ({workspace.currentCommit?.slice(0, 12) || 'current checkout'})
          </p>
        )}
        {worktree && (
          <p className="mt-2 text-xs text-slate-500">
            Worktree: {worktree.dirty ? `${worktree.dirtyFiles?.length ?? 0} file(s) changed` : 'clean'} on {worktree.currentBranch ?? branch}. Checks: {availableChecks.length ? availableChecks.join(', ') : 'none detected'}.
          </p>
        )}
        {error && <p className="mt-4 rounded-lg border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      </section>

      <section className="rounded-lg border border-white/10 bg-white/[0.03]">
        <div className="flex flex-wrap gap-1 border-b border-white/10 p-2">
          {outputTabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={[
                'rounded-lg px-3 py-2 text-xs font-semibold',
                tab === item.id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          <pre className="min-h-72 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-4 text-xs leading-5 text-slate-300">
            {outputs[tab] || `${outputTabs.find((item) => item.id === tab)?.label} output will appear here.`}
          </pre>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</span>
      <span className="mt-2 block">{children}</span>
    </label>
  )
}

function ActionButton({ label, onClick, disabled, loading, icon }: { label: string; onClick: () => void; disabled: boolean; loading: boolean; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-cyan-400/15 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}
