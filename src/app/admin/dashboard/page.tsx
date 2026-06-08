import Link from 'next/link'
import { ArrowRight, GitPullRequest, Library, Rocket, Settings2, Sparkles, Workflow } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const sections = [
  {
    href: '/admin/dashboard/studio',
    title: 'Playground',
    body: 'Generate images, songs, video, voice, chat, research, and avatar work.',
    icon: Sparkles,
    action: 'Generate',
  },
  {
    href: '/admin/dashboard/workbench',
    title: 'Repo Workbench',
    body: 'Fix code, run checks, create PRs, and deploy from one workflow.',
    icon: GitPullRequest,
    action: 'Fix code',
  },
  {
    href: '/admin/dashboard/app-builder',
    title: 'App Builder',
    body: 'Create and improve connected apps powered by AmarktAI.',
    icon: Rocket,
    action: 'Build app',
  },
  {
    href: '/admin/dashboard/outputs',
    title: 'Outputs',
    body: 'Open generated media, files, reports, diffs, and transcripts.',
    icon: Library,
    action: 'View work',
  },
  {
    href: '/admin/dashboard/network-apps',
    title: 'Connected Apps',
    body: 'Manage apps that use AmarktAI as their central AI engine.',
    icon: Workflow,
    action: 'Manage',
  },
  {
    href: '/admin/dashboard/settings',
    title: 'Control Center',
    body: 'Providers, keys, system checks, logs, and diagnostics.',
    icon: Settings2,
    action: 'Configure',
  },
]

export default function OverviewPage() {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-white/10 bg-[rgba(5,10,18,.64)] p-5 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              Home
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white md:text-3xl">
              What do you want to do?
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Pick one section. Create, build, review, or connect. Keep the work simple and clear.
            </p>
          </div>

          <Link
            href="/admin/dashboard/studio"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            Start generating <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <DashboardSectionCard key={section.href} {...section} />
        ))}
      </section>
    </div>
  )
}

function DashboardSectionCard({
  href,
  title,
  body,
  icon: Icon,
  action,
}: {
  href: string
  title: string
  body: string
  icon: typeof Sparkles
  action: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-white/10 bg-[rgba(5,10,18,.58)] p-4 backdrop-blur-xl transition hover:border-cyan-300/25 hover:bg-cyan-300/[0.045]"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowRight className="h-4 w-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-200" />
      </div>

      <h2 className="mt-4 text-base font-black text-white">{title}</h2>
      <p className="mt-2 min-h-[48px] text-sm leading-6 text-slate-400">{body}</p>

      <span className="mt-4 inline-flex text-[11px] font-black uppercase tracking-[0.14em] text-cyan-200">
        {action}
      </span>
    </Link>
  )
}
