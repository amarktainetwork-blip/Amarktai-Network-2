import { NextResponse } from 'next/server'
import { getProviderUniverseTruth } from '@/lib/provider-universe-truth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const truth = await getProviderUniverseTruth()
    return NextResponse.json({ success: true, truth })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Provider universe truth failed.',
      },
      { status: 500 },
    )
  }
}
