import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/session'
import { recommendAppAiPackage } from '@/lib/app-ai-package'

const requestSchema = z.object({
  appSlug: z.string().min(1),
  appName: z.string().min(1),
  appType: z.string().min(1).default('general'),
  safetyProfile: z.string().optional(),
  requestedCapabilityIds: z.array(z.string()).optional(),
  websiteUrl: z.string().url().optional(),
  preferCheap: z.boolean().optional().default(true),
  allowAdult: z.boolean().optional().default(false),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid app AI package request', details: parsed.error.flatten() }, { status: 422 })
  }

  const pkg = await recommendAppAiPackage(parsed.data)
  return NextResponse.json({
    success: true,
    package: pkg,
    nextSteps: [
      'Review enabled capabilities.',
      'Confirm provider/model selections.',
      'Run provider capability tests before marking capabilities live.',
      'Save this package to the app profile once the app registry UI is ready.',
    ],
  })
}
