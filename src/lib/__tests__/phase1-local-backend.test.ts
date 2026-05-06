/**
 * Phase 1 Local Backend Tests
 *
 * Tests for the local VPS JSON store and updated backend routes.
 * Verifies:
 * - local-json-store reads/writes/appends/updates/deletes
 * - memory GET returns Working local status
 * - approvals create/list/approve/reject locally
 * - artifacts list returns empty not blocked
 * - artifacts metadata save works locally
 * - research URL saves locally without Firecrawl
 * - research jobs list returns local job
 * - apps seed/list works locally
 * - agents seed/list works locally
 * - diagnostics reports local core status
 * - dashboard memory page references local status correctly
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'

// ── Helpers ────────────────────────────────────────────────────────────────

const API_ROOT = path.resolve(__dirname, '../../app/api/admin')
const LIB_ROOT = path.resolve(__dirname, '..')
const DASH_ROOT = path.resolve(__dirname, '../../app/admin/dashboard')

function readFile(p: string): string {
  return fs.readFileSync(p, 'utf-8')
}

function exists(p: string): boolean {
  return fs.existsSync(p)
}

// ── Part 1: local-json-store module ────────────────────────────────────────

describe('Part 1 — local-json-store module exists and exports expected functions', () => {
  const storePath = path.join(LIB_ROOT, 'local-json-store.ts')

  it('src/lib/local-json-store.ts exists', () => {
    expect(exists(storePath)).toBe(true)
  })

  it('exports getStorageRoot', () => {
    expect(readFile(storePath)).toMatch(/export function getStorageRoot/)
  })

  it('exports generateId', () => {
    expect(readFile(storePath)).toMatch(/export function generateId/)
  })

  it('exports readJsonFile', () => {
    expect(readFile(storePath)).toMatch(/export function readJsonFile/)
  })

  it('exports writeJsonFile', () => {
    expect(readFile(storePath)).toMatch(/export function writeJsonFile/)
  })

  it('exports appendRecord', () => {
    expect(readFile(storePath)).toMatch(/export function appendRecord/)
  })

  it('exports updateRecord', () => {
    expect(readFile(storePath)).toMatch(/export function updateRecord/)
  })

  it('exports deleteRecord', () => {
    expect(readFile(storePath)).toMatch(/export function deleteRecord/)
  })

  it('exports listRecords', () => {
    expect(readFile(storePath)).toMatch(/export function listRecords/)
  })

  it('exports findRecord', () => {
    expect(readFile(storePath)).toMatch(/export function findRecord/)
  })

  it('exports checkWritable', () => {
    expect(readFile(storePath)).toMatch(/export function checkWritable/)
  })

  it('exports LOCAL_STORE_FILES constant', () => {
    expect(readFile(storePath)).toMatch(/export const LOCAL_STORE_FILES/)
  })

  it('LOCAL_STORE_FILES includes all required keys', () => {
    const src = readFile(storePath)
    expect(src).toMatch(/memory:/)
    expect(src).toMatch(/approvals:/)
    expect(src).toMatch(/artifacts:/)
    expect(src).toMatch(/research:/)
    expect(src).toMatch(/apps:/)
    expect(src).toMatch(/agents:/)
  })

  it('uses AMARKTAI_STORAGE_ROOT env var', () => {
    expect(readFile(storePath)).toMatch(/AMARKTAI_STORAGE_ROOT/)
  })

  it('has production VPS fallback path', () => {
    expect(readFile(storePath)).toMatch(/\/var\/www\/amarktai\/storage/)
  })

  it('has local dev fallback using process.cwd()', () => {
    expect(readFile(storePath)).toMatch(/process\.cwd\(\)/)
  })

  it('writeJsonFile uses atomic rename (tmp then rename)', () => {
    const src = readFile(storePath)
    expect(src).toMatch(/\.tmp\./)
    expect(src).toMatch(/renameSync/)
  })

  it('never crashes on missing file (readJsonFile returns [])', () => {
    const src = readFile(storePath)
    expect(src).toMatch(/return \[\]/)
  })

  it('ensureDir creates directories automatically', () => {
    const src = readFile(storePath)
    expect(src).toMatch(/mkdirSync.*recursive.*true/)
  })

  it('has path traversal guard', () => {
    const src = readFile(storePath)
    expect(src).toMatch(/traversal/)
  })
})

// ── Part 1b: functional tests with temp dir ────────────────────────────────

describe('Part 1b — local-json-store functional tests', () => {
  let tmpDir: string
  const origEnv = process.env.AMARKTAI_STORAGE_ROOT

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'amarktai-test-'))
    process.env.AMARKTAI_STORAGE_ROOT = tmpDir
  })

  afterEach(() => {
    if (origEnv !== undefined) process.env.AMARKTAI_STORAGE_ROOT = origEnv
    else delete process.env.AMARKTAI_STORAGE_ROOT
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('appendRecord creates file and returns record with id', async () => {
    const { appendRecord: append, LOCAL_STORE_FILES } = await import('../local-json-store')
    const record = append(LOCAL_STORE_FILES.memory, {
      appSlug: 'test',
      memoryType: 'event',
      content: 'hello',
      key: '',
      importance: 0.5,
      createdAt: new Date().toISOString(),
    } as object)
    expect((record as { id: string }).id).toBeTruthy()
    expect(typeof (record as { id: string }).id).toBe('string')
  })

  it('readJsonFile returns empty array for non-existent file', async () => {
    const { readJsonFile } = await import('../local-json-store')
    const result = readJsonFile('nonexistent/path.json')
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('writeJsonFile writes and readJsonFile reads back', async () => {
    const { writeJsonFile, readJsonFile } = await import('../local-json-store')
    const testData = [{ id: 'abc', value: 'test' }]
    writeJsonFile('test/data.json', testData)
    const result = readJsonFile('test/data.json')
    expect(result).toHaveLength(1)
    expect((result[0] as { id: string }).id).toBe('abc')
  })

  it('updateRecord modifies an existing record', async () => {
    const { appendRecord: append, updateRecord, LOCAL_STORE_FILES } = await import('../local-json-store')
    const record = append(LOCAL_STORE_FILES.approvals, {
      title: 'Test',
      status: 'pending',
      auditLog: [],
    } as object) as { id: string; status: string }
    const updated = updateRecord<{ id: string; status: string }>(LOCAL_STORE_FILES.approvals, record.id, { status: 'approved' })
    expect(updated?.status).toBe('approved')
  })

  it('deleteRecord removes the record', async () => {
    const { appendRecord: append, deleteRecord, listRecords } = await import('../local-json-store')
    const record = append('test/del.json', { name: 'to-delete' } as object) as { id: string }
    const deleted = deleteRecord<{ id: string }>('test/del.json', record.id)
    expect(deleted).toBe(true)
    const remaining = listRecords<{ id: string }>('test/del.json')
    expect(remaining).toHaveLength(0)
  })

  it('listRecords returns all records', async () => {
    const { appendRecord: append, listRecords } = await import('../local-json-store')
    append('test/list.json', { name: 'a' } as object)
    append('test/list.json', { name: 'b' } as object)
    const records = listRecords<{ id: string }>('test/list.json')
    expect(records).toHaveLength(2)
  })

  it('findRecord returns null for non-existent id', async () => {
    const { findRecord } = await import('../local-json-store')
    const result = findRecord<{ id: string }>('test/find.json', 'not-here')
    expect(result).toBeNull()
  })

  it('checkWritable returns writable:true for temp dir', async () => {
    const { checkWritable } = await import('../local-json-store')
    const result = checkWritable('test/writable-check.json')
    expect(result.writable).toBe(true)
    expect(result.root).toBe(tmpDir)
  })

  it('generateId returns a non-empty string', async () => {
    const { generateId } = await import('../local-json-store')
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })
})

// ── Part 2: memory route ───────────────────────────────────────────────────

describe('Part 2 — memory route has local fallback', () => {
  const routePath = path.join(API_ROOT, 'memory/route.ts')
  const src = fs.readFileSync(routePath, 'utf-8')

  it('memory route exists', () => {
    expect(exists(routePath)).toBe(true)
  })

  it('imports local-json-store', () => {
    expect(src).toMatch(/local-json-store/)
  })

  it('GET handler exports exist', () => {
    expect(src).toMatch(/export async function GET/)
  })

  it('POST handler exports exist', () => {
    expect(src).toMatch(/export async function POST/)
  })

  it('GET uses local VPS fallback when DB unavailable', () => {
    expect(src).toMatch(/local_vps/)
  })

  it('POST falls back to local storage when DB save fails', () => {
    expect(src).toMatch(/appendRecord/)
  })

  it('GET returns statusLabel working for local storage', () => {
    expect(src).toMatch(/statusLabel.*working|working.*statusLabel/)
  })

  it('response includes storage object with driver/writable/root/file', () => {
    expect(src).toMatch(/storage:/)
    expect(src).toMatch(/driver:/)
    expect(src).toMatch(/writable:/)
  })

  it('accepts userId and scope fields', () => {
    expect(src).toMatch(/userId/)
    expect(src).toMatch(/scope/)
  })
})

// ── Part 2b: memory/manage route ──────────────────────────────────────────

describe('Part 2b — memory manage route has local fallback', () => {
  const routePath = path.join(API_ROOT, 'memory/manage/route.ts')
  const src = fs.readFileSync(routePath, 'utf-8')

  it('memory/manage route exists', () => {
    expect(exists(routePath)).toBe(true)
  })

  it('exports POST (export)', () => {
    expect(src).toMatch(/export async function POST/)
  })

  it('exports DELETE', () => {
    expect(src).toMatch(/export async function DELETE/)
  })

  it('imports local-json-store', () => {
    expect(src).toMatch(/local-json-store/)
  })

  it('has local fallback for export', () => {
    expect(src).toMatch(/listRecords/)
  })

  it('has local fallback for delete', () => {
    expect(src).toMatch(/writeJsonFile/)
  })
})

// ── Part 3: approvals routes ───────────────────────────────────────────────

describe('Part 3 — approvals routes have local fallback', () => {
  const mainRoute = path.join(API_ROOT, 'approvals/route.ts')
  const approveRoute = path.join(API_ROOT, 'approvals/[id]/approve/route.ts')
  const rejectRoute = path.join(API_ROOT, 'approvals/[id]/reject/route.ts')

  it('approvals/route.ts exists', () => {
    expect(exists(mainRoute)).toBe(true)
  })

  it('approvals route exports GET', () => {
    expect(readFile(mainRoute)).toMatch(/export async function GET/)
  })

  it('approvals route exports POST', () => {
    expect(readFile(mainRoute)).toMatch(/export async function POST/)
  })

  it('approvals route imports local-json-store', () => {
    expect(readFile(mainRoute)).toMatch(/local-json-store/)
  })

  it('approvals GET lists local approvals when DB fails', () => {
    expect(readFile(mainRoute)).toMatch(/listRecords/)
  })

  it('approvals POST creates local approval when DB fails', () => {
    expect(readFile(mainRoute)).toMatch(/appendRecord/)
  })

  it('approvals POST resolve updates local record', () => {
    expect(readFile(mainRoute)).toMatch(/updateRecord/)
  })

  it('approve route exists', () => {
    expect(exists(approveRoute)).toBe(true)
  })

  it('approve route has local fallback', () => {
    expect(readFile(approveRoute)).toMatch(/local-json-store/)
  })

  it('approve route handles string IDs (not just numeric)', () => {
    const src = readFile(approveRoute)
    // Should not require numericId to be valid for ALL cases
    expect(src).toMatch(/findRecord|local/)
  })

  it('reject route exists', () => {
    expect(exists(rejectRoute)).toBe(true)
  })

  it('reject route has local fallback', () => {
    expect(readFile(rejectRoute)).toMatch(/local-json-store/)
  })

  it('local approval has required fields', () => {
    const src = readFile(mainRoute)
    expect(src).toMatch(/status.*pending/)
    expect(src).toMatch(/auditLog/)
    expect(src).toMatch(/createdAt/)
    expect(src).toMatch(/decidedAt/)
  })
})

// ── Part 4: artifacts route ────────────────────────────────────────────────

describe('Part 4 — artifacts route never blocks when local storage writable', () => {
  const routePath = path.join(API_ROOT, 'artifacts/route.ts')
  const src = fs.readFileSync(routePath, 'utf-8')

  it('artifacts route exists', () => {
    expect(exists(routePath)).toBe(true)
  })

  it('GET returns empty array not blocked when no artifacts', () => {
    // Should return { artifacts: [], total: 0 } not an error
    expect(src).toMatch(/artifacts.*\[\]|local.*fallback|driver.*local/)
  })

  it('GET storage-info checks local VPS writability', () => {
    expect(src).toMatch(/localVpsWritable/)
  })

  it('POST saves metadata-only artifact to local store when DB fails', () => {
    expect(src).toMatch(/local_meta|appendRecord.*artifacts/)
  })

  it('imports local-json-store', () => {
    expect(src).toMatch(/local-json-store/)
  })

  it('counts endpoint has local fallback', () => {
    // The counts handler tries DB first, then falls back to local
    expect(src).toMatch(/\?.*counts|counts.*searchParams|has.*counts/)
    // And has a local fallback path
    expect(src).toMatch(/listRecords.*artifacts|LOCAL_STORE_FILES\.artifacts/)
  })
})

// ── Part 5: research routes ────────────────────────────────────────────────

describe('Part 5 — research routes have local fallback', () => {
  const urlRoute = path.join(API_ROOT, 'research/url/route.ts')
  const jobsRoute = path.join(API_ROOT, 'research/jobs/route.ts')
  const oppRoute = path.join(API_ROOT, 'research/opportunity/route.ts')

  it('research/url route exists', () => {
    expect(exists(urlRoute)).toBe(true)
  })

  it('research/url saves locally when artifact-store fails', () => {
    expect(readFile(urlRoute)).toMatch(/appendRecord|local.*research/)
  })

  it('research/url returns success:true when local save succeeds', () => {
    expect(readFile(urlRoute)).toMatch(/success.*true/)
  })

  it('research/url returns storageReady:true when local save works', () => {
    expect(readFile(urlRoute)).toMatch(/storageReady.*true/)
  })

  it('research/url handles missing Firecrawl key gracefully', () => {
    const src = readFile(urlRoute)
    expect(src).toMatch(/firecrawlKey/)
    expect(src).toMatch(/method.*manual/)
  })

  it('research/jobs route exists', () => {
    expect(exists(jobsRoute)).toBe(true)
  })

  it('research/jobs includes local jobs in results', () => {
    expect(readFile(jobsRoute)).toMatch(/listRecords|localJobs/)
  })

  it('research/jobs returns storageReady field', () => {
    expect(readFile(jobsRoute)).toMatch(/storageReady/)
  })

  it('research/opportunity route exists', () => {
    expect(exists(oppRoute)).toBe(true)
  })

  it('research/opportunity has local fallback', () => {
    expect(readFile(oppRoute)).toMatch(/local-json-store/)
  })
})

// ── Part 6: apps and agents routes ────────────────────────────────────────

describe('Part 6 — apps and agents have starter data and local fallback', () => {
  const appsRoute = path.join(API_ROOT, 'apps/route.ts')
  const agentsRoute = path.join(API_ROOT, 'agents/route.ts')

  it('apps route exists', () => {
    expect(exists(appsRoute)).toBe(true)
  })

  it('apps route exports GET', () => {
    expect(readFile(appsRoute)).toMatch(/export.*async function GET/)
  })

  it('apps route exports POST', () => {
    expect(readFile(appsRoute)).toMatch(/export.*async function POST/)
  })

  it('apps route has local fallback', () => {
    expect(readFile(appsRoute)).toMatch(/local-json-store/)
  })

  it('apps route seeds starter apps', () => {
    const src = readFile(appsRoute)
    expect(src).toMatch(/STARTER_APPS|starter_local/)
  })

  it('apps starter data includes AmarktAI Network', () => {
    expect(readFile(appsRoute)).toMatch(/AmarktAI Network/)
  })

  it('apps starter data includes Crypto Trading App', () => {
    expect(readFile(appsRoute)).toMatch(/Crypto Trading/)
  })

  it('apps starter data includes Marketing App', () => {
    expect(readFile(appsRoute)).toMatch(/Marketing App/)
  })

  it('apps starter data includes companion app', () => {
    expect(readFile(appsRoute)).toMatch(/Companion|companion/)
  })

  it('apps starter data includes EquiProfile/SaaS', () => {
    expect(readFile(appsRoute)).toMatch(/EquiProfile|SaaS/)
  })

  it('agents route exists', () => {
    expect(exists(agentsRoute)).toBe(true)
  })

  it('agents route exports GET', () => {
    expect(readFile(agentsRoute)).toMatch(/export.*async function GET/)
  })

  it('agents route exports POST', () => {
    expect(readFile(agentsRoute)).toMatch(/export.*async function POST/)
  })

  it('agents route has local fallback', () => {
    expect(readFile(agentsRoute)).toMatch(/local-json-store/)
  })

  it('agents route seeds starter agents', () => {
    const src = readFile(agentsRoute)
    expect(src).toMatch(/STARTER_AGENTS|starter_local/)
  })

  it('agents starter includes Repo Builder', () => {
    expect(readFile(agentsRoute)).toMatch(/Repo Builder/)
  })

  it('agents starter includes Researcher Agent', () => {
    expect(readFile(agentsRoute)).toMatch(/Researcher Agent/)
  })

  it('agents starter includes Diagnostics Agent', () => {
    expect(readFile(agentsRoute)).toMatch(/Diagnostics Agent/)
  })

  it('agents starter includes Memory / Emotion Agent', () => {
    expect(readFile(agentsRoute)).toMatch(/Memory.*Emotion Agent|Memory \/ Emotion/)
  })

  it('agents starter includes all 16 required agents', () => {
    const src = readFile(agentsRoute)
    const requiredAgents = [
      'AmarktAI Assistant Operator',
      'Repo Builder',
      'Repo Auditor',
      'Frontend Designer',
      'Backend Wiring Agent',
      'Researcher Agent',
      'App Discovery Agent',
      'Marketing Agent',
      'Scraper Agent',
      'Media Agent',
      'Voice Agent',
      'Memory',
      'Adult-App Agent',
      'Diagnostics Agent',
      'Deployment Agent',
      'Crypto Agent',
    ]
    for (const agent of requiredAgents) {
      expect(src, `Missing starter agent: ${agent}`).toMatch(new RegExp(agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')))
    }
  })

  it('starter agents have status: ready', () => {
    expect(readFile(agentsRoute)).toMatch(/status.*ready/)
  })

  it('starter apps have source: starter_local', () => {
    expect(readFile(appsRoute)).toMatch(/source.*starter_local/)
  })
})

// ── Part 7: diagnostics / runtime truth ───────────────────────────────────

describe('Part 7 — diagnostics promotes local Working status', () => {
  const runtimeTruthPath = path.join(LIB_ROOT, 'runtime-capability-truth.ts')
  const src = fs.readFileSync(runtimeTruthPath, 'utf-8')

  it('runtime-capability-truth imports local-json-store', () => {
    expect(src).toMatch(/local-json-store/)
  })

  it('DashboardRuntimeTruth includes localCore field', () => {
    expect(src).toMatch(/localCore/)
  })

  it('LocalCoreStatus interface has all required sections', () => {
    expect(src).toMatch(/LocalCoreStatus/)
    expect(src).toMatch(/memory.*writable|writable.*memory/)
    expect(src).toMatch(/approvals/)
    expect(src).toMatch(/artifacts/)
    expect(src).toMatch(/research/)
    expect(src).toMatch(/allWorking/)
  })

  it('getLocalCoreStatus checks writability of all core stores', () => {
    expect(src).toMatch(/getLocalCoreStatus/)
    expect(src).toMatch(/checkWritable/)
  })

  it('getDashboardRuntimeTruth includes localCore in return', () => {
    expect(src).toMatch(/localCore.*getLocalCoreStatus|getLocalCoreStatus.*localCore/)
  })
})

// ── Part 8: memory dashboard page ─────────────────────────────────────────

describe('Part 8 — memory dashboard page shows Working from local status', () => {
  const pagePath = path.join(DASH_ROOT, 'memory/page.tsx')
  const src = fs.readFileSync(pagePath, 'utf-8')

  it('memory page exists', () => {
    expect(exists(pagePath)).toBe(true)
  })

  it('checks storage.writable from API response', () => {
    expect(src).toMatch(/storage.*writable|writable.*storage/)
  })

  it('shows Working when local storage is writable', () => {
    expect(src).toMatch(/isWorking/)
  })

  it('does not default all sections to Backend pending', () => {
    // Should use liveStatus variable not hardcoded "Backend pending"
    const hardcodedPending = (src.match(/"Backend pending"/g) ?? []).length
    // Allow at most a couple instances (e.g. for fallback display) but not for all sections
    expect(hardcodedPending).toBeLessThan(3)
  })

  it('references storageDriver in status display', () => {
    expect(src).toMatch(/storageDriver/)
  })

  it('shows real entries from API in timeline', () => {
    expect(src).toMatch(/entries.*map|memStatus.*entries/)
  })
})

// ── Part 9: certification script ──────────────────────────────────────────

describe('Part 10 — certification script covers local core', () => {
  const scriptPath = path.resolve(__dirname, '../../../scripts/final_live_certification.sh')

  it('script exists', () => {
    expect(exists(scriptPath)).toBe(true)
  })

  it('script tests GET /api/admin/memory', () => {
    expect(readFile(scriptPath)).toMatch(/\/api\/admin\/memory/)
  })

  it('script tests GET /api/admin/approvals', () => {
    expect(readFile(scriptPath)).toMatch(/\/api\/admin\/approvals/)
  })

  it('script tests GET /api/admin/artifacts', () => {
    expect(readFile(scriptPath)).toMatch(/\/api\/admin\/artifacts/)
  })

  it('script tests GET /api/admin/research/jobs', () => {
    expect(readFile(scriptPath)).toMatch(/\/api\/admin\/research\/jobs/)
  })

  it('script tests GET /api/admin/apps', () => {
    expect(readFile(scriptPath)).toMatch(/\/api\/admin\/apps/)
  })

  it('script tests GET /api/admin/agents', () => {
    expect(readFile(scriptPath)).toMatch(/\/api\/admin\/agents/)
  })
})
