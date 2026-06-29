import { runCoreCapabilityProofPack } from '../src/lib/core-capability-proof-runner'

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
  const result = await runCoreCapabilityProofPack()
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
