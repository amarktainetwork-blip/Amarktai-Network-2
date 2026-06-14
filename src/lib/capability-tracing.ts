import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export interface CapabilityTraceInput {
  traceId?: string
  jobId?: string
  appSlug: string
  adultModeState?: string
  capability: string
  eventType: string
  selectedRoute?: Record<string, unknown>
  providerRequestMeta?: Record<string, unknown>
  providerJobId?: string
  estimatedCostCents?: number
  artifactId?: string
  errorCategory?: string
  payload?: Record<string, unknown>
}

export async function recordCapabilityTrace(input: CapabilityTraceInput) {
  const traceId = input.traceId ?? randomUUID()
  const record = await prisma.capabilityTrace.create({
    data: {
      traceId,
      jobId: input.jobId,
      appSlug: input.appSlug,
      adultModeState: input.adultModeState ?? 'off',
      capability: input.capability,
      eventType: input.eventType,
      selectedRoute: JSON.stringify(input.selectedRoute ?? {}),
      providerRequestMeta: JSON.stringify(redact(input.providerRequestMeta ?? {})),
      providerJobId: input.providerJobId,
      estimatedCostCents: input.estimatedCostCents ?? 0,
      artifactId: input.artifactId,
      errorCategory: input.errorCategory,
      payload: JSON.stringify(redact(input.payload ?? {})),
    },
  })
  void exportOtlpTrace(record).catch((error) => {
    console.warn('[capability-tracing] OTLP export failed:', error instanceof Error ? error.message : error)
  })
  return record
}

export async function recordCapabilityTraceSafe(input: CapabilityTraceInput) {
  try {
    return await recordCapabilityTrace(input)
  } catch (error) {
    console.error('[capability-tracing] trace persistence failed:', {
      capability: input.capability,
      eventType: input.eventType,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

function redact(value: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/key|secret|token|authorization|cookie/i.test(key)) return [key, '[REDACTED]']
    return [key, item]
  }))
}

async function exportOtlpTrace(record: {
  traceId: string
  id: string
  eventType: string
  capability: string
  appSlug: string
  createdAt: Date
}) {
  const configured = process.env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim()
  if (!configured) return
  const endpoint = `${configured.replace(/\/+$/, '')}/v1/traces`
  const traceId = record.traceId.replace(/-/g, '').padEnd(32, '0').slice(0, 32)
  const spanId = record.id.replace(/-/g, '').padEnd(16, '0').slice(0, 16)
  const timestamp = `${record.createdAt.getTime()}000000`
  await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      resourceSpans: [{
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: 'amarktai-control-plane' } }],
        },
        scopeSpans: [{
          scope: { name: 'amarktai.capability-router' },
          spans: [{
            traceId,
            spanId,
            name: record.eventType,
            kind: 1,
            startTimeUnixNano: timestamp,
            endTimeUnixNano: timestamp,
            attributes: [
              { key: 'amarktai.capability', value: { stringValue: record.capability } },
              { key: 'amarktai.app_slug', value: { stringValue: record.appSlug } },
            ],
            status: { code: 1 },
          }],
        }],
      }],
    }),
    signal: AbortSignal.timeout(5_000),
  })
}
