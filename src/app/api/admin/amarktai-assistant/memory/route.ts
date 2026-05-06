import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const memory: Array<{ id: string; content: string; createdAt: string }> = []

export async function GET() {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ memory })
}

export async function POST(req: Request) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { content?: string }
  if (!body.content?.trim()) return NextResponse.json({ error: 'content is required' }, { status: 400 })

  const entry = { id: `memory-${Date.now()}`, content: body.content.trim(), createdAt: new Date().toISOString() }
  memory.unshift(entry)
  return NextResponse.json({ memory: entry })
}
