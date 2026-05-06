import { promises as fs } from 'fs'
import path from 'path'
import { isApprovedAIProvider, type CostMode } from '@/lib/approved-ai-catalog'
import { resolveWorkspacePath } from '@/lib/workspace-security'

export interface CostRunRecord {
  id: string
  provider: string
  model: string
  appSlug: string
  agentId?: string
  capability: string
  runType: string
  costMode: CostMode
  estimatedCostUsd: number
  createdAt: string
}

export interface CostSummary {
  todaySpendUsd: number
  monthSpendUsd: number
  byApp: Record<string, number>
  byProvider: Record<string, number>
  byAgent: Record<string, number>
  recentExpensiveRuns: CostRunRecord[]
  budgetWarnings: string[]
  runs: CostRunRecord[]
}

const COST_STORE = 'cost-runs.json'

export async function recordEstimatedCost(input: Omit<CostRunRecord, 'id' | 'createdAt'>): Promise<CostRunRecord> {
  if (!isApprovedAIProvider(input.provider)) throw new Error('Provider is not approved for cost tracking')
  const runs = await readRuns()
  const record: CostRunRecord = {
    ...input,
    id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  runs.push(record)
  await writeRuns(runs.slice(-1000))
  return record
}

export async function getCostSummary(monthlyBudgetUsd = 500): Promise<CostSummary> {
  return summarizeCostRuns(await readRuns(), monthlyBudgetUsd)
}

export function summarizeCostRuns(runs: CostRunRecord[], monthlyBudgetUsd = 500): CostSummary {
  const now = new Date()
  const todayKey = now.toISOString().slice(0, 10)
  const monthKey = now.toISOString().slice(0, 7)
  const inMonth = runs.filter((run) => run.createdAt.startsWith(monthKey))
  const today = runs.filter((run) => run.createdAt.startsWith(todayKey))
  const monthSpendUsd = round(inMonth.reduce((sum, run) => sum + run.estimatedCostUsd, 0))

  return {
    todaySpendUsd: round(today.reduce((sum, run) => sum + run.estimatedCostUsd, 0)),
    monthSpendUsd,
    byApp: groupSum(inMonth, (run) => run.appSlug || 'dashboard'),
    byProvider: groupSum(inMonth, (run) => run.provider),
    byAgent: groupSum(inMonth, (run) => run.agentId || 'operator'),
    recentExpensiveRuns: [...runs].sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd).slice(0, 8),
    budgetWarnings: monthSpendUsd >= monthlyBudgetUsd * 0.8
      ? [`Monthly estimated spend is ${Math.round((monthSpendUsd / monthlyBudgetUsd) * 100)}% of budget.`]
      : [],
    runs: [...runs].reverse().slice(0, 50),
  }
}

async function readRuns(): Promise<CostRunRecord[]> {
  try {
    const raw = await fs.readFile(storePath(), 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeRuns(runs: CostRunRecord[]) {
  const target = storePath()
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.writeFile(target, JSON.stringify(runs, null, 2), 'utf8')
}

function storePath() {
  return resolveWorkspacePath('costs', COST_STORE)
}

function groupSum(runs: CostRunRecord[], keyFor: (run: CostRunRecord) => string) {
  const out: Record<string, number> = {}
  for (const run of runs) out[keyFor(run)] = round((out[keyFor(run)] ?? 0) + run.estimatedCostUsd)
  return out
}

function round(value: number) {
  return Math.round(value * 10000) / 10000
}
