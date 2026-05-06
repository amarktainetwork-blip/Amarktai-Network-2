'use client'

import '@fontsource-variable/inter'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

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
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/admin/dashboard" className="block">
          <p className="text-lg font-black text-white">
            Amarkt<span className="text-cyan-300">AI</span> Network
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Repo operations
          </p>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        <div className="space-y-1">
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={[
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition',
                  active
                    ? 'border-cyan-400/30 bg-cyan-400/10 text-white'
                    : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
                ].join(' ')}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08] hover:text-white"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#05070d]" style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}>
      <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-[#090d16] lg:block">
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#05070d]/90 backdrop-blur-xl">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
                onClick={() => setMobileOpen((value) => !value)}
                aria-label="Open navigation"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Dashboard</p>
                <p className="truncate text-sm font-bold text-white">{activeItem.label}</p>
              </div>
            </div>
            <Link
              href="/admin/dashboard/workbench"
              className="rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/15"
            >
              Open Workbench
            </Link>
          </div>
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
            <aside className="absolute inset-y-0 left-0 w-80 max-w-[86vw] border-r border-white/10 bg-[#090d16]">
              {sidebar}
            </aside>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
