import fs from 'fs/promises'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  GENX_AUDIO_MODELS,
  GENX_IMAGE_MODELS,
  GENX_TTS_MODELS,
  GENX_VIDEO_MODELS,
  getAdultCapabilityStatusAsync,
  getGenXStatusAsync,
  listGenXModels,
} from '@/lib/genx-client'
import { getProviderKey, isProviderConfigured } from '@/lib/provider-config'
import { getRepoWorkbenchStatus } from '@/lib/repo-workbench-status'
import { getQueueStatus } from '@/lib/job-queue'
import { verifyStorage } from '@/lib/storage-driver'
import { resolveWorkspacePath } from '@/lib/workspace-security'
import { getServiceKey } from '@/lib/service-vault'
import { prisma } from '@/lib/prisma'

type ReadinessStatus = 'PASS' | 'FAIL' | 'OPTIONAL' | 'DISABLED'

interface ReadinessCheck {
  key: string
  label: string
  status: ReadinessStatus
  evidence: string
  blocker: string | null
}

function check(
  key: string,
  label: string,
  status: ReadinessStatus,
  evidence: string,
  blocker: string | null = null,
): ReadinessCheck {
  return { key, label, status, evidence, blocker }
}

function hasCatalogModel(
  models: Array<{ id?: string; category?: string; capabilities?: string[] }>,
  category: string,
  fallbackIds: readonly string[],
): boolean {
  const fallbackSet = new Set(fallbackIds.map((id) => id.toLowerCase()))
  return models.some((model) => {
    const id = String(model.id ?? '').toLowerCase()
    const modelCategory = String(model.category ?? '').toLowerCase()
    const caps = (model.capabilities ?? []).map((cap) => String(cap).toLowerCase())
    return modelCategory === category || caps.some((cap) => cap.includes(category)) || fallbackSet.has(id)
  })
}

async function runWorkspaceCreateDeleteProbe(): Promise<{ ok: boolean; evidence: string; blocker: string | null }> {
  const tempPath = resolveWorkspacePath('repos', `.live-readiness-${process.pid}-${Date.now()}`)
  try {
    await fs.mkdir(tempPath, { recursive: false })
    await fs.writeFile(resolveWorkspacePath('repos', `${tempPath.split(/[\\/]/).pop()}`, 'probe.txt'), 'ok', 'utf8')
    await fs.rm(tempPath, { recursive: true, force: true })
    return { ok: true, evidence: 'Created and deleted a temporary Repo Workbench workspace under the configured root.', blocker: null }
  } catch (error) {
    await fs.rm(tempPath, { recursive: true, force: true }).catch(() => null)
    return {
      ok: false,
      evidence: 'Temporary Repo Workbench workspace probe failed.',
      blocker: error instanceof Error ? error.message : 'Workspace create/delete probe failed',
    }
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const checks: ReadinessCheck[] = []

  const [genx, repo, queue, storage, adult, githubKey, webdockKey] = await Promise.all([
    getGenXStatusAsync().catch((error) => ({
      configured: false,
      available: false,
      apiUrl: null,
      modelCount: 0,
      error: error instanceof Error ? error.message : 'GenX status failed',
    })),
    getRepoWorkbenchStatus().catch((error) => ({
      workspaceRoot: '',
      workspaceWritable: false,
      githubTokenConfigured: false,
      githubAuthenticated: false,
      canImport: false,
      canPatch: false,
      blockers: [error instanceof Error ? error.message : 'Repo Workbench status failed'],
      warnings: [],
    })),
    getQueueStatus().catch(() => ({ healthy: false, backendAvailable: false, counts: {} as Record<string, number> })),
    verifyStorage().catch((error) => ({
      configured: false,
      writable: false,
      persistent: false,
      driver: 'unknown',
      basePath: '',
      error: error instanceof Error ? error.message : 'Storage verification failed',
      missingSetup: ['Storage verification failed'],
    })),
    getAdultCapabilityStatusAsync().catch((error) => ({
      status: 'UNAVAILABLE' as const,
      supported: false,
      route: 'unavailable' as const,
      note: error instanceof Error ? error.message : 'Adult readiness failed',
      providers: [],
      blockers: ['Adult readiness failed'],
    })),
    getProviderKey('github'),
    getServiceKey('webdock', 'WEBDOCK_API_KEY'),
  ])

  const models = genx.available ? await listGenXModels().catch(() => []) : []
  const imageModelReady = genx.available && (hasCatalogModel(models, 'image', GENX_IMAGE_MODELS) || models.length === 0)
  const videoModelReady = genx.available && hasCatalogModel(models, 'video', GENX_VIDEO_MODELS)
  const voiceModelReady = genx.available && hasCatalogModel(models, 'voice', GENX_TTS_MODELS)
  const musicModelReady = genx.available && hasCatalogModel(models, 'audio', GENX_AUDIO_MODELS)
  const workspaceProbe = await runWorkspaceCreateDeleteProbe()

  const [openai, groq, gemini, replicate, suno, together, qwen] = await Promise.all([
    isProviderConfigured('openai'),
    isProviderConfigured('groq'),
    isProviderConfigured('gemini'),
    isProviderConfigured('replicate'),
    isProviderConfigured('suno'),
    isProviderConfigured('together'),
    isProviderConfigured('qwen'),
  ])

  const db = await prisma.$queryRaw`SELECT 1`
    .then(() => ({ ok: true, blocker: null as string | null }))
    .catch((error) => ({ ok: false, blocker: error instanceof Error ? error.message : 'Database query failed' }))
  const adultBlocker = 'blockers' in adult && Array.isArray(adult.blockers)
    ? adult.blockers.join('; ')
    : 'Adult gates are not all passed.'

  const healthUrl = new URL('/api/health/ping', request.url)
  const health = await fetch(healthUrl, { method: 'GET', cache: 'no-store' })
    .then((res) => ({ ok: res.ok, evidence: `GET /api/health/ping returned ${res.status}` }))
    .catch((error) => ({ ok: false, evidence: error instanceof Error ? error.message : 'Health endpoint fetch failed' }))

  checks.push(
    check('genx_key', 'GenX key configured', genx.configured ? 'PASS' : 'FAIL', genx.configured ? 'GenX key found in service vault/env.' : 'No usable GenX key found.', genx.configured ? null : 'Configure GENX_API_KEY in Settings.'),
    check('genx_live', 'GenX live status', genx.available ? 'PASS' : 'FAIL', genx.available ? 'GenX catalogue/status endpoint responded.' : (genx.error ?? 'GenX is not reachable.'), genx.available ? null : 'GenX must respond before gateway-backed media/model routing can be verified.'),
    check('genx_catalog', 'GenX model catalogue count', genx.available && (genx.modelCount ?? models.length) > 0 ? 'PASS' : 'FAIL', `${genx.modelCount ?? models.length} model(s) reported.`, genx.available ? null : 'GenX unavailable, catalogue cannot be trusted.'),
    check('github_pat', 'GitHub PAT configured', githubKey ? 'PASS' : 'FAIL', githubKey ? 'GitHub token found in service vault/env.' : 'No usable GitHub token found.', githubKey ? null : 'Configure GitHub token in Settings or Repo Workbench.'),
    check('workspace_writable', 'Workspace root exists/writable', repo.workspaceWritable ? 'PASS' : 'FAIL', repo.workspaceRoot ? `Workspace root: ${repo.workspaceRoot}` : 'Workspace root unavailable.', repo.workspaceWritable ? null : 'Repo workspace root is not writable.'),
    check('repo_temp_workspace', 'Repo Workbench temp workspace create/delete', workspaceProbe.ok ? 'PASS' : 'FAIL', workspaceProbe.evidence, workspaceProbe.blocker),
    check('image_provider', 'Image generation provider available', imageModelReady || openai || gemini || together || qwen ? 'PASS' : 'FAIL', imageModelReady ? 'GenX image model available.' : 'Direct image-capable fallback provider status checked.', imageModelReady || openai || gemini || together || qwen ? null : 'Configure GenX image model access or an image-capable fallback provider.'),
    check('video_provider', 'Video generation provider available', videoModelReady ? 'PASS' : 'DISABLED', videoModelReady ? 'GenX video model found in live catalogue.' : 'No live GenX video model confirmed.', videoModelReady ? null : 'Video remains disabled until a live video model/provider, async polling, and artifact flow are verified.'),
    check('voice_provider', 'Voice provider available', voiceModelReady || openai || groq || gemini ? 'PASS' : 'FAIL', voiceModelReady ? 'GenX voice/TTS model found.' : 'Checked direct TTS provider fallback keys.', voiceModelReady || openai || groq || gemini ? null : 'Configure GenX voice model or direct TTS provider.'),
    check('music_provider', 'Music provider available', musicModelReady || suno || replicate ? 'PASS' : 'DISABLED', musicModelReady ? 'GenX audio/music model found.' : suno || replicate ? 'Direct music provider key configured; live generation still needs endpoint verification.' : 'No live music provider confirmed.', musicModelReady || suno || replicate ? null : 'Music stays disabled until GenX/Lyria/Suno/Replicate route is wired and verified.'),
    check('adult_readiness', 'Adult provider test status', adult.status === 'READY' ? 'PASS' : 'DISABLED', adult.note ?? adult.status, adult.status === 'READY' ? null : adultBlocker),
    check('artifacts_storage', 'Artifacts storage writable', storage.configured && storage.writable ? 'PASS' : 'FAIL', `driver=${storage.driver}; root=${storage.basePath}; persistent=${storage.persistent}`, storage.configured && storage.writable ? null : (storage.error ?? ((storage.missingSetup ?? []).join('; ') || 'Artifact storage is not configured/writable.'))),
    check('job_queue', 'Job queue available', queue.healthy ? 'PASS' : queue.backendAvailable ? 'OPTIONAL' : 'OPTIONAL', queue.backendAvailable ? `Queue backend available; counts=${JSON.stringify(queue.counts)}` : 'Redis/BullMQ queue unavailable; inline/non-queue flows may still run.', queue.healthy ? null : 'Queue is not fully healthy; heavy media jobs must remain gated.'),
    check('database', 'DB reachable', db.ok ? 'PASS' : 'FAIL', db.ok ? 'Database SELECT 1 succeeded.' : 'Database query failed.', db.blocker),
    check('health_ping', 'Health endpoint OK', health.ok ? 'PASS' : 'FAIL', health.evidence, health.ok ? null : 'GET /api/health/ping did not return OK.'),
    check('nginx_static', 'Nginx/static notes', 'OPTIONAL', process.env.NGINX_CONFIG_PATH ? `Configured NGINX_CONFIG_PATH=${process.env.NGINX_CONFIG_PATH}` : 'Nginx cannot be detected from the Next.js runtime; verify systemd/Nginx on VPS.', null),
    check('webdock', 'Webdock optional status', webdockKey ? 'OPTIONAL' : 'OPTIONAL', webdockKey ? 'Webdock key configured.' : 'Webdock not configured; VPS metrics can use local fallback where available.', null),
  )

  const overall: 'PASS' | 'FAIL' = checks.some((item) => item.status === 'FAIL') ? 'FAIL' : 'PASS'
  return NextResponse.json({
    overall,
    generatedAt: new Date().toISOString(),
    checks,
    counts: {
      pass: checks.filter((item) => item.status === 'PASS').length,
      fail: checks.filter((item) => item.status === 'FAIL').length,
      disabled: checks.filter((item) => item.status === 'DISABLED').length,
      optional: checks.filter((item) => item.status === 'OPTIONAL').length,
    },
  })
}
