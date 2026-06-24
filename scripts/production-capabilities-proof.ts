import { PRODUCTION_CAPABILITY_CONTRACTS } from '../src/lib/production-capability-contracts'
import { AI_CAPABILITY_TAXONOMY } from '../src/lib/brain/v1-capability-matrix'
import { ADULT_CAPABILITY_IDS } from '../src/lib/adult-app-capabilities'
import fs from 'node:fs'
import path from 'node:path'

const failures: string[] = []
const liveMode = process.argv.includes('--live')
const canonicalIds = new Set(AI_CAPABILITY_TAXONOMY.map((entry) => entry.id))
const contractIds = new Set(PRODUCTION_CAPABILITY_CONTRACTS.map((entry) => entry.id))

check(AI_CAPABILITY_TAXONOMY.length === 62, `Expected 62 canonical capabilities, found ${AI_CAPABILITY_TAXONOMY.length}.`)
check(ADULT_CAPABILITY_IDS.length === 6, `Expected 6 governed adult capabilities, found ${ADULT_CAPABILITY_IDS.length}.`)
check(PRODUCTION_CAPABILITY_CONTRACTS.length === 68, `Expected 68 production contracts, found ${PRODUCTION_CAPABILITY_CONTRACTS.length}.`)
check(contractIds.size === 68, 'Production capability IDs are not unique.')

for (const capability of PRODUCTION_CAPABILITY_CONTRACTS) {
  check(canonicalIds.has(capability.canonicalCapability), `${capability.id} does not reference canonical capability truth.`)
  check(Boolean(capability.endpoint), `${capability.id} has no operational endpoint or setup route.`)
  check(capability.inputContract.length > 0, `${capability.id} has no input contract.`)
  check(capability.outputContract.length > 0, `${capability.id} has no output contract.`)
  check(
    capability.liveProof.route === capability.endpoint
      || capability.action === 'configure'
      || capability.action === 'blocked'
      || capability.governedAdultCapability,
    `${capability.id} proof route diverges from its endpoint.`,
  )
  if (capability.action === 'run' || capability.action === 'queue') {
    check(
      capability.providerRoutes.some((route) => route.executable),
      `${capability.id} claims execution without an executable provider adapter.`,
    )
  }
}

const report: Record<string, unknown> = {
  generatedAt: new Date().toISOString(),
  mode: liveMode ? 'live' : 'contract',
  canonicalCapabilities: AI_CAPABILITY_TAXONOMY.length,
  governedAdultCapabilities: ADULT_CAPABILITY_IDS.length,
  productionCapabilities: PRODUCTION_CAPABILITY_CONTRACTS.length,
  runnable: PRODUCTION_CAPABILITY_CONTRACTS.filter((item) => item.action === 'run').length,
  queued: PRODUCTION_CAPABILITY_CONTRACTS.filter((item) => item.action === 'queue').length,
  needsInput: PRODUCTION_CAPABILITY_CONTRACTS.filter((item) => item.action === 'required_input').length,
  setupRequired: PRODUCTION_CAPABILITY_CONTRACTS.filter((item) => item.action === 'configure').length,
  policyBlocked: PRODUCTION_CAPABILITY_CONTRACTS.filter((item) => item.action === 'blocked').length,
  localState: localStateCounts(),
  capabilities: PRODUCTION_CAPABILITY_CONTRACTS.map((item) => ({
    capability: item.id,
    canonicalCapability: item.canonicalCapability,
    status: item.action,
    route: item.endpoint,
    providers: item.fallbackChain,
    artifactType: item.artifactType,
    proofExpectation: item.liveProof.expected,
  })),
  failures,
}

void main()

async function main() {
  if (liveMode) {
    report.live = await runLiveProof()
  }
  console.log(JSON.stringify(report, null, 2))
  if (failures.length) process.exitCode = 1
}

function check(condition: boolean, message: string) {
  if (!condition) failures.push(message)
}

function localStateCounts() {
  const storageRoot = process.env.AMARKTAI_STORAGE_ROOT
    || path.join(process.cwd(), '.amarktai-storage')
  return {
    note: 'Database, provider authentication, and media execution require --live on the deployed admin.',
    jobs: arrayLength(path.join(storageRoot, 'jobs/jobs.json')),
    mediaJobs: arrayLength(path.join(storageRoot, 'jobs/media-jobs.json')),
    executions: arrayLength(path.join(storageRoot, 'jobs/executions.json')),
    artifacts: arrayLength(path.join(storageRoot, 'artifacts/artifacts.json')),
  }
}

function arrayLength(file: string) {
  try {
    const value = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown
    return Array.isArray(value) ? value.length : 0
  } catch {
    return 0
  }
}

async function runLiveProof() {
  const baseUrl = process.env.AMARKTAI_PROOF_BASE_URL?.replace(/\/+$/, '')
  const cookie = process.env.AMARKTAI_PROOF_COOKIE
  if (!baseUrl || !cookie) {
    failures.push('Live mode requires AMARKTAI_PROOF_BASE_URL and AMARKTAI_PROOF_COOKIE.')
    return { started: false }
  }
  const headers = { Cookie: cookie, 'Content-Type': 'application/json' }
  const [contracts, providerSmoke, creativeSmoke, jobs, artifacts] = await Promise.all([
    requestJson(`${baseUrl}/api/admin/system/production-capabilities`, { headers }),
    requestJson(`${baseUrl}/api/admin/system/live-ai-smoke-tests`, { headers }),
    requestJson(`${baseUrl}/api/admin/system/live-creative-smoke-test`, { method: 'POST', headers }),
    requestJson(`${baseUrl}/api/admin/system/jobs`, { headers }),
    requestJson(`${baseUrl}/api/admin/artifacts?limit=200`, { headers }),
  ])
  const providerResults = Array.isArray(providerSmoke.body?.results) ? providerSmoke.body.results : []
  check(providerSmoke.ok && providerResults.length === 6, 'Live proof did not return all six provider smoke results.')
  check(providerResults.every((item: Record<string, unknown>) => item.status === 'pass'), 'At least one approved provider live smoke test did not pass.')
  check(contracts.ok && contracts.body?.total === 68, 'Live capability endpoint did not return 68 contracts.')
  check(creativeSmoke.ok, 'Live creative workflow smoke test failed.')
  return {
    started: true,
    providerSmoke: providerSmoke.body,
    creativeSmoke: creativeSmoke.body,
    jobs: {
      ok: jobs.ok,
      count: Array.isArray(jobs.body?.jobs) ? jobs.body.jobs.length : null,
    },
    artifacts: {
      ok: artifacts.ok,
      count: Array.isArray(artifacts.body?.artifacts) ? artifacts.body.artifacts.length : null,
      previewable: Array.isArray(artifacts.body?.artifacts)
        ? artifacts.body.artifacts.filter((item: Record<string, unknown>) => item.previewUrl || item.downloadUrl).length
        : null,
    },
  }
}

async function requestJson(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, init)
    return {
      ok: response.ok,
      status: response.status,
      body: await response.json().catch(() => null) as Record<string, any> | null,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: { error: error instanceof Error ? error.message : 'Request failed.' },
    }
  }
}
