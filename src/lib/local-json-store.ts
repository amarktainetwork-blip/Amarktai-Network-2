/**
 * @module local-json-store
 * @description Shared local VPS JSON storage helper for AmarktAI Network.
 *
 * Provides atomic read/write operations on JSON files stored on the local VPS.
 * This is the primary storage fallback for all core features when a database
 * is unavailable.
 *
 * Storage root resolution order:
 *   1. process.env.AMARKTAI_STORAGE_ROOT
 *   2. /var/www/amarktai/storage (production VPS default)
 *   3. process.cwd()/storage only when AMARKTAI_ALLOW_DEV_STORAGE_FALLBACK=true outside production
 *
 * Server-side only — do NOT import from client components.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { getUnifiedStorageRoot, resolveStoragePath } from '@/lib/storage-root'

// ── Storage root ─────────────────────────────────────────────────────────────

export function getStorageRoot(): string {
  return getUnifiedStorageRoot()
}

// ── ID generation ─────────────────────────────────────────────────────────────

export function generateId(): string {
  return crypto.randomUUID()
}

// ── Directory helpers ────────────────────────────────────────────────────────

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true })
}

function resolveFilePath(relPath: string): string {
  return resolveStoragePath(relPath)
}

// ── Core read/write ──────────────────────────────────────────────────────────

/**
 * Read a JSON file, returning an empty array if the file doesn't exist.
 * Never throws on missing file.
 */
export function readJsonFile<T = Record<string, unknown>>(relPath: string): T[] {
  try {
    const fullPath = resolveFilePath(relPath)
    if (!fs.existsSync(fullPath)) return []
    const raw = fs.readFileSync(fullPath, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Write records to a JSON file atomically (write to tmp then rename).
 * Creates parent directories automatically.
 */
export function writeJsonFile<T = Record<string, unknown>>(relPath: string, records: T[]): boolean {
  try {
    const fullPath = resolveFilePath(relPath)
    ensureDir(path.dirname(fullPath))
    const tmp = `${fullPath}.tmp.${Date.now()}`
    fs.writeFileSync(tmp, JSON.stringify(records, null, 2), 'utf-8')
    fs.renameSync(tmp, fullPath)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a local storage path is writable. Returns { writable, root, file }.
 */
export function checkWritable(relPath: string): { writable: boolean; root: string; file: string } {
  const root = getStorageRoot()
  try {
    const fullPath = resolveFilePath(relPath)
    ensureDir(path.dirname(fullPath))
    const testPath = `${fullPath}.wtest.${Date.now()}`
    fs.writeFileSync(testPath, '{}')
    fs.unlinkSync(testPath)
    return { writable: true, root, file: relPath }
  } catch {
    return { writable: false, root, file: relPath }
  }
}

// ── CRUD helpers ─────────────────────────────────────────────────────────────

/**
 * Append a new record to a JSON file. The record must have an `id` field.
 * Generates an id if not provided.
 */
export function appendRecord<T extends object>(relPath: string, record: T): T & { id: string } {
  const records = readJsonFile<T & { id: string }>(relPath)
  const id = (record as { id?: string }).id ?? generateId()
  const withId = { ...record, id } as T & { id: string }
  records.push(withId)
  writeJsonFile(relPath, records)
  return withId
}

/**
 * Update a record by id. Returns the updated record or null if not found.
 */
export function updateRecord<T extends { id: string }>(
  relPath: string,
  id: string,
  updates: Partial<Omit<T, 'id'>>,
): (T & { id: string }) | null {
  const records = readJsonFile<T>(relPath)
  const idx = records.findIndex((r) => (r as { id: string }).id === id)
  if (idx === -1) return null
  const updated = { ...records[idx], ...updates } as T & { id: string }
  records[idx] = updated
  writeJsonFile(relPath, records)
  return updated
}

/**
 * Delete a record by id. Returns true if deleted.
 */
export function deleteRecord<T extends { id: string }>(relPath: string, id: string): boolean {
  const records = readJsonFile<T>(relPath)
  const filtered = records.filter((r) => (r as { id: string }).id !== id)
  if (filtered.length === records.length) return false
  return writeJsonFile(relPath, filtered)
}

/**
 * List records with optional filtering.
 */
export function listRecords<T extends { id: string }>(
  relPath: string,
  filter?: (record: T) => boolean,
): T[] {
  const records = readJsonFile<T>(relPath)
  return filter ? records.filter(filter) : records
}

/**
 * Find a single record by id.
 */
export function findRecord<T extends { id: string }>(relPath: string, id: string): T | null {
  const records = readJsonFile<T>(relPath)
  return records.find((r) => (r as { id: string }).id === id) ?? null
}

// ── Storage file paths ───────────────────────────────────────────────────────

export const LOCAL_STORE_FILES = {
  memory: 'memory/memory.json',
  approvals: 'approvals/approvals.json',
  artifacts: 'artifacts/artifacts.json',
  research: 'research/research-jobs.json',
  apps: 'apps/apps.json',
  agents: 'agents/agents.json',
  jobs: 'jobs/jobs.json',
  mediaJobs: 'jobs/media-jobs.json',
  executions: 'jobs/executions.json',
  creativeProjects: 'creative/projects.json',
  brandKits: 'creative/brand-kits.json',
  avatars: 'creative/avatars.json',
  videoProjects: 'creative/video-projects.json',
  connectedApps: 'connected-apps/apps.json',
  connectedAppEvents: 'connected-apps/events.json',
  connectedAppCapabilityJobs: 'connected-apps/capability-jobs.json',
} as const
