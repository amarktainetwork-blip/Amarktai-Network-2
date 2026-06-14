'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Plus, UserRound, Video } from 'lucide-react'

type Avatar = {
  id: string
  name: string
  imageUrl: string
  videoUrl: string
  artifactId: string | null
  voicePersonaId: string | null
  description: string
  status: string
  jobId: string | null
}

export default function AvatarLibraryPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([])
  const [name, setName] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [voicePersonaId, setVoicePersonaId] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/creative-workspaces', { cache: 'no-store' })
    const data = await response.json()
    if (response.ok) setAvatars(data.avatars ?? [])
  }, [])
  useEffect(() => { void load() }, [load])

  async function addAvatar() {
    const response = await fetch('/api/admin/creative-workspaces', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'avatar',
        appSlug: 'amarktai-network',
        name,
        imageUrl,
        voicePersonaId,
        description,
        status: 'reference',
      }),
    })
    const data = await response.json()
    setMessage(response.ok ? 'Avatar reference added.' : data.error || 'Avatar could not be saved.')
    if (response.ok) {
      setName('')
      setImageUrl('')
      setVoicePersonaId('')
      setDescription('')
      await load()
    }
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.14),transparent_42%)] p-6">
        <p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Avatar Library</p>
        <h1 className="mt-2 text-3xl font-black text-white">People and personas for your content.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">Save avatar references, connect voice personas, and send them into the existing avatar-video capability.</p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="flex items-center gap-2 font-black text-white"><Plus className="h-4 w-4 text-cyan-300" />Add avatar</h2>
          <div className="mt-4 space-y-3">
            <Field label="Name"><input className="control" value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="Image URL or artifact preview"><input className="control" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></Field>
            <Field label="Voice persona reference"><input className="control" value={voicePersonaId} onChange={(event) => setVoicePersonaId(event.target.value)} /></Field>
            <Field label="Description"><textarea className="control min-h-24" value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
            <button disabled={!name.trim()} onClick={() => void addAvatar()} className="w-full rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 disabled:opacity-40">Save avatar</button>
            {message && <p className="text-xs leading-5 text-cyan-200">{message}</p>}
          </div>
        </aside>

        <main className="grid content-start gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {avatars.length === 0 && <div className="col-span-full grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-700 bg-slate-900/30 text-center"><div><UserRound className="mx-auto h-10 w-10 text-slate-600" /><p className="mt-3 font-bold text-slate-300">No avatars saved yet</p><p className="mt-1 text-sm text-slate-500">Add a reference or create one through Studio.</p></div></div>}
          {avatars.map((avatar) => (
            <article key={avatar.id} className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
              <div className="grid aspect-[4/3] place-items-center bg-slate-950">
                {avatar.videoUrl ? <video controls src={avatar.videoUrl} className="h-full w-full object-cover" />
                  : avatar.imageUrl ? <Image unoptimized width={640} height={480} src={avatar.imageUrl} alt={avatar.name} className="h-full w-full object-cover" />
                    : <UserRound className="h-14 w-14 text-slate-700" />}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3"><div><h2 className="font-black text-white">{avatar.name}</h2><p className="mt-1 text-xs text-slate-500">{avatar.voicePersonaId || 'No voice persona linked'}</p></div><span className="rounded-full border border-cyan-400/20 px-2 py-1 text-[10px] font-black uppercase text-cyan-300">{avatar.status}</span></div>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">{avatar.description || 'Avatar reference ready for a script.'}</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/admin/dashboard/studio?mode=avatar&avatar=${encodeURIComponent(avatar.id)}`} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950"><Video className="h-3.5 w-3.5" />Create video</Link>
                  {avatar.artifactId && <Link href="/admin/dashboard/artifacts" className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300">Artifact</Link>}
                </div>
              </div>
            </article>
          ))}
        </main>
      </section>
      <style jsx>{`.control{width:100%;border:1px solid rgb(51 65 85);border-radius:.75rem;background:#020617;padding:.7rem .8rem;color:white;outline:none}`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-400">{label}<span className="mt-2 block">{children}</span></label>
}
