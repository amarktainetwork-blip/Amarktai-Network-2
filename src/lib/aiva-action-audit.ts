import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import { canAivaRunAction, getAivaActionPermission } from '@/lib/aiva-action-permissions'

const AUDIT_ROOT = process.env.AIVA_ACTION_AUDIT_ROOT || '/var/www/amarktai/repo/storage/aiva-action-audit'

export interface AivaActionAuditEntry {
  id: string
  timestamp: string
  actionId: string
  label: string | null
  allowed: boolean
  confirmed: boolean
  risk: string | null
  category: string | null
  status: 'recorded' | 'blocked' | 'approved_pending_executor'
  reason: string
  requestedBy: string
  payloadPreview: unknown
}

function safePreview(payload: unknown): unknown {
  const text = JSON.stringify(payload ?? {})
    .replace(/sk-[a-zA-Z0-9_-]+/g, '[REDACTED_KEY]')
    .replace(/ghp_[a-zA-Z0-9_]+/g, '[REDACTED_GITHUB_TOKEN]')
  return JSON.parse(text.slice(0, 5000) || '{}')
}

export async function auditAivaAction(input: {
  actionId: string
  confirmed: boolean
  requestedBy?: string
  payload?: unknown
}): Promise<AivaActionAuditEntry> {
  await fs.mkdir(AUDIT_ROOT, { recursive: true })
  const permission = getAivaActionPermission(input.actionId)
  const decision = canAivaRunAction(input.actionId, input.confirmed)
  const entry: AivaActionAuditEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    actionId: input.actionId,
    label: permission?.label ?? null,
    allowed: decision.allowed,
    confirmed: input.confirmed,
    risk: permission?.risk ?? null,
    category: permission?.category ?? null,
    status: decision.allowed ? 'approved_pending_executor' : 'blocked',
    reason: decision.reason,
    requestedBy: input.requestedBy ?? 'admin',
    payloadPreview: safePreview(input.payload),
  }
  const day = entry.timestamp.slice(0, 10)
  await fs.appendFile(path.join(AUDIT_ROOT, `${day}.jsonl`), `${JSON.stringify(entry)}\n`)
  return entry
}

export async function listAivaActionAudit(days = 7): Promise<AivaActionAuditEntry[]> {
  await fs.mkdir(AUDIT_ROOT, { recursive: true })
  const entries: AivaActionAuditEntry[] = []
  for (let index = 0; index < Math.max(1, Math.min(days, 90)); index += 1) {
    const day = new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const file = path.join(AUDIT_ROOT, `${day}.jsonl`)
    try {
      const raw = await fs.readFile(file, 'utf8')
      for (const line of raw.split('\n').filter(Boolean)) {
        try { entries.push(JSON.parse(line) as AivaActionAuditEntry) } catch { /* ignore bad line */ }
      }
    } catch {
      // no audit file for this day
    }
  }
  return entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp))
}
