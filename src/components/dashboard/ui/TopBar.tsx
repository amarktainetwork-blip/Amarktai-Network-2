'use client'

import { Menu, X } from 'lucide-react'
import BrandName from '@/components/BrandName'
import type { DashboardNavItem } from '@/lib/dashboard-marketing-nav'

export function TopBar({
  activeItem,
  statusLabel,
  mobileOpen,
  onMobileToggle,
}: {
  activeItem: DashboardNavItem
  statusLabel: string
  mobileOpen: boolean
  onMobileToggle: () => void
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-2xl">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
            onClick={onMobileToggle}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-300">
              <BrandName />
            </p>
            <h1 className="truncate text-base font-black tracking-tight text-slate-100">
              {activeItem.label}
            </h1>
          </div>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_6px_rgba(14,165,233,0.8)]" />
            <p className="max-w-44 truncate text-[11px] font-bold text-slate-300">{statusLabel}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
