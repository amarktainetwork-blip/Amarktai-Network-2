import { getQueueStatus } from '@/lib/job-queue'

export const dynamic = 'force-dynamic'

export default async function AutomationPage() {
  const queue = await getQueueStatus().catch(() => ({ healthy: false, backendAvailable: false, counts: {} as Record<string, number> }))

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Admin</p>
        <h1 className="mt-2 text-2xl font-black text-white">Automation</h1>
        <p className="mt-1 text-sm text-slate-400">Scheduler, approvals, job flows, worker health, and publishing readiness.</p>
      </section>

      {/* Scheduler */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-white">Scheduler</h2>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-300">Needs proof</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Scheduler routes exist but no scheduled jobs have been proven end-to-end.
          Configure via <a href="/admin/dashboard/settings" className="text-cyan-400 underline">Settings</a> and run a test job to prove execution.
        </p>
      </section>

      {/* Approvals */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-white">Approvals</h2>
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-300">Wired</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Approval routes are wired. Storage must be writable for approvals to persist.
        </p>
      </section>

      {/* Worker / Queue */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-white">Worker / Queue</h2>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${queue.healthy ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-amber-400/30 bg-amber-400/10 text-amber-300'}`}>
            {queue.healthy ? 'Working' : queue.backendAvailable ? 'Degraded' : 'Backend unavailable'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['queued', 'running', 'processing', 'pending'] as const).map((key) => (
            <div key={key} className="rounded-xl border border-slate-800 bg-slate-950/55 p-3 text-center">
              <p className="text-xl font-black text-slate-200">{queue.counts?.[key] ?? 0}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">{key}</p>
            </div>
          ))}
        </div>
        {!queue.backendAvailable && (
          <p className="mt-3 text-sm text-amber-200">Queue backend unavailable. Configure REDIS_URL to enable BullMQ-backed job processing.</p>
        )}
      </section>

      {/* Social Publishing */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-white">Social Publishing</h2>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-black text-slate-500">Not configured</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Social publishing routes are planned. No platform connections are configured or proven.
          Connect accounts and configure publishing credentials to enable.
        </p>
      </section>

      {/* Trading */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-black text-white">Trading</h2>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-black text-slate-500">Not configured</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Trading strategy and execution routes are planned. No exchange connections are configured or proven.
          Configure exchange credentials and paper-trade proof before enabling live execution.
        </p>
      </section>
    </div>
  )
}
