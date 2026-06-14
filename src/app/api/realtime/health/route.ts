import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    capability: 'realtime_voice',
    status: 'unavailable',
    serviceRunning: false,
    serviceUrl: null,
    ready: false,
    reason: 'No approved-provider realtime voice session adapter is wired.',
  })
}
