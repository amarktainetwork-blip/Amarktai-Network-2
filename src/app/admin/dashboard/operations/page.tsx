import type React from 'react'
import { CheckCircle2, CircleAlert, Lock, PackageCheck, Route, ShieldCheck } from 'lucide-react'
import { PROVIDER_MESH, type ProviderCapability } from '@/lib/provider-mesh'
import { getDashboardRuntimeTruth } from '@/lib/runtime-capability-truth'
import { MEDIA_CAPABILITY_ROUTES } from '@/lib/media-capability-registry'
import { checkWritable, LOCAL_STORE_FILES } from '@/lib/local-json-store'

export const dynamic = 'force-dynamic'

type CapabilityRow = {
  label: string
  capabilities: ProviderCapability[]
  mediaKey?: keyof typeof MEDIA_CAPABILITY_ROUTES
  requiresStorage?: boolean
  requiresPermission?: boolean
  artifactType?: string
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  { label: 'Text/chat', capabilities: ['text'] },
  { label: 'Streaming chat', capabilities: ['streaming_text'] },
  { label: 'Research', capabilities: ['web_search', 'crawl'] },
  { label: 'Summarization', capabilities: ['text'] },
  { label: 'Translation', capabilities: ['text'] },
  { label: 'Embeddings', capabilities: ['embeddings'] },
  { label: 'Rerank', capabilities: ['rerank'] },
  { label: 'Image', capabilities: ['image'], mediaKey: 'image_generation', requiresStorage: true, artifactType: 'image' },
  { label: 'Image edit', capabilities: ['image'], requiresStorage: true, artifactType: 'image' },
  { label: 'OCR/image analysis', capabilities: ['vision'], artifactType: 'document' },
  { label: 'Video', capabilities: ['video'], mediaKey: 'video_generation', requiresStorage: true, artifactType: 'video' },
  { label: 'Image-to-video', capabilities: ['image_to_video'], requiresStorage: true, artifactType: 'video' },
  { label: 'Long-form planning', capabilities: ['reasoning', 'text'] },
  { label: 'Music/audio', capabilities: ['music', 'audio'], mediaKey: 'music_generation', requiresStorage: true, artifactType: 'music' },
  { label: 'TTS', capabilities: ['tts'], mediaKey: 'tts', requiresStorage: true, artifactType: 'audio' },
  { label: 'STT', capabilities: ['stt'], mediaKey: 'stt', requiresStorage: true, artifactType: 'transcript' },
  { label: 'Avatars', capabilities: ['avatar'], requiresStorage: true, artifactType: 'video' },
  { label: 'Voice clone with consent', capabilities: ['tts'], requiresPermission: true, requiresStorage: true, artifactType: 'audio' },
  { label: 'Adult gated', capabilities: ['text', 'image', 'video', 'tts'], mediaKey: 'adult_text', requiresPermission: true, requiresStorage: true, artifactType: 'gated media' },
  { label: 'Memory', capabilities: ['storage'], requiresStorage: true, artifactType: 'memory' },
  { label: 'Brand memory', capabilities: ['storage'], requiresStorage: true, artifactType: 'memory' },
  { label: 'RAG', capabilities: ['vector_store', 'embeddings'], requiresStorage: true, artifactType: 'knowledge' },
  { label: 'Website scraping', capabilities: ['crawl', 'render'], artifactType: 'source' },
  { label: 'Agents', capabilities: ['tools', 'queue'] },
  { label: 'Campaigns', capabilities: ['crawl', 'text', 'image'], requiresStorage: true, artifactType: 'campaign' },
  { label: 'Assets/artifacts', capabilities: ['storage'], requiresStorage: true, artifactType: 'artifact' },
  { label: 'Approvals', capabilities: ['storage'], requiresStorage: true, artifactType: 'approval' },
  { label: 'Scheduler/publishing', capabilities: ['queue'], artifactType: 'job' },
  { label: 'Monitoring', capabilities: ['queue', 'storage'], artifactType: 'status' },
]

export default async function OperationsPage() {
  const [truth, storage] = await Promise.all([
    getDashboardRuntimeTruth().catch(() => null),
    Promise.resolve(checkWritable(LOCAL_STORE_FILES.artifacts)),
  ])
  const connectedProviderIds = new Set((truth?.providers ?? []).filter((provider) => provider.connected).map((provider) => provider.key))

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-700/50 bg-slate-900/70 p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">Capabilities</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-white">Runtime capability matrix</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Readiness is derived from provider mesh capability metadata, media route registry, runtime truth, permissions, and storage proof. Unknown is never shown as working.
            </p>
          </div>
          <StatusPill status={truth ? 'runtime checked' : 'unverified'} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Runtime providers connected" value={String(connectedProviderIds.size)} status={connectedProviderIds.size ? 'ok' : 'warn'} />
        <Metric label="Storage" value={storage.writable ? 'writable' : 'failed'} status={storage.writable ? 'ok' : 'fail'} />
        <Metric label="Adult gate" value={truth?.adultGate.status ?? 'unverified'} status={truth?.adultGate.status === 'ready' ? 'ok' : 'warn'} />
        <Metric label="Blockers" value={String(truth?.blockers.length ?? 0)} status={truth?.blockers.length ? 'warn' : truth ? 'ok' : 'warn'} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/60">
        <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.7fr_0.7fr_0.8fr_0.8fr] gap-px bg-slate-800/70 text-xs">
          {['Capability', 'Status', 'Apps', 'Key', 'Endpoint', 'Storage/Permission', 'Proof'].map((heading) => (
            <div key={heading} className="bg-slate-950/80 px-3 py-2 font-black uppercase tracking-[0.12em] text-slate-500">{heading}</div>
          ))}
          {CAPABILITY_ROWS.map((row) => {
            const connected = PROVIDER_MESH.filter((node) => connectedProviderIds.has(node.id) && row.capabilities.some((capability) => node.capabilities.includes(capability)))
            const meshCandidates = PROVIDER_MESH.filter((node) => row.capabilities.some((capability) => node.capabilities.includes(capability)))
            const mediaRoute = row.mediaKey ? MEDIA_CAPABILITY_ROUTES[row.mediaKey] : null
            const needsEndpoint = Boolean(mediaRoute?.providers.some((entry) => !connectedProviderIds.has(entry.provider)))
            const needsStorage = Boolean(row.requiresStorage && !storage.writable)
            const needsPermission = Boolean(row.requiresPermission && truth?.adultGate.status !== 'ready')
            const status = connected.length && !needsStorage && !needsPermission ? 'available' : connected.length ? 'requires_setup' : 'unverified'
            return (
              <CapabilityLine
                key={row.label}
                label={row.label}
                status={status}
                apps={status === 'available' ? 'available' : 'blocked/unverified'}
                requiresKey={meshCandidates.length > connected.length}
                requiresEndpoint={needsEndpoint}
                storagePermission={[
                  needsStorage ? 'storage failed' : row.requiresStorage ? 'storage required' : 'not required',
                  needsPermission ? 'permission required' : row.requiresPermission ? 'permission gated' : '',
                ].filter(Boolean).join(' / ')}
                artifactType={row.artifactType ?? 'none'}
                proof={status === 'available' ? 'route ready' : needsStorage || needsPermission || needsEndpoint ? 'requires setup' : 'no connected route'}
              />
            )
          })}
        </div>
      </section>
    </div>
  )
}

function CapabilityLine(props: {
  label: string
  status: string
  apps: string
  requiresKey: boolean
  requiresEndpoint: boolean
  storagePermission: string
  artifactType: string
  proof: string
}) {
  return (
    <>
      <Cell strong icon={<Route />}>{props.label}</Cell>
      <Cell><StatusPill status={props.status} /></Cell>
      <Cell>{props.apps}</Cell>
      <Cell>{props.requiresKey ? 'yes' : 'no'}</Cell>
      <Cell>{props.requiresEndpoint ? 'yes' : 'no'}</Cell>
      <Cell>{props.storagePermission}</Cell>
      <Cell>{props.artifactType} / {props.proof}</Cell>
    </>
  )
}

function Cell({ children, strong = false, icon }: { children: React.ReactNode; strong?: boolean; icon?: React.ReactElement }) {
  return (
    <div className={['min-h-14 bg-slate-950/55 px-3 py-3 text-xs leading-5', strong ? 'font-black text-slate-100' : 'font-semibold text-slate-400'].join(' ')}>
      <span className="flex items-start gap-2">
        {icon && <span className="mt-0.5 text-cyan-300 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
        <span>{children}</span>
      </span>
    </div>
  )
}

function Metric({ label, value, status }: { label: string; value: string; status: 'ok' | 'warn' | 'fail' }) {
  const Icon = status === 'ok' ? CheckCircle2 : status === 'fail' ? CircleAlert : ShieldCheck
  const color = status === 'ok' ? 'text-emerald-300' : status === 'fail' ? 'text-red-300' : 'text-amber-300'
  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-4">
      <Icon className={['h-5 w-5', color].join(' ')} />
      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-100">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone = status === 'available' || status === 'runtime checked'
    ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-300'
    : status === 'requires_setup'
      ? 'border-amber-500/20 bg-amber-500/8 text-amber-300'
      : 'border-slate-600/40 bg-slate-800/70 text-slate-300'
  const Icon = status === 'available' || status === 'runtime checked' ? PackageCheck : status === 'requires_setup' ? Lock : CircleAlert
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', tone].join(' ')}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}
