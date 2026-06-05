import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const projects = await prisma.playgroundProject.findMany({ orderBy: { updatedAt: 'desc' }, take: 50 }).catch(() => [])
  return NextResponse.json({ projects, workflow: ['Clarify', 'Plan', 'Design', 'Generate', 'Media policy', 'Preview', 'Runtime QA', 'Final gate'] })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({})) as { name?: string; prompt?: string; type?: string }
  if (!body.name?.trim() || !body.prompt?.trim()) return NextResponse.json({ error: 'name and prompt are required' }, { status: 400 })
  try {
    const project = await prisma.playgroundProject.create({
      data: {
        name: body.name.trim(),
        description: body.prompt.trim(),
        type: body.type || 'app_builder',
        status: 'draft',
        promptHistoryJson: JSON.stringify([{ role: 'user', content: body.prompt.trim(), createdAt: new Date().toISOString() }]),
        workflowsJson: JSON.stringify([{ stage: 'Clarify', status: 'ready' }, { stage: 'Plan', status: 'pending' }, { stage: 'Design', status: 'pending' }, { stage: 'Generate', status: 'pending' }, { stage: 'Media policy', status: 'pending' }, { stage: 'Preview', status: 'pending' }, { stage: 'Runtime QA', status: 'pending' }, { stage: 'Final gate', status: 'pending' }]),
      },
    })
    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Project storage unavailable' }, { status: 503 })
  }
}
