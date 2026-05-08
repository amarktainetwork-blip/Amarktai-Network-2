'use client'

import '@fontsource-variable/inter'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, ChevronRight, LogOut, Menu, Network, Shield, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

type HeaderStatus = {
  appStatus: string
  activeRoute: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [status, setStatus] = useState<HeaderStatus>({ appStatus: 'Initializing', activeRoute: 'Auto route' })
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch('/api/admin/system/status').then((res) => res.json()).catch(() => null),
      fetch('/api/admin/ai-routing').then((res) => res.json()).catch(() => null),
    ]).then(([system, routing]) => {
      if (!mounted) return
      const storage = system?.status?.storage?.status ?? 'Needs test'
      const route = routing?.samples?.[0]
      setStatus({
        appStatus: storage,
        activeRoute: route?.selectedProvider && route?.selectedModel
          ? `${route.selectedProvider}/${route.selectedModel}`
          : 'Auto route',
      })
      setPulse(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setPulse((p) => !p), 3000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }, [router])

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const activeItem = DASHBOARD_NAV_ITEMS.find((item) => isActive(item.href)) ?? DASHBOARD_NAV_ITEMS[0]

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo / Brand */}
      <div className="px-5 py-6">
        <Link href="/admin/dashboard" className="group block">
          <div className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-slate-900 shadow-[0_0_28px_rgba(14,165,233,0.18)]">
              <Network className="h-5 w-5 text-sky-300" />
              <span
                className="absolute inset-0 rounded-xl ring-1 ring-cyan-400/40 transition-all duration-700"
                style={{ boxShadow: pulse ? '0 0 16px 2px rgba(34,211,238,0.25)' : 'none' }}
              />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-slate-100">AmarktAI Network</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-400/70">Operations Console</p>
            </div>
          </div>
        </Link>
      </div>

      {/* System vitals strip */}
      <div className="mx-4 mb-4 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] transition-opacity duration-700"
            style={{ opacity: pulse ? 1 : 0.4 }}
          />
          <p className="truncate text-[10px] font-bold text-slate-400">{status.activeRoute}</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-1" aria-label="Dashboard navigation">
        <div className="space-y-1">
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  'group flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all duration-200',
                  active
                    ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.08)]'
                    : 'border-transparent text-slate-500 hover:border-slate-700/60 hover:bg-slate-800/50 hover:text-slate-300',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <item.icon
                    className={['h-4 w-4 shrink-0 transition-colors', active ? 'text-cyan-400' : 'text-slate-600 group-hover:text-cyan-400/70'].join(' ')}
                  />
                  <span className="truncate font-semibold">{item.label}</span>
                </span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-cyan-500/70" />}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-xs font-bold text-slate-500 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-slate-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div
      className="flex min-h-screen bg-[#030712] text-slate-100"
      style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}
    >
      {/* Runtime background field */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-cyan-950/20 blur-[120px]" />
        <div className="absolute -right-64 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-950/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-sky-950/15 blur-[100px]" />
      </div>

      {/* Sidebar - desktop */}
      <aside className="relative hidden w-64 shrink-0 border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-2xl lg:block">
        {sidebar}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-2xl">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Open navigation"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-cyan-500/80">AmarktAI Network</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-base font-black tracking-tight text-slate-100">{activeItem.label}</h1>
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <StatusChip icon={<Activity className="h-3.5 w-3.5" />} label={status.appStatus} />
              <StatusChip icon={<Shield className="h-3.5 w-3.5" />} label={status.activeRoute} dim />
            </div>
          </div>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[86vw] border-r border-slate-800/60 bg-slate-950/95 backdrop-blur-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  )
}

function StatusChip({ icon, label, dim = false }: { icon: React.ReactNode; label: string; dim?: boolean }) {
  return (
    <div className={['flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5', dim ? 'border-slate-800 bg-slate-900/50' : 'border-slate-700/60 bg-slate-800/60'].join(' ')}>
      <span className={dim ? 'text-slate-600' : 'text-cyan-400'}>{icon}</span>
      <p className="max-w-44 truncate text-[11px] font-bold text-slate-400">{label}</p>
    </div>
  )
}
