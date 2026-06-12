/**
 * Settings page — provider setup, API keys, storage, and policy.
 *
 * User-friendly setup cards. No raw env dumps. No backend wording.
 * Shows: Ready / Needs setup / Not configured in plain language.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Key,
  Loader2,
  RefreshCw,
  Server,
  Settings2,
  Shield,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ProviderSetup = {
  id: string
  displayName: string
  configured: boolean
  state: 'ready' | 'missing' | 'invalid'
  acceptedEnvVars: string[]
  blocker: string | null
}

type StorageSetup = {
  configured: boolean
  writable: boolean
  readable: boolean
  driver: string
  root: string
}

// ── Provider setup instructions ───────────────────────────────────────────────

const PROVIDER_DOCS: Record<string, { url: string; keyName: string; hint: string }> = {
  genx: { url: 'https://query.genx.sh', keyName: 'GENX_API_KEY', hint: 'Text, image, video, audio, music, avatar, TTS, STT' },
  huggingface: { url: 'https://huggingface.co/settings/tokens', keyName: 'HUGGINGFACE_API_KEY', hint: 'Text, image, audio, STT, embeddings, specialist models' },
  qwen: { url: 'https://dashscope.aliyuncs.com', keyName: 'QWEN_API_KEY', hint: 'Text, image, video, audio, embeddings, async jobs' },
  mimo: { url: 'https://api.xiaomimimo.com', keyName: 'MIMO_API_KEY', hint: 'Text, reasoning, vision, audio, TTS, STT, web search' },
  groq: { url: 'https://console.groq.com/keys', keyName: 'GROQ_API_KEY', hint: 'Ultra-fast text, reasoning, STT, TTS' },
  together: { url: 'https://api.together.xyz/settings/api-keys', keyName: 'TOGETHER_API_KEY', hint: 'Text, image, embeddings, rerank, open models' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderSetup[]>([])
  const [storage, setStorage] = useState<StorageSetup | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    try {
      const res = await fetch('/api/admin/system/ai-deployment-readiness')
      const data = await res.json()
      setProviders(data.providers ?? [])
      setStorage(data.artifacts?.storage ?? null)
    } catch {
      // silently fail — show empty state
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const readyCount = providers.filter((p) => p.state === 'ready').length

  return (
    <div className="space-y-8">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-400">Settings</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white lg:text-3xl">
            Provider Setup & Configuration
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Add your API keys to activate AI capabilities. Keys are stored securely on your server.
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Summary strip ──────────────────────────────────────────────────── */}
      {!loading && (
        <div className="flex flex-wrap gap-3">
          <StatusPill
            label={`${readyCount} of ${providers.length} providers ready`}
            status={readyCount === providers.length ? 'ready' : readyCount > 0 ? 'partial' : 'missing'}
          />
          <StatusPill
            label={storage?.writable ? 'Storage ready' : 'Storage needs setup'}
            status={storage?.writable ? 'ready' : 'missing'}
          />
        </div>
      )}

      {/* ── Provider setup cards ───────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Key className="h-4 w-4" />
          AI Provider API Keys
        </h2>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <p className="text-sm text-slate-500">Checking provider configuration…</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {providers.map((provider) => {
              const docs = PROVIDER_DOCS[provider.id]
              const isReady = provider.state === 'ready'

              return (
                <div
                  key={provider.id}
                  className={[
                    'rounded-2xl border p-5 transition',
                    isReady
                      ? 'border-emerald-800/40 bg-emerald-900/10'
                      : 'border-amber-800/30 bg-amber-900/8',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={[
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                          isReady
                            ? 'border-emerald-700/40 bg-emerald-900/30'
                            : 'border-amber-700/30 bg-amber-900/20',
                        ].join(' ')}
                      >
                        {isReady
                          ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                          : <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
                        }
                      </div>
                      <div>
                        <p className="font-black text-slate-100">{provider.displayName}</p>
                        {docs && <p className="text-xs text-slate-500">{docs.hint}</p>}
                      </div>
                    </div>
                    <span
                      className={[
                        'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
                        isReady
                          ? 'bg-emerald-900/60 text-emerald-300'
                          : 'bg-amber-900/60 text-amber-300',
                      ].join(' ')}
                    >
                      {isReady ? 'Ready' : 'Needs setup'}
                    </span>
                  </div>

                  {!isReady && (
                    <div className="mt-4 rounded-xl border border-amber-800/30 bg-amber-900/15 p-3">
                      <p className="text-xs font-bold text-amber-200">
                        Add your API key to activate this provider.
                      </p>
                      {docs && (
                        <div className="mt-2 flex items-center gap-2">
                          <code className="rounded bg-slate-900/60 px-2 py-0.5 font-mono text-[11px] text-amber-300">
                            {docs.keyName}
                          </code>
                          <a
                            href={docs.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs font-bold text-amber-400 transition hover:text-amber-300"
                          >
                            Get key <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  {isReady && (
                    <p className="mt-3 text-xs text-emerald-300/70">
                      Connected and ready to route capabilities.
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Storage setup ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Server className="h-4 w-4" />
          Artifact Storage
        </h2>

        {loading ? (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
            <p className="text-sm text-slate-500">Checking storage…</p>
          </div>
        ) : storage ? (
          <div
            className={[
              'rounded-2xl border p-5',
              storage.writable
                ? 'border-emerald-800/40 bg-emerald-900/10'
                : 'border-amber-800/30 bg-amber-900/8',
            ].join(' ')}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    'flex h-9 w-9 items-center justify-center rounded-xl border',
                    storage.writable
                      ? 'border-emerald-700/40 bg-emerald-900/30'
                      : 'border-amber-700/30 bg-amber-900/20',
                  ].join(' ')}
                >
                  {storage.writable
                    ? <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                    : <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
                  }
                </div>
                <div>
                  <p className="font-black text-slate-100">Artifact Storage</p>
                  <p className="text-xs text-slate-500">
                    {storage.writable ? 'Writable and ready' : 'Needs configuration'}
                  </p>
                </div>
              </div>
              <span
                className={[
                  'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide',
                  storage.writable
                    ? 'bg-emerald-900/60 text-emerald-300'
                    : 'bg-amber-900/60 text-amber-300',
                ].join(' ')}
              >
                {storage.writable ? 'Ready' : 'Needs setup'}
              </span>
            </div>
            {!storage.writable && (
              <div className="mt-4 rounded-xl border border-amber-800/30 bg-amber-900/15 p-3">
                <p className="text-xs font-bold text-amber-200">
                  Configure your storage path to save artifacts.
                </p>
                <code className="mt-1 block font-mono text-[11px] text-amber-300">
                  AMARKTAI_STORAGE_ROOT=/var/www/amarktai/storage
                </code>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <p className="text-sm text-slate-500">Storage status unavailable.</p>
          </div>
        )}
      </section>

      {/* ── Security & policy ──────────────────────────────────────────────── */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-400">
          <Shield className="h-4 w-4" />
          Security & Policy
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Connected App Secrets', desc: 'Manage signing secrets for registered connected apps', href: '/admin/dashboard/connected-apps' },
            { label: 'Content Safety Policy', desc: 'Configure safe mode, adult mode, and content filters', href: '/admin/dashboard/settings' },
          ].map(({ label, desc, href }) => (
            <a
              key={label}
              href={href}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition hover:border-slate-700 hover:bg-slate-900/70"
            >
              <div>
                <p className="font-bold text-slate-200">{label}</p>
                <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
            </a>
          ))}
        </div>
      </section>

      {/* ── Advanced settings link ─────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 p-5">
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-slate-500" />
          <div>
            <p className="font-bold text-slate-300">Advanced configuration</p>
            <p className="text-xs text-slate-500">
              Database, Redis, SMTP, and other infrastructure settings are configured via environment variables on your server.
            </p>
          </div>
        </div>
      </div>

    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusPill({ label, status }: { label: string; status: 'ready' | 'partial' | 'missing' }) {
  const styles = {
    ready: 'border-emerald-800/40 bg-emerald-900/20 text-emerald-300',
    partial: 'border-amber-800/30 bg-amber-900/15 text-amber-300',
    missing: 'border-amber-800/30 bg-amber-900/15 text-amber-300',
  }
  const dots = {
    ready: 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]',
    partial: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
    missing: 'bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]',
  }

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dots[status]}`} />
      {label}
    </div>
  )
}
