import type React from 'react'
import { CAPABILITY_STUDIOS, PLANNED_CONNECTED_APPS } from '@/lib/dashboard-control-room'

export const dynamic = 'force-dynamic'

const REQUEST_EXAMPLE = {
  capability: 'music.song',
  input: {
    concept: 'A hopeful launch song with amapiano and gospel influence.',
  },
  context: {
    appId: 'music-app',
    environment: 'staging',
    tenantId: 'tenant_demo',
    userId: 'user_demo',
  },
  assetReferences: [
    { type: 'brand_guide_pdf', url: 'signed-app-url' },
    { type: 'logo', url: 'signed-app-url' },
  ],
  controls: {
    budgetTier: 'balanced',
    qualityTier: 'standard',
    webhookUrl: 'https://app.example.com/webhooks/amarktai',
  },
}

const RESPONSE_EXAMPLE = {
  capability: 'music.song',
  success: true,
  provider: 'runtime-selected-provider',
  model: 'runtime-selected-model',
  artifactId: 'artifact-id',
  storageUrl: 'storage-url',
  proofStatus: 'needs_proof_or_passed_after_real_execution',
  attempts: [],
}

const CONNECTION_FIELDS = [
  'app ID',
  'display name',
  'environment: dev/staging/prod',
  'API key status',
  'webhook URL',
  'webhook secret status',
  'callback domain allowlist',
  'allowed capabilities',
  'disabled capabilities',
  'budget limits',
  'rate limits',
  'default brand pack',
  'default knowledge set',
  'app-specific presets',
  'test webhook',
  'simulate app request',
  'artifact delivery policy',
  'app logs',
  'usage',
]

export default function AppRuntimePage() {
  const appConnectionStudio = CAPABILITY_STUDIOS.find((studio) => studio.id === 'app-connections')!

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-[#071019] p-6">
        <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Connect</p>
        <h1 className="mt-2 text-2xl font-black text-white">App Connections</h1>
        <p className="mt-1 max-w-4xl text-sm leading-7 text-slate-400">
          External apps own users, storage, UI, workflows, and publishing. AmarktAI Network owns capability execution, jobs, artifacts, webhooks, provider routing, and proof.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        {PLANNED_CONNECTED_APPS.map((app) => (
          <article key={app.appId} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
            <p className="text-sm font-black text-white">{app.displayName}</p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-amber-200">{app.environment}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {app.defaultCapabilities.map((capability) => (
                <span key={capability} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-400">
                  {capability}
                </span>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Connection contract">
          <div className="grid gap-2 sm:grid-cols-2">
            {CONNECTION_FIELDS.map((field) => (
              <span key={field} className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2 text-xs font-bold text-slate-300">
                {field}
              </span>
            ))}
          </div>
        </Panel>

        <Panel title="Capability permission model">
          <p className="text-sm leading-7 text-slate-400">{appConnectionStudio.purpose}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {CAPABILITY_STUDIOS.filter((studio) => studio.appsCanUse.length > 0).map((studio) => (
              <div key={studio.id} className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
                <p className="text-sm font-black text-slate-100">{studio.displayName}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">{studio.capabilityIds.slice(0, 4).join(', ')}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Panel title="App request: no provider or model">
          <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(REQUEST_EXAMPLE, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-slate-500">Provider/model override fields are intentionally absent from app-facing request examples.</p>
        </Panel>

        <Panel title="Runtime result: provider in proof only">
          <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(RESPONSE_EXAMPLE, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-slate-500">Provider and model are response/proof metadata after runtime selection.</p>
        </Panel>
      </section>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
      <h2 className="font-black text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}
