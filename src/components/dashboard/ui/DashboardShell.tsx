'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarNav } from './SidebarNav'
import { TopBar } from './TopBar'
import { MARKETING_NAV_ITEMS } from '@/lib/dashboard-marketing-nav'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [statusLabel, setStatusLabel] = useState('Checking readiness…')
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/admin/settings/status')
      .then((r) => r.json())
      .catch(() => null)
      .then((data) => {
        if (!mounted) return
        const connected = Number(data?.truth?.connectedCount ?? 0)
        setStatusLabel(`${connected} connections ready`)
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

  const activeItem =
    MARKETING_NAV_ITEMS.find((item) => {
      if (item.href === '/admin/dashboard/marketing') return pathname === item.href
      return pathname === item.href || pathname.startsWith(`${item.href}/`)
    }) ?? MARKETING_NAV_ITEMS[0]

  const sidebar = (
    <SidebarNav
      pathname={pathname}
      pulse={pulse}
      statusLabel={statusLabel}
      onLogout={handleLogout}
      onNavClick={() => setMobileOpen(false)}
    />
  )

  return (
    <div
      className="flex min-h-screen bg-[#030712] text-slate-100"
      style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-sky-950/20 blur-[120px]" />
        <div className="absolute -right-64 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-950/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-sky-950/15 blur-[100px]" />
      </div>

      <aside className="relative hidden w-64 shrink-0 border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-2xl lg:block">
        {sidebar}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <TopBar
          activeItem={activeItem}
          statusLabel={statusLabel}
          mobileOpen={mobileOpen}
          onMobileToggle={() => setMobileOpen((v) => !v)}
        />

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[86vw] border-r border-slate-800/60 bg-slate-950/95 backdrop-blur-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-7">
          {children}
        </main>
      </div>
    </div>
  )
}
