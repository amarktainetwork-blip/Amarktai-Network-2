'use client'

import '@fontsource-variable/inter'
import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import AivaAssistantPanel from '@/components/admin/AivaAssistantPanel'
import {
  Menu,
  X,
  User,
  AppWindow,
  Cpu,
  Archive,
  Settings2,
  Activity,
  GitBranch,
  Film,
  LayoutDashboard,
  Terminal,
  Compass,
} from 'lucide-react'

// Canonical nav sections — Command Center first, live readiness visible, no duplicate hidden workflow.
const NAV_ITEMS: Array<{ href: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }> = [
  { href: '/admin/dashboard/command-center', label: 'Command Center',  icon: Terminal        },
  { href: '/admin/dashboard/live-readiness', label: 'Live Readiness',  icon: Compass         },
  { href: '/admin/dashboard',                label: 'Overview',        icon: LayoutDashboard },
  { href: '/admin/dashboard/repo-workbench', label: 'Repo Workbench',  icon: GitBranch       },
  { href: '/admin/dashboard/ai-engine',      label: 'AI Engine',       icon: Cpu             },
  { href: '/admin/dashboard/media-studio',   label: 'Media Studio',    icon: Film            },
  { href: '/admin/dashboard/apps',           label: 'Apps & Agents',   icon: AppWindow       },
  { href: '/admin/dashboard/artifacts',      label: 'Artifacts & Jobs',icon: Archive         },
  { href: '/admin/dashboard/system-health',  label: 'System Health',   icon: Activity        },
  { href: '/admin/dashboard/settings',       label: 'Settings',        icon: Settings2       },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }, [router])

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard'
    return pathname === href || pathname.startsWith(href + '/')
  }

  // Aiva disabled by default — enable with NEXT_PUBLIC_AIVA_ENABLED=true
  const showAivaAssistant = process.env.NEXT_PUBLIC_AIVA_ENABLED === 'true'

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="h-16 border-b border-white/10 px-5">
        <Link href="/admin/dashboard/command-center" className="flex h-full items-center gap-2">
          <div className="rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 px-2 py-1 text-xs font-black text-white shadow-lg shadow-cyan-950/20">AN</div>
          <div>
            <p className="text-sm font-bold text-white">Amarktai Network</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Aiva Operator Console</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
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
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2">
          <User className="h-4 w-4 text-cyan-300" />
          <span className="flex-1 text-xs text-slate-300">Operator</span>
          <button onClick={handleLogout} className="text-xs text-slate-400 hover:text-red-300">Sign out</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#030712]" style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}>
      <aside className={`hidden border-r border-white/10 bg-[#070d1a]/95 lg:block ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>{sidebar}</aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#030712]/90 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-2">
              <button className="hidden rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:block" onClick={() => setSidebarOpen(v => !v)}>
                <Menu className="h-4 w-4" />
              </button>
              <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden" onClick={() => setMobileOpen(v => !v)}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
                {NAV_ITEMS.find(s => isActive(s.href))?.label ?? 'Dashboard'}
              </span>
            </div>
            <Link href="/admin/dashboard/command-center" className="text-xs text-slate-500 hover:text-cyan-300">Aiva Command Center</Link>
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 border-r border-white/10 bg-[#070d1a]">{sidebar}</aside>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      {/* Aiva floating assistant — one surface only; disabled by default; set NEXT_PUBLIC_AIVA_ENABLED=true to enable */}
      {showAivaAssistant && <AivaAssistantPanel />}
    </div>
  )
}
