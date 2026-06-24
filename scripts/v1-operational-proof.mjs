const baseUrl = (process.env.AMARKTAI_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const cookie = process.env.AMARKTAI_ADMIN_COOKIE || ''
const runLive = process.env.AMARKTAI_RUN_LIVE_PROOF === 'true'
const appSlug = process.env.AMARKTAI_PROOF_APP_SLUG || 'amarktai-network'

async function request(name, route, init = {}) {
  try {
    const response = await fetch(`${baseUrl}${route}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(60_000),
    })
    const contentType = response.headers.get('content-type') || ''
    const body = contentType.includes('application/json')
      ? await response.json().catch(() => null)
      : { contentType, bytes: Number(response.headers.get('content-length') || 0) }
    return { name, route, status: response.status, ok: response.ok, body }
  } catch (error) {
    return {
      name,
      route,
      status: 0,
      ok: false,
      body: {
        blocker: error instanceof Error ? error.message : 'Proof request failed.',
        setup: `Start or deploy AmarktAI at ${baseUrl}, then rerun this proof.`,
      },
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  baseUrl,
  appSlug,
  liveWorkflowsExecuted: runLive,
  checks: [],
}

report.checks.push(await request('health', '/api/health'))
report.checks.push(await request('route_matrix', '/api/admin/system/v1-brain-route-matrix'))
report.checks.push(await request('adult_matrix', `/api/admin/system/adult-capability-matrix?appSlug=${encodeURIComponent(appSlug)}`))
report.checks.push(await request('control_plane', `/api/admin/system/operational-control-plane?appSlug=${encodeURIComponent(appSlug)}`))

if (runLive) {
  report.checks.push(await request('creative_smoke', '/api/admin/system/live-creative-smoke-test', { method: 'POST' }))
  report.checks.push(await request('adult_text', '/api/brain/adult-text', {
    method: 'POST',
    body: JSON.stringify({
      appSlug,
      prompt: 'Write a romantic scene between two fictional consenting adults aged 28.',
    }),
  }))
  report.checks.push(await request('adult_image', '/api/brain/adult-image', {
    method: 'POST',
    body: JSON.stringify({
      appSlug,
      prompt: 'A fictional consenting adult couple, both aged 28, tasteful cinematic portrait.',
    }),
  }))
  report.checks.push(await request('tts', '/api/brain/tts', {
    method: 'POST',
    body: JSON.stringify({ appSlug, text: 'AmarktAI operational speech check.' }),
  }))
  report.checks.push(await request('short_video', '/api/brain/video-generate', {
    method: 'POST',
    body: JSON.stringify({ appSlug, prompt: 'A four second cinematic sunrise over Cape Town.', duration: 4 }),
  }))
  report.checks.push(await request('long_form_video', '/api/brain/video-generate', {
    method: 'POST',
    body: JSON.stringify({
      appSlug,
      prompt: 'Create a 30 second multi-scene product story for a vertical Instagram Reel.',
      duration: 30,
      aspectRatio: '9:16',
      multiScene: true,
    }),
  }))
  report.checks.push(await request('jobs_truth', '/api/admin/system/jobs'))
  report.checks.push(await request('artifacts_truth', '/api/admin/artifacts'))
}

console.log(JSON.stringify(report, null, 2))
if (report.checks.some((check) => !check.ok && ![202, 207, 403, 422, 503].includes(check.status))) {
  process.exitCode = 1
}
