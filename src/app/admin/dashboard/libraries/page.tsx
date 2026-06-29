import type React from 'react'
import { CheckCircle2, CircleDashed, AlertTriangle, CircleSlash, Package } from 'lucide-react'

export const dynamic = 'force-dynamic'

type LibraryStatus = 'planned' | 'installed' | 'wired' | 'proven' | 'blocked'

interface PlatformLibrary {
  name: string
  purpose: string
  status: LibraryStatus
  usedByCapabilities: string[]
  installedPackageName: string
  nextAction: string
}

const PLATFORM_LIBRARIES: PlatformLibrary[] = [
  {
    name: 'Crawlee',
    purpose: 'Web crawling and scraping automation for research and data collection capabilities',
    status: 'planned',
    usedByCapabilities: ['web_research', 'data_collection'],
    installedPackageName: 'crawlee',
    nextAction: 'Install crawlee package and wire to research capability route.',
  },
  {
    name: 'Qdrant',
    purpose: 'Vector database client for semantic search, memory retrieval, and embeddings storage',
    status: 'planned',
    usedByCapabilities: ['semantic_search', 'memory_retrieval', 'embeddings'],
    installedPackageName: '@qdrant/js-client-rest',
    nextAction: 'Install Qdrant client and configure QDRANT_URL environment variable.',
  },
  {
    name: 'ffmpeg',
    purpose: 'Video and audio processing, transcoding, and format conversion',
    status: 'planned',
    usedByCapabilities: ['video_generation', 'audio_processing', 'adult_video'],
    installedPackageName: 'fluent-ffmpeg',
    nextAction: 'Ensure ffmpeg binary is present on VPS and install fluent-ffmpeg package.',
  },
  {
    name: 'BullMQ',
    purpose: 'Redis-backed job queue for async task execution, scheduling, and worker management',
    status: 'wired',
    usedByCapabilities: ['job_queue', 'scheduler', 'async_execution'],
    installedPackageName: 'bullmq',
    nextAction: 'Prove queue backend by running a successful queued job.',
  },
  {
    name: 'Prisma',
    purpose: 'ORM for PostgreSQL — artifact storage, proof records, user data, provider keys',
    status: 'proven',
    usedByCapabilities: ['storage', 'proof_recording', 'auth'],
    installedPackageName: '@prisma/client',
    nextAction: 'No action required.',
  },
  {
    name: 'Sharp',
    purpose: 'High-performance image processing, resizing, and format conversion',
    status: 'planned',
    usedByCapabilities: ['image_generation', 'image_processing'],
    installedPackageName: 'sharp',
    nextAction: 'Install sharp package and wire to image capability post-processing.',
  },
  {
    name: 'Langchain',
    purpose: 'LLM orchestration, prompt chaining, and tool-calling scaffolding',
    status: 'planned',
    usedByCapabilities: ['chat', 'research', 'agent_execution'],
    installedPackageName: 'langchain',
    nextAction: 'Evaluate whether Langchain is needed or if direct provider calls suffice.',
  },
  {
    name: 'NextAuth',
    purpose: 'Authentication and session management for admin and app users',
    status: 'wired',
    usedByCapabilities: ['auth', 'session_management'],
    installedPackageName: 'next-auth',
    nextAction: 'Prove admin login flow end-to-end.',
  },
]

const STATUS_TONE: Record<LibraryStatus, string> = {
  planned: 'border-slate-600/50 bg-slate-800/80 text-slate-300',
  installed: 'border-blue-400/20 bg-blue-400/10 text-blue-200',
  wired: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200',
  proven: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  blocked: 'border-red-300/20 bg-red-300/10 text-red-100',
}

const STATUS_LABEL: Record<LibraryStatus, string> = {
  planned: 'Planned',
  installed: 'Installed',
  wired: 'Wired',
  proven: 'Proven',
  blocked: 'Blocked',
}

export default function LibrariesPage() {
  const summary = {
    planned: PLATFORM_LIBRARIES.filter((l) => l.status === 'planned').length,
    installed: PLATFORM_LIBRARIES.filter((l) => l.status === 'installed').length,
    wired: PLATFORM_LIBRARIES.filter((l) => l.status === 'wired').length,
    proven: PLATFORM_LIBRARIES.filter((l) => l.status === 'proven').length,
    blocked: PLATFORM_LIBRARIES.filter((l) => l.status === 'blocked').length,
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-cyan-300/15 bg-[#071019] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-mono text-xs font-black uppercase tracking-[0.22em] text-cyan-300">Libraries</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white">Libraries &amp; Integrations</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
              Third-party libraries and integrations used by platform capabilities.
              Status: planned=not started, installed=package present, wired=connected to routes, proven=live test passed, blocked=dependency missing.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LegendPill status="planned" />
            <LegendPill status="installed" />
            <LegendPill status="wired" />
            <LegendPill status="proven" />
            <LegendPill status="blocked" />
          </div>
        </div>
      </section>

      <section className="grid gap-2 text-xs sm:grid-cols-5">
        <Summary label="Planned" value={summary.planned} />
        <Summary label="Installed" value={summary.installed} />
        <Summary label="Wired" value={summary.wired} />
        <Summary label="Proven" value={summary.proven} />
        <Summary label="Blocked" value={summary.blocked} />
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
        <div className="grid grid-cols-[1fr_1.6fr_0.75fr_1.2fr_1.2fr_1.4fr] gap-px bg-slate-800/70 text-xs">
          {['Name', 'Purpose', 'Status', 'Used by capabilities', 'Package', 'Next action'].map((h) => (
            <div key={h} className="bg-slate-950/80 px-3 py-2 font-black uppercase tracking-[0.12em] text-slate-500">
              {h}
            </div>
          ))}
          {PLATFORM_LIBRARIES.map((lib) => (
            <LibraryRow key={lib.name} lib={lib} />
          ))}
        </div>
      </section>
    </div>
  )
}

function LibraryRow({ lib }: { lib: PlatformLibrary }) {
  return (
    <>
      <Cell strong icon={<Package />}>{lib.name}</Cell>
      <Cell>{lib.purpose}</Cell>
      <Cell><StatusPill status={lib.status} /></Cell>
      <Cell>{lib.usedByCapabilities.join(', ')}</Cell>
      <Cell><span className="font-mono">{lib.installedPackageName}</span></Cell>
      <Cell>{lib.nextAction}</Cell>
    </>
  )
}

function StatusPill({ status }: { status: LibraryStatus }) {
  const Icon =
    status === 'proven' ? CheckCircle2 :
    status === 'wired' ? CircleDashed :
    status === 'installed' ? CircleDashed :
    status === 'blocked' ? AlertTriangle :
    CircleSlash
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', STATUS_TONE[status]].join(' ')}>
      <Icon className="h-3.5 w-3.5" />
      {STATUS_LABEL[status]}
    </span>
  )
}

function LegendPill({ status }: { status: LibraryStatus }) {
  return (
    <span className={['inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black', STATUS_TONE[status]].join(' ')}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function Cell({ children, strong = false, icon }: { children: React.ReactNode; strong?: boolean; icon?: React.ReactElement }) {
  return (
    <div className={['min-h-16 bg-slate-950/55 px-3 py-3 text-xs leading-5', strong ? 'font-black text-slate-100' : 'font-semibold text-slate-400'].join(' ')}>
      <span className="flex items-start gap-2">
        {icon && <span className="mt-0.5 text-cyan-300 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
        <span>{children}</span>
      </span>
    </div>
  )
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/65 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}
