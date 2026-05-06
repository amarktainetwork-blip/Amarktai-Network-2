import { listRecords, checkWritable, LOCAL_STORE_FILES, getStorageRoot } from '@/lib/local-json-store'

type MemoryRecord = { id: string; appSlug?: string; memoryType?: string; content?: string; createdAt?: string }

export default function MemoryLearningPage() {
  const memory = listRecords<MemoryRecord>(LOCAL_STORE_FILES.memory)
  const writable = checkWritable(LOCAL_STORE_FILES.memory)
  const learningLogs = listRecords<{ id: string; agentId?: string; summary?: string; createdAt?: string }>('learning/learning-logs.json')

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-[0_24px_100px_rgba(15,23,42,0.12)] backdrop-blur-2xl lg:p-8">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">Memory & Learning</p>
        <h2 className="mt-3 max-w-4xl text-4xl font-black tracking-tight text-slate-950 lg:text-5xl">Shared Superbrain memory.</h2>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
          User memory, app memory, agent memory, emotional state, learning logs, artifacts, and knowledge links are stored locally first with a clean abstraction for future memory backends.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-4">
        <Metric label="Storage root" value={getStorageRoot()} />
        <Metric label="Writable" value={writable.writable ? 'Yes' : 'Needs test'} />
        <Metric label="Memory entries" value={String(memory.length)} />
        <Metric label="Learning logs" value={String(learningLogs.length)} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <h3 className="text-xl font-black text-slate-950">Memory layers</h3>
          <div className="mt-5 grid gap-3">
            {['user memory', 'app memory', 'agent memory', 'emotional state/context', 'memory retrieval', 'knowledge/artifact linking', 'daily learning scheduler', 'cross-agent knowledge sharing', 'local VPS storage first'].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm font-bold text-slate-700">{item}</div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
          <h3 className="text-xl font-black text-slate-950">Recent memory</h3>
          <div className="mt-5 space-y-3">
            {memory.slice(-8).reverse().map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-slate-200 bg-white/75 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">{entry.appSlug ?? 'superbrain'} / {entry.memoryType ?? 'memory'}</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{entry.content}</p>
              </article>
            ))}
            {memory.length === 0 && <p className="text-sm font-semibold text-slate-500">Memory entries appear here after Studio, Workbench, or agent runs save context.</p>}
          </div>
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_70px_rgba(15,23,42,0.10)] backdrop-blur-xl">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 truncate text-lg font-black text-slate-950">{value}</p>
    </div>
  )
}
