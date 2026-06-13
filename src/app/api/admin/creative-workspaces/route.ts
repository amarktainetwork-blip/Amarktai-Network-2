import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import {
  createCreativeProject,
  deleteAvatar,
  deleteBrandKit,
  listAvatars,
  listBrandKits,
  listCreativeProjects,
  saveAvatar,
  saveBrandKit,
} from '@/lib/creative-workspaces'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const appSlug = request.nextUrl.searchParams.get('appSlug') || undefined
  return NextResponse.json({
    projects: listCreativeProjects(appSlug),
    brandKits: listBrandKits(appSlug),
    avatars: listAvatars(appSlug),
  })
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const kind = stringValue(body?.kind)
  const name = stringValue(body?.name)
  if (!body || !kind || !name) {
    return NextResponse.json({ error: 'kind and name are required' }, { status: 400 })
  }
  if (kind === 'project') {
    return NextResponse.json({
      project: createCreativeProject({
        name,
        appSlug: stringValue(body.appSlug),
        description: stringValue(body.description),
        brandKitId: stringValue(body.brandKitId),
      }),
    }, { status: 201 })
  }
  if (kind === 'brandKit') {
    return NextResponse.json({
      brandKit: saveBrandKit({
        id: stringValue(body.id),
        name,
        appSlug: stringValue(body.appSlug),
        logoUrl: stringValue(body.logoUrl),
        logoArtifactId: stringValue(body.logoArtifactId),
        primaryColor: stringValue(body.primaryColor),
        secondaryColor: stringValue(body.secondaryColor),
        fontPreference: stringValue(body.fontPreference),
        toneOfVoice: stringValue(body.toneOfVoice),
        audience: stringValue(body.audience),
        productNotes: stringValue(body.productNotes),
        usageNotes: stringValue(body.usageNotes),
      }),
    }, { status: 201 })
  }
  if (kind === 'avatar') {
    return NextResponse.json({
      avatar: saveAvatar({
        id: stringValue(body.id),
        name,
        appSlug: stringValue(body.appSlug),
        imageUrl: stringValue(body.imageUrl),
        videoUrl: stringValue(body.videoUrl),
        artifactId: stringValue(body.artifactId),
        voicePersonaId: stringValue(body.voicePersonaId),
        description: stringValue(body.description),
        status: statusValue(body.status),
        jobId: stringValue(body.jobId),
      }),
    }, { status: 201 })
  }
  return NextResponse.json({ error: 'Unknown creative workspace kind' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session.isLoggedIn) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const kind = request.nextUrl.searchParams.get('kind')
  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const deleted = kind === 'brandKit'
    ? deleteBrandKit(id)
    : kind === 'avatar'
      ? deleteAvatar(id)
      : false
  return deleted
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: 'Record not found or cannot be deleted' }, { status: 404 })
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function statusValue(value: unknown): 'ready' | 'processing' | 'failed' | 'reference' | undefined {
  return ['ready', 'processing', 'failed', 'reference'].includes(String(value))
    ? value as 'ready' | 'processing' | 'failed' | 'reference'
    : undefined
}
