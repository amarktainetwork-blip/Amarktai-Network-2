import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'

type Artifact = { id: string; title?: string; type?: string; subType?: string; status?: string; provider?: string; model?: string; createdAt?: string; storageUrl?: string; contentUrl?: string; url?: string }

export default function OutputsPage() {
  const artifacts = listRecords<Artifact>(LOCAL_STORE_FILES.artifacts).slice().reverse()
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6"><p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Outputs</p><h1 className="mt-2 text-3xl font-black text-white">Everything the network creates.</h1><p className="mt-2 text-sm leading-6 text-slate-400">Songs, movies, avatars, images, research, app builds, diffs, PRs, readiness reports, logs, and deployment results share one artifact library.</p></section>
      {artifacts.length === 0 ? <section className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center"><p className="font-black text-slate-300">No outputs yet.</p><p className="mt-2 text-sm text-slate-500">Run a command and saved artifacts will appear here.</p></section> : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{artifacts.map((artifact) => <article key={artifact.id} className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{artifact.title || artifact.id}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-cyan-300">{artifact.type || 'artifact'} {artifact.subType ? `· ${artifact.subType}` : ''}</p></div><span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-black text-slate-400">{artifact.status || 'saved'}</span></div><p className="mt-4 text-xs text-slate-500">{artifact.provider || 'local'} {artifact.model ? `· ${artifact.model}` : ''}</p>{(artifact.storageUrl || artifact.contentUrl || artifact.url) && <a href={artifact.storageUrl || artifact.contentUrl || artifact.url} className="mt-3 inline-block text-xs font-black text-cyan-300">Open artifact</a>}</article>)}</section>
      )}
    </div>
  )
}
