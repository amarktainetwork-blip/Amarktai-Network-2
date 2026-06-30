import type React from 'react'
import { AppWindow, Globe, Key, Webhook } from 'lucide-react'
import { PLANNED_CONNECTED_APPS } from '@/lib/dashboard-control-room'

export const dynamic = 'force-dynamic'

export default function AppsPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6 lg:p-8">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">App Connections</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-white">External app connections</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          External apps connect here to request capabilities. Apps own their users, databases, and UI. AmarktAI Network owns capability execution.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PLANNED_CONNECTED_APPS.map((app) => (
          <div key={app.appId} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <AppWindow className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white">{app.displayName}</h3>
              </div>
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black text-amber-200">{app.environment}</span>
            </div>
            <p className="mt-2 font-mono text-[11px] text-slate-500">{app.appId}</p>
            <div className="mt-3">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Default Capabilities</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {app.defaultCapabilities.map((cap) => (
                  <span key={cap} className="rounded-full border border-cyan-400/15 bg-cyan-400/5 px-2 py-0.5 text-[10px] font-bold text-cyan-300">{cap}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
        <h2 className="font-black text-white">Connection Contract</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Key, label: 'API Keys', desc: 'Per-app authentication with capability permissions' },
            { icon: Webhook, label: 'Webhooks', desc: 'Callback delivery with retry and signed payloads' },
            { icon: Globe, label: 'Capabilities', desc: 'Apps request capabilities, never providers or models' },
            { icon: AppWindow, label: 'Budgets', desc: 'Per-app rate limits and monthly spend caps' },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-950/55 p-4">
              <item.icon className="h-4 w-4 text-cyan-400" />
              <p className="mt-2 text-xs font-black text-slate-200">{item.label}</p>
              <p className="mt-1 text-[11px] text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
