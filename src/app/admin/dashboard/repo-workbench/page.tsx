'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CheckCircle,
  ChevronDown,
  Code2,
  DollarSign,
  FileText,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Loader2,
  Play,
  RefreshCcw,
  Rocket,
  Save,
  ShieldAlert,
  Trash2,
  UploadCloud,
  XCircle,
  Zap,
} from 'lucide-react'

type StatusMap = Record<string, boolean | string | string[] | null | undefined>
type Workspace = { id: string; owner: string; repo: string; branch: string; currentCommit?: string; status?: string; lastSyncedAt?: string | null }
type Repo = { full_name: string; default_branch: string; private?: boolean; description?: string | null }
type TreeEntry = { path: string; type: 'file' | 'dir'; size: number }
type RunResult = {
  taskId?: string; patchId?: string | null; summary?: string; diffText?: string
  filesAffected?: string[]; logs?: string[]; error?: string
  model?: string; provider?: string; estimatedCostUsd?: number
}

// ── Agent/model presets ───────────────────────────────────────────────────────

interface AgentPreset {
  id: string; label: string; description: string
  agentMode: string; quality: string
  estimatedCostPerKtokens: number  // USD per 1k tokens
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

const AGENT_PRESETS: AgentPreset[] = [
  { id: 'genx_best', label: 'GenX Best',  description: 'Automatically picks best GenX model for the task', agentMode: 'fullstack_builder', quality: 'best',    estimatedCostPerKtokens: 0.015, icon: Zap        },
  { id: 'cheap',     label: 'Cheap',      description: 'Fastest, lowest cost — DeepSeek or Qwen via GenX',   agentMode: 'fullstack_builder', quality: 'cheap',   estimatedCostPerKtokens: 0.001, icon: DollarSign },
  { id: 'balanced',  label: 'Balanced',   description: 'Good quality and cost — Claude Haiku or GPT-4o-mini', agentMode: 'fullstack_builder', quality: 'balanced',estimatedCostPerKtokens: 0.005, icon: CheckCircle},
  { id: 'premium',   label: 'Premium',    description: 'Highest quality — Claude Sonnet / GPT-4.1 (confirm)',agentMode: 'fullstack_builder', quality: 'premium', estimatedCostPerKtokens: 0.030, icon: Rocket     },
]

function estimateCost(instruction: string, preset: AgentPreset): string {
  const tokens = Math.max(500, instruction.length * 3)
  const cost = (tokens / 1000) * preset.estimatedCostPerKtokens
  return cost < 0.001 ? '<$0.001' : `~$${cost.toFixed(3)}`
}

const CHECKS = ['npm ci', 'npm install', 'npm run lint', 'npm test', 'npm run build', 'npx prisma generate', 'npx prisma db push', 'git status', 'git diff --stat']

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.success === false) throw new Error(data.error || data.blocker || `Request failed (${res.status})`)
  return data as T
}

export default function RepoWorkbenchPage() {
  const [status, setStatus] = useState<StatusMap | null>(null)
  const [githubStatus, setGithubStatus] = useState<Record<string, unknown> | null>(null)
  const [token, setToken] = useState('')
  const [repos, setRepos] = useState<Repo[]>([])
  const [repoFullName, setRepoFullName] = useState('')
  const [branch, setBranch] = useState('main')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [tree, setTree] = useState<TreeEntry[]>([])
  const [selectedPath, setSelectedPath] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [instruction, setInstruction] = useState('')
  const [selectedPreset, setSelectedPreset] = useState<AgentPreset>(AGENT_PRESETS[0])
  const [result, setResult] = useState<RunResult | null>(null)
  const [diffText, setDiffText] = useState('')
  const [patchId, setPatchId] = useState('')
  const [commitMessage, setCommitMessage] = useState('')
  const [workBranch, setWorkBranch] = useState('repo-workbench/fix')
  const [customCommand, setCustomCommand] = useState('')
  const [deployConfirm, setDeployConfirm] = useState('')
  const [mergePrNumber, setMergePrNumber] = useState('')
  const [logs, setLogs] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [openLogs, setOpenLogs] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showWorkspaceActions, setShowWorkspaceActions] = useState(false)

  const repoLabel = workspace ? `${workspace.owner}/${workspace.repo}` : 'No workspace selected'
  const deployPhrase = workspace ? `DEPLOY ${workspace.owner}/${workspace.repo}` : 'DEPLOY owner/repo'
  const deletePhrase = 'DELETE WORKSPACE'
  const deployEnabled = process.env.NEXT_PUBLIC_ENABLE_DEPLOY_ACTIONS === 'true'
  const deployBlocker = !deployEnabled
    ? 'Deploy disabled — set ENABLE_DEPLOY_ACTIONS=true to enable'
    : !workspace ? 'No workspace selected'
    : !can('canDeploy') ? 'No deploy target, checks failed, or no active PR'
    : null

  const loadStatus = useCallback(async () => {
    const data = await api<StatusMap>('/api/admin/repo-workbench/status')
    setStatus(data)
    const gh = await api<Record<string, unknown>>('/api/admin/repo-workbench/github/status').catch((err) => ({ success: false, blocker: err instanceof Error ? err.message : 'GitHub status unavailable' }))
    setGithubStatus(gh)
  }, [])

  const loadRepos = useCallback(async () => {
    const data = await api<{ github?: { repos?: Repo[] }; workspaces?: Workspace[] }>('/api/admin/repo-workbench/repos')
    setRepos(data.github?.repos ?? [])
    setWorkspaces(data.workspaces ?? [])
    if (!workspace && data.workspaces?.[0]) setWorkspace(data.workspaces[0])
  }, [workspace])

  const refreshAll = useCallback(async () => {
    setError('')
    await Promise.all([loadStatus(), loadRepos()])
  }, [loadStatus, loadRepos])

  useEffect(() => { refreshAll().catch((err) => setError(err instanceof Error ? err.message : 'Failed to load')) }, [refreshAll])

  async function runAction(label: string, fn: () => Promise<string | void>) {
    setBusy(label)
    setError('')
    setNotice('')
    try {
      const message = await fn()
      if (message) setNotice(message)
      await refreshAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : `${label} failed`)
    } finally {
      setBusy('')
    }
  }

  const selectedRepo = useMemo(() => repos.find((repo) => repo.full_name === repoFullName), [repos, repoFullName])

  function can(key: string) { return Boolean(status?.[key]) }
  const blocks = [...((status?.blockers as string[] | undefined) ?? []), ...((status?.warnings as string[] | undefined) ?? [])]

  async function saveToken() {
    await runAction('github-token', async () => {
      await api('/api/admin/repo-workbench/github/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      setToken('')
      return 'GitHub token saved and validated.'
    })
  }

  async function importRepo() {
    await runAction('import', async () => {
      const repo = repoFullName || selectedRepo?.full_name
      if (!repo) throw new Error('Choose or enter a repo first')
      const data = await api<{ workspace: Workspace }>('/api/admin/repo-workbench/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoFullName: repo, branch: branch || selectedRepo?.default_branch || 'main' }) })
      setWorkspace(data.workspace)
      return `Imported ${repo}`
    })
  }

  async function loadTree(target = workspace) {
    if (!target) return
    await runAction('tree', async () => {
      const data = await api<{ entries: TreeEntry[] }>(`/api/admin/repo-workbench/${target.id}/tree`)
      setTree(data.entries ?? [])
      return 'File tree loaded.'
    })
  }

  async function openFile(path: string) {
    if (!workspace) return
    await runAction('file', async () => {
      const data = await api<{ content: string; path: string }>(`/api/admin/repo-workbench/${workspace.id}/file?path=${encodeURIComponent(path)}`)
      setSelectedPath(data.path)
      setFileContent(data.content)
    })
  }

  async function saveFile() {
    if (!workspace || !selectedPath) return
    await runAction('save-file', async () => {
      await api(`/api/admin/repo-workbench/${workspace.id}/file`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: selectedPath, content: fileContent, confirm: true }) })
      return `Saved ${selectedPath}`
    })
  }

  async function agent(kind: 'audit' | 'plan' | 'patch' | 'run') {
    if (!workspace) return
    if (selectedPreset.id === 'premium') {
      const ok = confirm(`Premium model selected. Estimated cost: ${estimateCost(instruction, selectedPreset)}. Proceed?`)
      if (!ok) return
    }
    await runAction(kind, async () => {
      const url = kind === 'run' ? `/api/admin/repo-workbench/${workspace.id}/run` : `/api/admin/repo-workbench/${workspace.id}/${kind}`
      const body = kind === 'audit'
        ? { agentMode: selectedPreset.agentMode, depth: 'standard', quality: selectedPreset.quality }
        : kind === 'plan'   ? { request: instruction, scope: 'auto', agentMode: selectedPreset.agentMode, quality: selectedPreset.quality }
        : kind === 'patch'  ? { request: instruction, files: selectedPath ? [selectedPath] : [], agentMode: selectedPreset.agentMode, quality: selectedPreset.quality }
        : { instruction, quality: selectedPreset.quality, agentMode: selectedPreset.agentMode }
      const data = await api<RunResult>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      setResult(data)
      if (data.patchId) setPatchId(data.patchId)
      if (data.diffText) setDiffText(data.diffText)
      if (data.logs?.length) setLogs(data.logs.join('\n'))
      const modelInfo = data.model ? ` · ${data.provider ?? ''}/${data.model}` : ''
      const costInfo = data.estimatedCostUsd != null ? ` · $${data.estimatedCostUsd.toFixed(4)}` : ''
      return `${kind} completed${modelInfo}${costInfo}.`
    })
  }

  async function refreshDiff() {
    if (!workspace) return
    await runAction('diff', async () => {
      const data = await api<{ diffText: string; stat: string }>(`/api/admin/repo-workbench/${workspace.id}/diff`)
      setDiffText(data.diffText || data.stat)
      return 'Diff refreshed.'
    })
  }

  async function runCheck(command: string) {
    if (!workspace) return
    await runAction(command, async () => {
      const data = await api<{ jobId: string; output: string; status: string }>(`/api/admin/repo-workbench/${workspace.id}/run`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command }) })
      setLogs(data.output)
      return `${command}: ${data.status}`
    })
  }

  async function deleteWorkspace() {
    if (!workspace || deleteConfirm !== deletePhrase) return
    if (!confirm('This will permanently delete the workspace. Cannot be undone.')) return
    await runAction('delete-workspace', async () => {
      await api(`/api/admin/repo-workbench/${workspace.id}`, { method: 'DELETE' })
      setWorkspace(null); setTree([]); setDeleteConfirm(''); setShowWorkspaceActions(false)
      return 'Workspace deleted.'
    })
  }

  async function resetWorkspace() {
    if (!workspace) return
    if (!confirm('Reset workspace? Uncommitted changes will be lost.')) return
    await runAction('reset-workspace', async () => {
      await api(`/api/admin/repo-workbench/${workspace.id}/reset`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
      setDiffText(''); setPatchId(''); setResult(null)
      return 'Workspace reset.'
    })
  }

  async function clearLogs() {
    if (!workspace) return
    await runAction('clear-logs', async () => {
      const data = await api<{ cleared: number }>(`/api/admin/repo-workbench/${workspace.id}/clear-logs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) })
      setLogs('')
      return `Cleared ${data.cleared ?? 0} log file(s).`
    })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 py-4 text-slate-100">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white"><Code2 className="h-6 w-6 text-cyan-300" /> Repo Workbench</h1>
          <p className="text-sm text-slate-400">Connect GitHub · select repo · choose agent · run AI · review diff · commit · push · PR · deploy</p>
        </div>
        <Button label="Refresh" icon={RefreshCcw} onClick={refreshAll} busy={busy === 'refresh'} />
      </header>

      <section className="grid gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3 xl:grid-cols-6">
        <StatusPill label="Workspace" ok={can('workspaceWritable')} />
        <StatusPill label="GitHub" ok={Boolean(githubStatus?.authenticated)} />
        <StatusPill label="AI" ok={can('genxAvailable') || can('directProviderAvailable')} />
        <StatusPill label="Patch" ok={can('canPatch')} />
        <StatusPill label="PR" ok={can('canCreatePr')} />
        <StatusPill label="Deploy" ok={deployEnabled && can('canDeploy')} />
        {blocks.length > 0 && <div className="md:col-span-3 xl:col-span-6 rounded-md bg-amber-500/10 p-3 text-xs text-amber-200">{blocks.join(' | ')}</div>}
      </section>

      {error && <Alert tone="error" text={error} />}
      {notice && <Alert tone="success" text={notice} />}

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <Panel title="① Connect GitHub">
            <div className="space-y-2">
              <input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="GitHub PAT (ghp_…)" className="input" />
              <div className="flex gap-2">
                <Button label="Save token" icon={Save} onClick={saveToken} busy={busy === 'github-token'} disabled={!token.trim()} />
                <Button label="Validate" icon={ShieldAlert} onClick={loadStatus} />
              </div>
              <p className="text-xs text-slate-500">{githubStatus?.authenticated ? `✓ Connected as ${githubStatus.username}` : String(githubStatus?.blocker ?? 'Token not validated')}</p>
            </div>
          </Panel>

          <Panel title="② Select Repo & Branch">
            <div className="space-y-2">
              <select value={repoFullName} onChange={(e) => { setRepoFullName(e.target.value); const repo = repos.find((r) => r.full_name === e.target.value); if (repo) setBranch(repo.default_branch) }} className="input">
                <option value="">Select accessible repo</option>
                {repos.map((repo) => <option key={repo.full_name} value={repo.full_name}>{repo.full_name}{repo.private ? ' (private)' : ''}</option>)}
              </select>
              <input value={repoFullName} onChange={(e) => setRepoFullName(e.target.value)} placeholder="owner/repo" className="input" />
              <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="main" className="input" />
              <div className="grid grid-cols-2 gap-2">
                <Button label="Refresh repos" icon={RefreshCcw} onClick={loadRepos} />
                <Button label="Import/sync" icon={UploadCloud} onClick={importRepo} busy={busy === 'import'} disabled={!repoFullName} />
              </div>
            </div>
          </Panel>

          <Panel title="③ Workspace">
            <div className="space-y-2">
              <select value={workspace?.id ?? ''} onChange={(e) => setWorkspace(workspaces.find((w) => w.id === e.target.value) ?? null)} className="input">
                <option value="">Select workspace</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.owner}/{w.repo} @ {w.branch}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Button label="Pull latest" icon={RefreshCcw} onClick={() => workspace && runAction('pull', async () => { await api(`/api/admin/repo-workbench/${workspace.id}/pull`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: false }) }); return 'Pulled latest.' })} disabled={!workspace} />
                <Button label="Load files" icon={FileText} onClick={() => loadTree()} disabled={!workspace} />
              </div>
              <input value={workBranch} onChange={(e) => setWorkBranch(e.target.value)} placeholder="feature/my-branch" className="input" />
              <Button label="Create branch" icon={GitBranch} onClick={() => workspace && runAction('branch', async () => { await api(`/api/admin/repo-workbench/${workspace.id}/branch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branchName: workBranch, confirm: true }) }); return `Created ${workBranch}` })} disabled={!workspace || !workBranch} />
              <p className="text-xs text-slate-500">{repoLabel}</p>

              {workspace && (
                <div className="pt-2 border-t border-white/10">
                  <button onClick={() => setShowWorkspaceActions((v) => !v)} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition">
                    <ChevronDown className={`h-3.5 w-3.5 transition ${showWorkspaceActions ? 'rotate-180' : ''}`} /> Workspace actions
                  </button>
                  {showWorkspaceActions && (
                    <div className="mt-3 space-y-2">
                      <Button label="Reset workspace" icon={RefreshCcw} onClick={resetWorkspace} busy={busy === 'reset-workspace'} />
                      <Button label="Clear logs" icon={XCircle} onClick={clearLogs} busy={busy === 'clear-logs'} />
                      <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 space-y-2">
                        <p className="text-xs text-red-400 font-medium">Danger zone</p>
                        <p className="text-[10px] text-slate-500">Type <span className="font-mono text-red-300">{deletePhrase}</span> to confirm permanent deletion.</p>
                        <input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={deletePhrase} className="input text-xs" />
                        <button onClick={deleteWorkspace} disabled={deleteConfirm !== deletePhrase || busy === 'delete-workspace'} className="flex w-full items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-40">
                          {busy === 'delete-workspace' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete workspace
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Panel>

          <Panel title="File Explorer">
            <div className="max-h-[420px] space-y-1 overflow-auto pr-1">
              {tree.filter((item) => item.type === 'file').slice(0, 400).map((item) => (
                <button key={item.path} onClick={() => openFile(item.path)} className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${selectedPath === item.path ? 'bg-cyan-500/20 text-cyan-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                  {item.path}
                </button>
              ))}
              {tree.length === 0 && <p className="text-xs text-slate-500">Load a workspace to browse files.</p>}
            </div>
          </Panel>
        </aside>

        <main className="space-y-5">
          <Panel title="④ Coding Agent / Model">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 mb-3">
              {AGENT_PRESETS.map((preset) => {
                const Icon = preset.icon
                const active = selectedPreset.id === preset.id
                return (
                  <button key={preset.id} onClick={() => setSelectedPreset(preset)} className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition ${active ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
                    <div className="flex items-center gap-1.5"><Icon className="h-3.5 w-3.5" /><span className="text-xs font-semibold">{preset.label}</span></div>
                    <span className="text-[10px] leading-tight opacity-70">{preset.description}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-slate-500">
              Selected: <span className="text-white font-medium">{selectedPreset.label}</span> · Est. cost:{' '}
              <span className="font-mono text-amber-300">{instruction ? estimateCost(instruction, selectedPreset) : '—'}</span>
              {selectedPreset.id === 'premium' && <span className="ml-2 text-amber-400">Premium requires confirmation before run.</span>}
            </p>
          </Panel>

          <Panel title="⑤ Agent Task">
            <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} rows={4} placeholder="Describe what you want the coding agent to do…" className="input min-h-28 resize-y" />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button label="Audit" icon={ShieldAlert} onClick={() => agent('audit')} disabled={!workspace || !can('canPlan')} />
              <Button label="Plan" icon={FileText} onClick={() => agent('plan')} disabled={!workspace || !instruction.trim() || !can('canPlan')} />
              <Button label="Generate patch" icon={Code2} onClick={() => agent('patch')} disabled={!workspace || !instruction.trim() || !can('canPatch')} />
              <Button label="Run AI" icon={Play} onClick={() => agent('run')} busy={busy === 'run'} disabled={!workspace || !instruction.trim() || !can('canPatch')} />
              <Button label="Refresh diff" icon={RefreshCcw} onClick={refreshDiff} disabled={!workspace} />
              <Button label="Apply patch" icon={CheckCircle} onClick={() => workspace && runAction('apply', async () => { await api(`/api/admin/repo-workbench/${workspace.id}/apply-patch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patchId: patchId || result?.patchId, confirm: true }) }); return 'Patch applied.' })} disabled={!workspace || !(patchId || result?.patchId)} />
            </div>
            {result?.summary && (
              <div className="mt-3 rounded-md bg-white/5 p-3 text-sm text-slate-200">
                <p>{result.summary}</p>
                {(result.model || result.estimatedCostUsd != null) && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    {result.model && `Model: ${result.provider ?? ''}/${result.model}`}
                    {result.estimatedCostUsd != null && ` · Cost: $${result.estimatedCostUsd.toFixed(4)}`}
                  </p>
                )}
              </div>
            )}
          </Panel>

          <Panel title="⑥ Diff Preview">
            <pre className="max-h-80 overflow-auto rounded-md border border-white/10 bg-black/30 p-3 text-xs text-slate-300">{diffText || result?.diffText || 'No diff loaded yet.'}</pre>
          </Panel>

          <Panel title="File Viewer / Editor">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="truncate font-mono text-xs text-cyan-200">{selectedPath || 'No file selected'}</span>
              <Button label="Save file" icon={Save} onClick={saveFile} disabled={!workspace || !selectedPath} />
            </div>
            <textarea value={fileContent} onChange={(e) => setFileContent(e.target.value)} rows={14} className="h-80 w-full resize-y rounded-md border border-white/10 bg-black/30 p-3 font-mono text-xs text-slate-100 outline-none focus:border-cyan-500/50" />
          </Panel>

          <Panel title="⑦ Run Checks">
            <div className="flex flex-wrap gap-2">
              {CHECKS.map((command) => <Button key={command} label={command} icon={Play} onClick={() => runCheck(command)} disabled={!workspace || !can('canRunChecks')} />)}
            </div>
            <div className="mt-3 flex gap-2">
              <input value={customCommand} onChange={(e) => setCustomCommand(e.target.value)} placeholder="custom command" className="input" />
              <Button label="Run custom" icon={Play} onClick={() => runCheck(customCommand)} disabled={!workspace || !customCommand.trim()} />
            </div>
          </Panel>

          <Panel title="⑧ Commit → Push → PR">
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} placeholder="Commit message" className="input" />
              <Button label="Commit" icon={GitCommit} onClick={() => workspace && runAction('commit', async () => { await api(`/api/admin/repo-workbench/${workspace.id}/commit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ patchId: patchId || result?.patchId, message: commitMessage, branchName: workBranch, confirm: true }) }); return 'Changes committed.' })} disabled={!workspace || !commitMessage || !(patchId || result?.patchId)} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button label="Push" icon={UploadCloud} onClick={() => workspace && runAction('push', async () => { await api(`/api/admin/repo-workbench/${workspace.id}/push`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: true }) }); return 'Branch pushed.' })} disabled={!workspace || !can('canPush')} />
              <Button label="Create PR" icon={GitPullRequest} onClick={() => workspace && runAction('pr', async () => { await api(`/api/admin/repo-workbench/${workspace.id}/pr`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: commitMessage || 'Repo Workbench changes', body: `${instruction}\n\nGenerated by Repo Workbench.`, confirm: true }) }); return 'PR created.' })} disabled={!workspace || !can('canCreatePr')} />
              <Button label="PR status" icon={RefreshCcw} onClick={() => workspace && runAction('pr-status', async () => { const data = await api<Record<string, unknown>>(`/api/admin/repo-workbench/${workspace.id}/pr-status`); setLogs(JSON.stringify(data, null, 2)); return 'PR status loaded.' })} disabled={!workspace} />
              <input value={mergePrNumber} onChange={(e) => setMergePrNumber(e.target.value)} placeholder="PR #" className="input max-w-28" />
              <Button label="Merge" icon={GitPullRequest} onClick={() => workspace && runAction('merge', async () => { await api(`/api/admin/repo-workbench/${workspace.id}/merge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prNumber: Number(mergePrNumber), confirm: true }) }); return 'PR merged.' })} disabled={!workspace || !can('canMergePr') || !mergePrNumber} />
            </div>
          </Panel>

          <Panel title="⑨ Deploy">
            {deployBlocker
              ? <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300"><span className="font-medium">Deploy disabled: </span>{deployBlocker}</div>
              : (
                <>
                  <p className="mb-2 text-xs text-slate-500">Confirmation must match: <span className="font-mono text-slate-300">{deployPhrase}</span></p>
                  <div className="flex gap-2">
                    <input value={deployConfirm} onChange={(e) => setDeployConfirm(e.target.value)} placeholder={deployPhrase} className="input" />
                    <Button label="Deploy" icon={Rocket} onClick={() => workspace && runAction('deploy', async () => { const data = await api<{ output?: string }>(`/api/admin/repo-workbench/${workspace.id}/deploy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation: deployConfirm, confirm: true }) }); setLogs(data.output || ''); return 'Deploy finished.' })} disabled={!workspace || !can('canDeploy') || deployConfirm !== deployPhrase} />
                  </div>
                </>
              )
            }
          </Panel>

          <section>
            <button onClick={() => setOpenLogs((v) => !v)} className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
              <span>Logs</span><ChevronDown className={`h-4 w-4 transition ${openLogs ? 'rotate-180' : ''}`} />
            </button>
            {openLogs && <pre className="mt-2 max-h-96 overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 text-xs text-slate-300">{logs || 'No logs yet.'}</pre>}
          </section>
        </main>
      </div>

      {busy && <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg border border-cyan-400/20 bg-slate-950 px-4 py-3 text-sm text-cyan-100 shadow-xl"><Loader2 className="h-4 w-4 animate-spin" /> {busy}</div>}
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4"><h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>{children}</section>
}

function Button({ label, icon: Icon, onClick, disabled, busy }: { label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; onClick: () => unknown; disabled?: boolean; busy?: boolean }) {
  return <button onClick={onClick} disabled={disabled || busy} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}{label}</button>
}

function StatusPill({ label, ok }: { label: string; ok: boolean }) {
  return <div className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs ${ok ? 'bg-emerald-500/10 text-emerald-200' : 'bg-amber-500/10 text-amber-200'}`}>{ok ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}{label}</div>
}

function Alert({ tone, text }: { tone: 'success' | 'error'; text: string }) {
  return <div className={`rounded-lg border p-3 text-sm ${tone === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-red-500/20 bg-red-500/10 text-red-200'}`}>{text}</div>
}
