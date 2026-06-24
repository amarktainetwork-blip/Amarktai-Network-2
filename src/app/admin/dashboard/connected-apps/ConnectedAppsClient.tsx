'use client'

/**
 * ConnectedAppsClient — Phase 5 registration UI slice.
 *
 * Handles:
 *   - Registration form (name, slug, scopes)
 *   - Displays generated signing secret once after registration
 *   - Lists registered apps with suspend/reactivate/delete controls
 *   - Truthful empty state when no apps exist
 *   - No fake app cards, no fake statuses
 */

import { useState } from 'react'
import type { ConnectedApp, ConnectedAppScope } from '@/lib/connected-apps'
import {
  DashboardEmptyState,
  DashboardSectionPanel,
  DashboardStatusBadge,
} from '@/components/dashboard/DashboardChrome'

const ALL_SCOPES: ConnectedAppScope[] = [
  'webhook:receive',
  'events:read',
  'artifacts:read',
  'artifacts:write',
  'ai:text:execute',
  'ai:image:execute',
  'ai:video:execute',
  'ai:audio:execute',
  'ai:music:execute',
  'ai:avatar:execute',
  'ai:research:execute',
  'ai:data:execute',
  'ai:campaign:execute',
]

interface Props {
  initialApps: ConnectedApp[]
}

interface NewSecretBanner {
  appName: string
  appId: string
  signingSecretRef: string
  signingSecret: string
}

export default function ConnectedAppsClient({ initialApps }: Props) {
  const [apps, setApps] = useState<ConnectedApp[]>(initialApps)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [scopes, setScopes] = useState<ConnectedAppScope[]>(['webhook:receive'])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<NewSecretBanner | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function toggleScope(scope: ConnectedAppScope) {
    setScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNewSecret(null)

    if (!name.trim()) {
      setError('App name is required.')
      return
    }
    if (!slug.trim()) {
      setError('Slug is required.')
      return
    }
    if (scopes.length === 0) {
      setError('At least one scope is required.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/connected-apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim(), scopes }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Registration failed.')
        return
      }

      setApps((prev) => [...prev, data.app])
      setNewSecret({
        appName: data.app.name,
        appId: data.app.id,
        signingSecretRef: data.app.signingSecretRef,
        signingSecret: data.signingSecret,
      })
      setName('')
      setSlug('')
      setScopes(['webhook:receive'])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAction(id: string, action: 'suspend' | 'activate' | 'delete') {
    setActionError(null)
    try {
      if (action === 'delete') {
        const res = await fetch(`/api/admin/connected-apps/${id}`, { method: 'DELETE' })
        if (!res.ok) {
          const data = await res.json()
          setActionError(data.error ?? 'Delete failed.')
          return
        }
        setApps((prev) => prev.filter((a) => a.id !== id))
        if (newSecret?.appId === id) setNewSecret(null)
        return
      }

      const res = await fetch(`/api/admin/connected-apps/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) {
        setActionError(data.error ?? 'Action failed.')
        return
      }
      setApps((prev) => prev.map((a) => (a.id === id ? data.app : a)))
    } catch {
      setActionError('Network error. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Registration form */}
      <DashboardSectionPanel title="Register app" eyebrow="Scoped capability access">
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="app-name">
                App Name
              </label>
              <input
                id="app-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My External App"
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-400" htmlFor="app-slug">
                Slug
              </label>
              <input
                id="app-slug"
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="my-external-app"
                className="w-full rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-slate-500">
                Lowercase letters, numbers, hyphens only. Min 2 chars.
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-400">Scopes</p>
            <div className="flex flex-wrap gap-2">
              {ALL_SCOPES.map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => toggleScope(scope)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                    scopes.includes(scope)
                      ? 'bg-cyan-700 text-cyan-100'
                      : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                  }`}
                  disabled={submitting}
                >
                  {scope}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-900/40 px-4 py-2 text-sm text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-black text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
          >
            {submitting ? 'Registering…' : 'Register App'}
          </button>
        </form>
      </DashboardSectionPanel>

      {/* One-time secret banner */}
      {newSecret && (
        <section className="rounded-[1.6rem] border border-amber-600/50 bg-amber-900/20 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.18)]">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-400">
            ⚠ Save this signing secret now — it will not be shown again
          </p>
          <p className="mt-2 text-sm text-amber-200">
            App <strong>{newSecret.appName}</strong> registered. Set this as the environment
            variable <code className="font-mono text-amber-300">{newSecret.signingSecretRef}</code>{' '}
            on your infrastructure.
          </p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-amber-700/40 bg-slate-900 px-4 py-3">
            <code className="flex-1 break-all font-mono text-sm text-amber-200">
              {newSecret.signingSecret}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(newSecret.signingSecret)}
              className="shrink-0 rounded-lg bg-amber-700 px-3 py-1 text-xs font-bold text-white hover:bg-amber-600"
            >
              Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => setNewSecret(null)}
            className="mt-3 text-xs text-amber-500 underline hover:text-amber-400"
          >
            I have saved the secret — dismiss
          </button>
        </section>
      )}

      {/* App list */}
      {apps.length === 0 ? (
        <DashboardEmptyState title="No apps registered yet" detail="Use the form above to register the first app and assign explicit scopes before any runtime calls are accepted." />
      ) : (
        <DashboardSectionPanel title="Registered apps" eyebrow="Live registration truth">
          {actionError && (
            <p className="mb-3 rounded-xl bg-red-900/40 px-4 py-2 text-sm text-red-300">
              {actionError}
            </p>
          )}
          <div className="space-y-3">
            {apps.map((app) => (
              <div
                key={app.id}
                className="flex flex-col gap-4 rounded-[1.35rem] border border-slate-700/40 bg-slate-800/60 px-4 py-4 shadow-[0_18px_45px_rgba(0,0,0,0.14)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white">{app.name}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    slug: <span className="font-mono text-slate-300">{app.slug}</span>
                    {' · '}
                    id: <span className="font-mono text-slate-300">{app.id}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Scopes: {app.scopes.join(', ')}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Env var:{' '}
                    <span className="font-mono text-slate-500">{app.signingSecretRef}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DashboardStatusBadge value={app.status} map={{
                    active: { label: 'active', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-200' },
                    suspended: { label: 'suspended', className: 'border-amber-500/30 bg-amber-500/12 text-amber-200' },
                    archived: { label: 'archived', className: 'border-slate-700/60 bg-slate-800/60 text-slate-300' },
                  }} />
                  {app.status === 'active' ? (
                    <button
                      type="button"
                      onClick={() => handleAction(app.id, 'suspend')}
                      className="rounded-full border border-slate-600 bg-slate-700 px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-600"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAction(app.id, 'activate')}
                      className="rounded-full border border-emerald-700 bg-emerald-800 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-700"
                    >
                      Reactivate
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Deregister "${app.name}"? This cannot be undone.`,
                        )
                      ) {
                          handleAction(app.id, 'delete')
                        }
                      }}
                      className="rounded-full border border-red-500/30 bg-red-900/60 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-800/60"
                    >
                      Delete
                    </button>
                </div>
              </div>
            ))}
          </div>
        </DashboardSectionPanel>
      )}
    </div>
  )
}
