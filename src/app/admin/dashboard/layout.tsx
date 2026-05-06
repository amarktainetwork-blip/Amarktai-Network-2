'use client'

import '@fontsource-variable/inter'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, BriefcaseBusiness, ChevronRight, LogOut, Menu, UserCircle2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

type HeaderStatus = {
  appStatus: string
  activeRoute: string
  jobs: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [status, setStatus] = useState<HeaderStatus>({
    appStatus: 'Checking',
    activeRoute: 'Auto route',
    jobs: 'Jobs',
  })

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
        jobs: 'Notifications',
      })
    })
    return () => { mounted = false }
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
      <div className="px-5 py-6">
        <Link href="/admin/dashboard" className="group block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-indigo-500 text-slate-950 shadow-[0_18px_60px_rgba(14,165,233,0.35)]">
              <BriefcaseBusiness className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-black tracking-tight text-slate-50">AmarktAI Network</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-200/70">Superbrain Console</p>
            </div>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Dashboard navigation">
        <div className="space-y-1.5">
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  'group flex items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm transition',
                  active
                    ? 'border-cyan-300/40 bg-white/70 text-slate-950 shadow-[0_18px_60px_rgba(15,23,42,0.10)]'
                    : 'border-transparent text-slate-500 hover:border-white/60 hover:bg-white/45 hover:text-slate-950',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <item.icon className={['h-4 w-4 shrink-0', active ? 'text-cyan-700' : 'text-slate-400 group-hover:text-cyan-700'].join(' ')} />
                  <span className="truncate font-semibold">{item.label}</span>
                </span>
                {active && <ChevronRight className="h-4 w-4 text-cyan-700" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200/70 bg-white/55 px-3 py-2.5 text-xs font-bold text-slate-600 shadow-sm hover:bg-white hover:text-slate-950"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div
      className="flex min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.30),transparent_34%),linear-gradient(135deg,#eef4fb_0%,#dfe8f4_45%,#f8fafc_100%)] text-slate-950"
      style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}
    >
      <aside className="hidden w-72 shrink-0 border-r border-white/70 bg-white/45 shadow-[30px_0_90px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:block">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/60 bg-slate-50/65 backdrop-blur-2xl">
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-xl border border-slate-200/70 bg-white/55 p-2 text-slate-500 hover:bg-white hover:text-slate-950 lg:hidden"
                onClick={() => setMobileOpen((value) => !value)}
                aria-label="Open navigation"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-700">AmarktAI Network</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-xl font-black tracking-tight text-slate-950">Superbrain Console</h1>
                  <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-800">{activeItem.label}</span>
                </div>
              </div>
            </div>
            <div className="hidden items-center gap-2 lg:flex">
              <StatusPill label="App status" value={status.appStatus} />
              <StatusPill label="Active AI route" value={status.activeRoute} />
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                <Bell className="h-4 w-4 text-cyan-700" />
                {status.jobs}
              </button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs font-bold text-slate-600 shadow-sm">
                <UserCircle2 className="h-4 w-4 text-cyan-700" />
                Owner
              </button>
            </div>
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-slate-950/35" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
            <aside className="absolute inset-y-0 left-0 w-80 max-w-[86vw] border-r border-white/70 bg-slate-50/95 backdrop-blur-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-7 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-0.5 max-w-48 truncate text-xs font-bold text-slate-700">{value}</p>
    </div>
  )
}
