import { listRecords, checkWritable, LOCAL_STORE_FILES, getStorageRoot } from '@/lib/local-json-store'

type MemoryRecord = { id: string; appSlug?: string; memoryType?: string; content?: string; createdAt?: string }
type ArtifactRecord = { id: string; title?: string; type?: string; appSlug?: string; createdAt?: string }
type LearningLog = { id: string; agentId?: string; summary?: string; createdAt?: string }

export default function MemoryLearningPage() {
  const memory = listRecords<MemoryRecord>(LOCAL_STORE_FILES.memory)
  const writable = checkWritable(LOCAL_STORE_FILES.memory)
  const learningLogs = listRecords<LearningLog>('learning/learning-logs.json')
  const artifacts = listRecords<ArtifactRecord>(LOCAL_STORE_FILES.artifacts)

  const layers = [
    'user memory',
    'app memory',
    'agent memory',
    'artifact memory',
    'memory retrieval',
    'knowledge and artifact linking',
    'manual learning review',
    'cross-agent knowledge sharing',
    'local VPS storage first',
  ]

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl lg:p-7">
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-72 rounded-bl-[6rem] bg-gradient-to-br from-violet-500/10 via-indigo-500/6 to-transparent blur-3xl" />
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-400/80">Memory & Learning</p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-100 lg:text-3xl">Operational memory and learning.</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          User memory, app context, agent notes, learning logs, and artifact links are stored locally first. Automation is shown only where routes exist.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <MemMetric label="Storage root" value={getStorageRoot()} mono />
        <MemMetric label="Storage writable" value={writable.writable ? 'Yes' : 'Needs test'} accent={writable.writable} />
        <MemMetric label="Memory entries" value={String(memory.length)} />
        <MemMetric label="Learning logs" value={String(learningLogs.length)} />
        <MemMetric label="Artifact inputs" value={String(artifacts.length)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <h3 className="text-sm font-black text-slate-200">Memory layers</h3>
          <div className="mt-4 space-y-2">
            {layers.map((item) => (
              <div key={item} className="flex items-center gap-2.5 rounded-xl border border-slate-700/40 bg-slate-800/40 px-3 py-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500/60" />
                <p className="text-xs font-semibold text-slate-300">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <h3 className="text-sm font-black text-slate-200">Recent memory writes</h3>
          <div className="mt-4 space-y-2.5">
            {memory.slice(-8).reverse().map((entry) => (
              <article key={entry.id} className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3.5">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-400/70">{entry.appSlug ?? 'workspace'} / {entry.memoryType ?? 'memory'}</p>
                <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-slate-400">{entry.content}</p>
              </article>
            ))}
            {memory.length === 0 && (
              <p className="text-sm font-semibold text-slate-500">Memory entries appear here after Studio, Workbench, or agent runs save context.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <h3 className="text-sm font-black text-slate-200">Artifacts and jobs that can feed memory</h3>
          <div className="mt-4 space-y-2.5">
            {artifacts.slice(-6).reverse().map((artifact) => (
              <div key={artifact.id} className="rounded-xl border border-slate-700/40 bg-slate-800/50 p-3">
                <p className="text-xs font-black text-slate-200">{artifact.title ?? artifact.id}</p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600">{artifact.appSlug ?? 'workspace'} / {artifact.type ?? 'artifact'}</p>
              </div>
            ))}
            {!artifacts.length && <p className="text-sm font-semibold text-slate-500">No artifacts have been recorded yet.</p>}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-xl">
          <h3 className="text-sm font-black text-slate-200">Learning automation truth</h3>
          <div className="mt-4 space-y-2.5">
            {[
              'Manual memory writes are active through the protected memory route.',
              'Artifact linking is visible; automatic promotion still requires explicit backend wiring.',
              'Scheduled learning remains pending until a scheduler route and retention policy exist.',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs font-semibold leading-5 text-amber-200/80">{item}</div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

function MemMetric({ label, value, mono = false, accent = false }: { label: string; value: string; mono?: boolean; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className={['mt-2 truncate text-sm font-black', mono ? 'font-mono text-slate-400' : accent ? 'text-emerald-400' : 'text-slate-200'].join(' ')}>{value}</p>
    </div>
  )
}
