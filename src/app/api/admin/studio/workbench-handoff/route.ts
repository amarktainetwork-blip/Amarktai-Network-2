import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { createArtifact } from '@/lib/artifact-store'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    prompt?: string
    repoFullName?: string
    appSlug?: string
    provider?: string
    model?: string
    costMode?: string
  }
  const prompt = body.prompt?.trim()
  if (!prompt) return NextResponse.json({ success: false, error: 'prompt is required' }, { status: 400 })

  let artifact: unknown = null
  try {
    artifact = await createArtifact({
      appSlug: body.appSlug || 'amarktai',
      type: 'code',
      subType: 'workbench_handoff',
      title: `Workbench task: ${prompt.slice(0, 80)}`,
      description: body.repoFullName ? `Repo: ${body.repoFullName}` : 'Studio coding prompt for Workbench',
      provider: body.provider,
      model: body.model,
      content: Buffer.from(JSON.stringify({
        prompt,
        repoFullName: body.repoFullName ?? null,
        provider: body.provider ?? 'auto',
        model: body.model ?? 'auto',
        costMode: body.costMode ?? 'balanced',
        createdAt: new Date().toISOString(),
      }, null, 2), 'utf8'),
      mimeType: 'application/json',
      metadata: {
        prompt,
        repoFullName: body.repoFullName ?? null,
        provider: body.provider ?? 'auto',
        model: body.model ?? 'auto',
        costMode: body.costMode ?? 'balanced',
      },
    })
  } catch (error) {
    artifact = { id: null, warning: error instanceof Error ? error.message : 'Artifact persistence failed' }
  }

  return NextResponse.json({
    success: true,
    artifact,
    workbenchUrl: '/admin/dashboard/assets',
  })
}
