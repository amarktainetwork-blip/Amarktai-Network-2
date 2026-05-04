'use client'

import '@fontsource-variable/inter'
import { useCallback, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AivaAssistantPanel from '@/components/admin/AivaAssistantPanel'
import {
  Activity,
  AppWindow,
  Bot,
  Brain,
  Database,
  Film,
  GitBranch,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  match?: string[]
}

// Dashboard foundation redesign: 11 canonical sections only.
// /admin/dashboard remains a redirect alias and is not a visible nav item.
// Health, readiness and proof are consolidated under Diagnostics.
// AmarktAI Assistant disabled by default — enable with NEXT_PUBLIC_AIVA_ENABLED=true (legacy env var name).
const NAV_ITEMS = [
  { href: '/admin/dashboard/command-center', label: 'Command Center', icon: Activity },
  { href: '/admin/dashboard/amarktai-assistant', label: 'AmarktAI Assistant', icon: Bot, match: ['/admin/dashboard/aiva'] },
  { href: '/admin/dashboard/apps', label: 'Apps', icon: AppWindow },
  { href: '/admin/dashboard/agents', label: 'Agents', icon: Users },
  { href: '/admin/dashboard/repo-workbench', label: 'Repo Workbench', icon: GitBranch },
  { href: '/admin/dashboard/research', label: 'Research', icon: Search },
  { href: '/admin/dashboard/creative-studio', label: 'Creative Studio', icon: Film, match: ['/admin/dashboard/media-studio'] },
  { href: '/admin/dashboard/memory', label: 'Memory', icon: Brain, match: ['/admin/dashboard/memory-emotions'] },
  { href: '/admin/dashboard/actions', label: 'Actions', icon: ShieldCheck, match: ['/admin/dashboard/ai-engine/aiva-actions'] },
  { href: '/admin/dashboard/diagnostics', label: 'Diagnostics', icon: Database, match: ['/admin/dashboard/system-health'] },
  { href: '/admin/dashboard/settings', label: 'Settings', icon: Settings2 },
] satisfies NavItem[]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }, [router])

  const isActive = (item: NavItem) => {
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) return true
    return item.match?.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ?? false
  }

  const activeItem = NAV_ITEMS.find(isActive)
  const showAssistantPanel = process.env.NEXT_PUBLIC_AIVA_ENABLED === 'true'

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="h-20 border-b border-white/10 px-5">
        <Link href="/admin/dashboard/command-center" className="flex h-full items-center gap-3">
          <div className="w-10 h-10 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300 to-violet-500 text-xs font-black text-slate-950 shadow-lg shadow-cyan-950/20 hidden lg:flex">AN</div>
          <div>
            <p className="text-sm font-black text-white">
              Amarkt<span className="text-blue-400">AI</span> Network
            </p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-cyan-200/70">AmarktAI Console</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">Operator console</p>
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm transition ${
                  active
                    ? 'border border-cyan-400/30 bg-cyan-400/10 text-white shadow-sm shadow-cyan-950/20'
                    : 'border border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-cyan-300" />
            <span className="flex-1 text-xs font-semibold text-slate-300">Operator</span>
            <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-red-300">Sign out</button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-slate-600">Settings is the only key/config surface. Diagnostics is the only health/readiness surface.</p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#030712]" style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}>
      <aside className={`hidden border-r border-white/10 bg-[#070d1a]/95 lg:block ${sidebarOpen ? 'w-72' : 'w-0 overflow-hidden'}`}>{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030712]/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <button className="hidden rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:block" onClick={() => setSidebarOpen((value) => !value)}>
                <Menu className="h-4 w-4" />
              </button>
              <button className="rounded-xl p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setMobileOpen((value) => !value)}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-600">Dashboard</p>
                <p className="text-sm font-bold text-white">{activeItem?.label ?? 'Command Center'}</p>
              </div>
            </div>
            <Link href="/admin/dashboard/settings" className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white">Settings</Link>
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-80 max-w-[86vw] border-r border-white/10 bg-[#070d1a]">{sidebar}</aside>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {showAssistantPanel && <AivaAssistantPanel />}
    </div>
  )
}
