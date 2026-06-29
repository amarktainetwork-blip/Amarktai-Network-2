import { runCoreCapabilityProofPack, type CoreProofCostMode } from '../src/lib/core-capability-proof-runner'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isStructuredProof(value: unknown) {
  if (!isRecord(value)) return false
  return (
    typeof value.success === 'boolean' &&
    typeof value.ranAt === 'string' &&
    Array.isArray(value.capabilities)
  )
}

async function main() {
  const compact = process.argv.includes('--compact')
  const live = process.argv.includes('--live')
  const capabilities = process.argv.find((arg) => arg.startsWith('--capabilities='))
    ?.replace('--capabilities=', '')
    .split(',')
    .map((capability) => capability.trim())
    .filter(Boolean)
  const maxDurationArg = process.argv.find((arg) => arg.startsWith('--maxDurationSeconds='))
  const maxDurationSeconds = maxDurationArg ? Number(maxDurationArg.replace('--maxDurationSeconds=', '')) : undefined
  const pollSecondsArg = process.argv.find((arg) => arg.startsWith('--pollSeconds='))
  const pollSeconds = pollSecondsArg ? Number(pollSecondsArg.replace('--pollSeconds=', '')) : undefined
  const pollIntervalArg = process.argv.find((arg) => arg.startsWith('--pollIntervalMs='))
  const pollIntervalMs = pollIntervalArg ? Number(pollIntervalArg.replace('--pollIntervalMs=', '')) : undefined
  const costModeArg = process.argv.find((arg) => arg.startsWith('--costMode='))?.replace('--costMode=', '')
  const costMode = costModeArg === 'cheap' || costModeArg === 'balanced' || costModeArg === 'premium'
    ? costModeArg as CoreProofCostMode
    : undefined
  const result = await runCoreCapabilityProofPack({
    live,
    capabilities,
    maxDurationSeconds: Number.isFinite(maxDurationSeconds) ? maxDurationSeconds : undefined,
    costMode,
    pollSeconds: Number.isFinite(pollSeconds) ? pollSeconds : undefined,
    pollIntervalMs: Number.isFinite(pollIntervalMs) ? pollIntervalMs : undefined,
  })
  if (!isStructuredProof(result)) {
    throw new Error('Core proof runner returned malformed output.')
  }
  process.stdout.write(`${JSON.stringify(result, null, compact ? 0 : 2)}\n`)
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Core proof command failed.'
  process.stderr.write(`${JSON.stringify({ success: false, error: message })}\n`)
  process.exitCode = 1
})
