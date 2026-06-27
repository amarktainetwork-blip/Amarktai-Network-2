'use client'

import Link from 'next/link'
import { ChevronRight, LogOut, Network } from 'lucide-react'
import BrandName from '@/components/BrandName'
import { DASHBOARD_NAV_ITEMS, type DashboardNavItem } from '@/lib/dashboard-nav'

export function SidebarNav({
  pathname,
  pulse,
  statusLabel,
  onLogout,
  onNavClick,
}: {
  pathname: string
  pulse: boolean
  statusLabel: string
  onLogout: () => void
  onNavClick?: () => void
}) {
  const isActive = (href: string) =>
    href === '/admin/dashboard'
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 py-6">
        <Link href="/admin/dashboard" className="group block">
          <div className="flex items-center gap-3">
            <div className="relative grid h-11 w-11 place-items-center rounded-xl border border-slate-700 bg-slate-900 shadow-[0_0_28px_rgba(14,165,233,0.18)]">
              <Network className="h-5 w-5 text-sky-300" />
              <span
                className="absolute inset-0 rounded-xl ring-1 ring-sky-400/40 transition-all duration-700"
                style={{ boxShadow: pulse ? '0 0 16px 2px rgba(14,165,233,0.25)' : 'none' }}
              />
            </div>
            <div>
              <p className="text-sm font-black tracking-tight text-slate-100">
                <BrandName />
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-300">
                Dashboard
              </p>
            </div>
          </div>
        </Link>
      </div>

      <div className="mx-4 mb-4 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(14,165,233,0.8)] transition-opacity duration-700"
            style={{ opacity: pulse ? 1 : 0.4 }}
          />
          <p className="truncate text-[10px] font-bold text-slate-300">{statusLabel}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-1" aria-label="Dashboard navigation">
        <div className="space-y-0.5">
          {DASHBOARD_NAV_ITEMS.map((item: DashboardNavItem) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                className={[
                  'group flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm transition-all duration-200',
                  active
                    ? 'border-sky-500/30 bg-sky-500/10 text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.08)]'
                    : 'border-transparent text-slate-500 hover:border-slate-700/60 hover:bg-slate-800/50 hover:text-slate-300',
                ].join(' ')}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <item.icon
                    className={[
                      'h-4 w-4 shrink-0 transition-colors',
                      active ? 'text-sky-400' : 'text-slate-600 group-hover:text-sky-400/70',
                    ].join(' ')}
                  />
                  <span className="truncate font-semibold">{item.label}</span>
                </span>
                {active && <ChevronRight className="h-3.5 w-3.5 text-sky-500/70" />}
              </Link>
            )
          })}
        </div>
      </nav>

      <div className="p-4">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-xs font-bold text-slate-500 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-slate-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )
}
