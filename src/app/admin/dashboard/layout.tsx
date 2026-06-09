'use client'

import '@fontsource-variable/inter'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LogOut, Menu, Network, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CONTROL_CENTER_ROUTES, DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import BrandName from '@/components/BrandName'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }, [router])

  const isActive = useCallback((href: string) => {
    if (href === '/admin/dashboard') return pathname === href
    if (CONTROL_CENTER_ROUTES.includes(pathname as never) && href === '/admin/dashboard/settings') return true
    return pathname === href || pathname.startsWith(`${href}/`)
  }, [pathname])

  const activeItem = useMemo(
    () => DASHBOARD_NAV_ITEMS.find((item) => isActive(item.href)) ?? DASHBOARD_NAV_ITEMS[0],
    [isActive],
  )

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-4 pt-5">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
            <Network className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-mono text-[14px] font-black uppercase tracking-[0.14em] text-white">
              <BrandName />
            </p>
            <p className="mt-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/70">
              Private Command
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4" aria-label="Dashboard navigation">
        <div className="space-y-1">
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  'group flex h-11 items-center gap-3 rounded-xl border px-3 text-sm transition',
                  active
                    ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100'
                    : 'border-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white',
                ].join(' ')}
              >
                <span className={[
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition',
                  active
                    ? 'border-cyan-300/20 bg-cyan-300/10 text-cyan-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-500 group-hover:text-cyan-200',
                ].join(' ')}>
                  <item.icon className="h-3.5 w-3.5" />
                </span>
                <span className="truncate font-black">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-xs font-black text-slate-400 transition hover:border-red-300/25 hover:bg-red-400/10 hover:text-red-100"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--amarkt-obsidian)] text-[var(--amarkt-platinum)]">
      <div className="pointer-events-none fixed inset-0 public-field opacity-35" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(94,234,212,.055),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(96,165,250,.07),transparent_30%)]" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="sticky top-0 hidden h-screen w-[252px] shrink-0 border-r border-white/10 bg-[rgba(3,5,10,.92)] backdrop-blur-2xl lg:block">
          {sidebar}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(5,10,18,.9)] backdrop-blur-2xl">
            <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-100 transition hover:bg-white/10 lg:hidden"
                  onClick={() => setMobileOpen((open) => !open)}
                  aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                </button>

                <h1 className="truncate text-base font-black tracking-tight text-white">
                  {activeItem.label}
                </h1>
              </div>
            </div>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/78 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
              />
              <aside className="absolute inset-y-0 left-0 w-[282px] max-w-[88vw] border-r border-white/10 bg-[rgba(3,5,10,.96)] shadow-2xl backdrop-blur-2xl">
                {sidebar}
              </aside>
            </div>
          )}

          <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
