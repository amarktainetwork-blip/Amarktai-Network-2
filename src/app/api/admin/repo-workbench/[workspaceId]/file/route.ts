import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readRepoFile, writeRepoFile } from '@/lib/repo-workbench'

export async function GET(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const filePath = new URL(req.url).searchParams.get('path') || ''
    if (!filePath) return NextResponse.json({ error: 'path is required' }, { status: 400 })
    const file = await readRepoFile(workspaceId, filePath)
    return NextResponse.json(file)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to read file' }, { status: 400 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ workspaceId: string }> }) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  try {
    const { workspaceId } = await params
    const body = await req.json() as { path?: string; content?: string; confirm?: boolean }
    if (!body.confirm) return NextResponse.json({ success: false, error: 'confirm=true is required to edit a file' }, { status: 400 })
    if (!body.path) return NextResponse.json({ success: false, error: 'path is required' }, { status: 400 })
    if (typeof body.content !== 'string') return NextResponse.json({ success: false, error: 'content is required' }, { status: 400 })
    const result = await writeRepoFile(workspaceId, body.path, body.content)
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Failed to write file' }, { status: 400 })
  }
}
