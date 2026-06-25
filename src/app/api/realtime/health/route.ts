import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    capability: 'realtime_voice',
    serviceRunning: false,
    serviceUrl: process.env.REALTIME_SERVICE_URL ?? null,
    ready: false,
    availabilityLevel: 'NOT_AVAILABLE',
    reason: 'Realtime voice is not wired to an approved active provider.',
  }, { status: 501 })
}
