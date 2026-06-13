'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Loader2, Music2, Play, WandSparkles } from 'lucide-react'

const genres = ['pop', 'rock', 'folk', 'hip_hop', 'edm', 'gospel', 'amapiano', 'afrobeats', 'jazz', 'classical', 'rnb', 'ambient', 'cinematic']
const moods = ['uplifting', 'confident', 'romantic', 'energetic', 'calm', 'dramatic', 'hopeful', 'dark']

type Result = {
  success?: boolean
  jobStatus?: string
  jobId?: string | null
  pollUrl?: string | null
  artifactId?: string | null
  storageUrl?: string | null
  audioUrl?: string | null
  lyrics?: string
  error?: string | null
  blocker?: string | null
}

export default function MusicStudioPage() {
  const [theme, setTheme] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>(['amapiano'])
  const [selectedMoods, setSelectedMoods] = useState<string[]>(['uplifting'])
  const [vocalStyle, setVocalStyle] = useState('female_lead')
  const [instrumental, setInstrumental] = useState(false)
  const [language, setLanguage] = useState('en')
  const [lyrics, setLyrics] = useState('')
  const [duration, setDuration] = useState(180)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!result?.pollUrl || !['processing', 'queued', 'pending'].includes(result.jobStatus ?? '')) return
    const timer = window.setInterval(async () => {
      const response = await fetch(result.pollUrl!, { cache: 'no-store' })
      const data = await response.json()
      setResult(data)
    }, 3500)
    return () => window.clearInterval(timer)
  }, [result])

  async function generate(action: 'create_async' | 'lyrics_only') {
    if (!theme.trim()) return
    setLoading(true)
    const response = await fetch('/api/admin/music-studio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        request: {
          appSlug: 'amarktai-network',
          title: theme.slice(0, 80),
          theme,
          genre: selectedGenres[0],
          genres: selectedGenres,
          moods: selectedMoods,
          vocalStyle: instrumental ? 'instrumental_only' : vocalStyle,
          instrumental,
          language,
          durationSeconds: duration,
          existingLyrics: lyrics,
          qualityTier: 'auto',
        },
      }),
    })
    setResult(await response.json())
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-fuchsia-400/20 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,.14),transparent_42%)] p-6">
        <p className="text-xs font-black uppercase tracking-[.2em] text-fuchsia-300">Music Studio</p>
        <h1 className="mt-2 text-3xl font-black text-white">Turn a brief into a playable track.</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">The recovered music engine supports multi-genre direction, lyrics, vocal style, asynchronous provider jobs, and persisted audio artifacts.</p>
      </header>

      <section className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <aside className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <Field label="Song brief"><textarea className="control min-h-28" value={theme} onChange={(event) => setTheme(event.target.value)} placeholder="Describe the song, audience, story, and desired feeling." /></Field>
          <ChoiceGroup label="Genres, up to 5" values={genres} selected={selectedGenres} onChange={setSelectedGenres} />
          <ChoiceGroup label="Moods, up to 5" values={moods} selected={selectedMoods} onChange={setSelectedMoods} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Vocal style"><select className="control" value={vocalStyle} onChange={(event) => setVocalStyle(event.target.value)} disabled={instrumental}><option value="female_lead">Female lead</option><option value="male_lead">Male lead</option><option value="choir">Choir</option><option value="rap">Rap</option><option value="spoken_word">Spoken word</option></select></Field>
            <Field label="Language"><input className="control" value={language} onChange={(event) => setLanguage(event.target.value)} /></Field>
          </div>
          <label className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm font-bold text-slate-300">Instrumental only<input type="checkbox" checked={instrumental} onChange={(event) => setInstrumental(event.target.checked)} /></label>
          <Field label="Duration"><input className="control" type="number" min={30} max={600} value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></Field>
          <Field label="Lyrics, optional"><textarea className="control min-h-32" value={lyrics} onChange={(event) => setLyrics(event.target.value)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <button className="secondary" disabled={loading || !theme.trim()} onClick={() => void generate('lyrics_only')}>Write lyrics</button>
            <button className="primary" disabled={loading || !theme.trim()} onClick={() => void generate('create_async')}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}Generate</button>
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          {!result && <div className="grid min-h-[520px] place-items-center text-center"><div><Music2 className="mx-auto h-14 w-14 text-fuchsia-300/50" /><h2 className="mt-5 text-xl font-black text-white">Your track appears here</h2><p className="mt-2 max-w-md text-sm leading-6 text-slate-500">Generation remains honest: a pending provider job shows progress, not a fake audio player.</p></div></div>}
          {result && <div className="space-y-5">
            <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-fuchsia-300">Generation result</p><h2 className="mt-2 text-2xl font-black text-white">{theme}</h2></div><span className="rounded-full border border-fuchsia-400/20 px-3 py-1 text-xs font-black uppercase text-fuchsia-200">{result.jobStatus ?? (result.success ? 'completed' : 'failed')}</span></div>
            {(result.audioUrl || result.storageUrl) && <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><p className="mb-3 flex items-center gap-2 text-sm font-black text-white"><Play className="h-4 w-4 text-fuchsia-300" />Playable artifact</p><audio controls className="w-full" src={result.audioUrl || result.storageUrl || ''} /></div>}
            {(result.lyrics || lyrics) && <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5"><p className="text-xs font-black uppercase tracking-[.16em] text-slate-500">Lyrics</p><pre className="mt-4 whitespace-pre-wrap font-sans text-sm leading-7 text-slate-300">{result.lyrics || lyrics}</pre></div>}
            {(result.error || result.blocker) && <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">{result.error || result.blocker}</div>}
            {result.artifactId && <Link href="/admin/dashboard/artifacts" className="inline-flex rounded-xl bg-fuchsia-300 px-4 py-2.5 text-sm font-black text-slate-950">Open artifact library</Link>}
          </div>}
        </main>
      </section>
      <style jsx>{`.control{width:100%;border:1px solid rgb(51 65 85);border-radius:.75rem;background:#020617;padding:.7rem .8rem;color:white;outline:none}.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;border-radius:.75rem;padding:.7rem;font-size:.75rem;font-weight:900}.primary{background:#f0abfc;color:#3b0764}.secondary{border:1px solid rgb(71 85 105);color:#e2e8f0}.primary:disabled,.secondary:disabled{opacity:.4}`}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-slate-400">{label}<span className="mt-2 block">{children}</span></label>
}

function ChoiceGroup({ label, values, selected, onChange }: { label: string; values: string[]; selected: string[]; onChange: (value: string[]) => void }) {
  return <div><p className="text-xs font-bold text-slate-400">{label}</p><div className="mt-2 flex flex-wrap gap-2">{values.map((value) => { const active = selected.includes(value); return <button key={value} type="button" onClick={() => onChange(active ? selected.filter((item) => item !== value) : [...selected, value].slice(0, 5))} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${active ? 'border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200' : 'border-slate-700 text-slate-500'}`}>{value.replace('_', ' ')}</button> })}</div></div>
}
