import { listRecords, LOCAL_STORE_FILES } from '@/lib/local-json-store'
import MemoryActions from '@/components/dashboard/MemoryActions'

type MemoryRecord = { id: string; appSlug?: string; memoryType?: string; content?: string; createdAt?: string }
type ArtifactRecord = { id: string; title?: string; type?: string; appSlug?: string }
type LearningLog = { id: string; agentId?: string; summary?: string; createdAt?: string }

export default function MemoryLearningPage() {
  const memory = listRecords<MemoryRecord>(LOCAL_STORE_FILES.memory)
  const learningLogs = listRecords<LearningLog>('learning/learning-logs.json')
  const artifacts = listRecords<ArtifactRecord>(LOCAL_STORE_FILES.artifacts)
  const appSlugs = [...new Set(memory.map((entry) => entry.appSlug).filter((value): value is string => Boolean(value)))]

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-cyan-400/20 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Memory</p>
        <h1 className="mt-2 text-3xl font-black text-white">What Amarktai Network remembers.</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          Useful context, app outcomes, and saved decisions remain available for later work. Nothing is invented when no memory has been written.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Remembered entries" value={String(memory.length)} />
        <Metric label="Learned outcomes" value={String(learningLogs.length)} />
        <Metric label="Linked outputs" value={String(artifacts.length)} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel title="What can be remembered">
          {[
            'Your preferences and working context',
            'Context for each connected app',
            'Useful outcomes from completed work',
            'Links between outputs and follow-up work',
          ].map((item) => <PlainRow key={item} value={item} />)}
        </Panel>
        <Panel title="Recent memory writes">
          {memory.slice(-8).reverse().map((entry) => (
            <article key={entry.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-cyan-300">{entry.appSlug || 'workspace'}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">{entry.content || 'Saved context'}</p>
            </article>
          ))}
          {!memory.length && <p className="text-sm text-slate-400">No memory yet. Saved outcomes and app context will appear here.</p>}
        </Panel>
      </section>

      <MemoryActions appSlugs={appSlugs} />

      <Panel title="Recent learned outcomes">
        {learningLogs.slice(-6).reverse().map((entry) => <PlainRow key={entry.id} value={entry.summary || 'Outcome recorded'} />)}
        {!learningLogs.length && <p className="text-sm text-slate-400">No learned outcomes have been recorded yet.</p>}
      </Panel>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p></div>
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5"><h2 className="font-black text-white">{title}</h2><div className="mt-4 space-y-2">{children}</div></section>
}

function PlainRow({ value }: { value: string }) {
  return <div className="rounded-xl border border-slate-700/40 bg-slate-950/45 px-3 py-2.5 text-sm text-slate-300">{value}</div>
}
