/**
 * Connected Apps dashboard page — Phase 5.
 *
 * Shows only registered apps from the live registry.
 * Shows a truthful empty state when no apps are registered.
 * Never shows fake app cards or placeholder statuses.
 *
 * Server component — fetches data at render time.
 */

import { listConnectedApps } from '@/lib/connected-apps'
import { listConnectedAppEvents } from '@/lib/connected-app-events'

export const dynamic = 'force-dynamic'

export default function ConnectedAppsPage() {
  const apps = listConnectedApps()
  const events = listConnectedAppEvents().slice(0, 50)

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="rounded-3xl border border-slate-700/50 bg-slate-900/70 p-6">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
          Connected Apps
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-white">
          {apps.length === 0 ? 'No connected apps' : `${apps.length} connected app${apps.length === 1 ? '' : 's'}`}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
          {apps.length === 0
            ? 'No apps have been registered yet. Register an app to start receiving webhook events.'
            : 'Apps registered to deliver webhook events to this platform.'}
        </p>
      </section>

      {/* App list */}
      {apps.length > 0 && (
        <section className="rounded-3xl border border-slate-700/50 bg-slate-900/70 p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
            Registered Apps
          </h2>
          <div className="space-y-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex items-center justify-between rounded-xl border border-slate-700/40 bg-slate-800/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-bold text-white">{app.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    slug: <span className="font-mono text-slate-300">{app.slug}</span>
                    {' · '}
                    id: <span className="font-mono text-slate-300">{app.id}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Scopes: {app.scopes.join(', ')}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    app.status === 'active'
                      ? 'bg-emerald-900/60 text-emerald-300'
                      : app.status === 'suspended'
                        ? 'bg-red-900/60 text-red-300'
                        : 'bg-slate-700/60 text-slate-300'
                  }`}
                >
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Event log */}
      <section className="rounded-3xl border border-slate-700/50 bg-slate-900/70 p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-slate-300">
          Webhook Event Log
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No webhook events recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-lg border border-slate-700/30 bg-slate-800/40 px-4 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-mono text-slate-300">
                    <span className="text-slate-500">app:</span> {event.appId}
                    {' · '}
                    <span className="text-slate-500">type:</span> {event.eventType}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {new Date(event.timestamp).toLocaleString()}
                    {event.rejectionReason && (
                      <span className="ml-2 text-red-400">({event.rejectionReason})</span>
                    )}
                  </p>
                </div>
                <span
                  className={`ml-4 shrink-0 rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
                    event.verificationResult === 'accepted'
                      ? 'bg-emerald-900/50 text-emerald-300'
                      : 'bg-red-900/50 text-red-300'
                  }`}
                >
                  {event.verificationResult}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
