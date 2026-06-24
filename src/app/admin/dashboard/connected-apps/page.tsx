/**
 * Connected Apps dashboard page — Phase 5 (registration UI slice).
 *
 * Server component for data display.
 * Client component (ConnectedAppsClient) handles the registration form
 * and suspend/reactivate/delete actions via fetch calls to the API.
 *
 * Rules:
 *   - Shows only registered apps from the live registry.
 *   - Shows a truthful empty state when no apps are registered.
 *   - Never shows fake app cards or placeholder statuses.
 *   - Secret is shown once after registration, never again.
 */

import { listConnectedApps } from '@/lib/connected-apps'
import { listConnectedAppEvents } from '@/lib/connected-app-events'
import ConnectedAppsClient from './ConnectedAppsClient'
import {
  DashboardMetricCard,
  DashboardPageHeader,
  DashboardSectionPanel,
  DashboardStatusBadge,
} from '@/components/dashboard/DashboardChrome'

export const dynamic = 'force-dynamic'

export default function ConnectedAppsPage() {
  const apps = listConnectedApps()
  const events = listConnectedAppEvents().slice(0, 50)
  const activeApps = apps.filter((app) => app.status === 'active').length
  const suspendedApps = apps.filter((app) => app.status === 'suspended').length

  return (
    <div className="space-y-6">
      <DashboardPageHeader
        eyebrow="Connected Apps"
        title={apps.length === 0 ? 'No connected apps yet' : `${apps.length} connected app${apps.length === 1 ? '' : 's'}`}
        description={apps.length === 0
          ? 'No apps have been registered yet. Use the form below to register the first app and assign explicit capability scopes.'
          : 'Apps registered to use scoped capability execution and webhook/event flows through the AmarktAI Brain.'}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardMetricCard label="Registered apps" value={apps.length} tone="cyan" detail="Apps known to the current connected-app registry." />
        <DashboardMetricCard label="Active" value={activeApps} tone="emerald" detail="Apps currently able to send signed requests or webhook events." />
        <DashboardMetricCard label="Suspended" value={suspendedApps} tone="amber" detail="Apps temporarily blocked without deleting their registration." />
      </div>

      {/* Interactive client section: registration form + app list + controls */}
      <ConnectedAppsClient initialApps={apps} />

      {/* Event log — server-rendered, read-only */}
      <DashboardSectionPanel title="Webhook event log" eyebrow="Read-only event truth">
        {events.length === 0 ? (
          <p className="text-sm text-slate-500">No webhook events recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between rounded-2xl border border-slate-700/30 bg-slate-800/40 px-4 py-3"
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
                <div className="ml-4 shrink-0">
                  <DashboardStatusBadge value={event.verificationResult === 'accepted' ? 'active' : 'failed'} map={{
                    active: { label: 'accepted', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
                    failed: { label: 'rejected', className: 'border-rose-500/30 bg-rose-500/12 text-rose-200' },
                  }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </DashboardSectionPanel>
    </div>
  )
}
