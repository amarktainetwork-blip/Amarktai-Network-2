'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import BrandName from '@/components/BrandName'
import { PUBLIC_NAV_ITEMS } from '@/lib/public-nav'

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menu, setMenu] = useState(false)

  useEffect(() => setMenu(false), [pathname])

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--amarkt-obsidian)] text-[var(--amarkt-platinum)]">
      <div className="pointer-events-none fixed inset-0 public-field" />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(5,10,18,0.88)] shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-white" aria-label="Amarktai Network home">
            <BrandName />
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname === item.href
              return (
                <Link key={item.href} href={item.href} className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition ${active ? 'bg-cyan-300/12 text-cyan-100 ring-1 ring-cyan-300/25' : 'text-slate-200 hover:bg-white/5 hover:text-white'}`}>
                  {item.label}
                </Link>
              )
            })}
          </nav>
          <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 md:hidden" onClick={() => setMenu((open) => !open)} aria-expanded={menu} aria-controls="mobile-public-navigation" aria-label="Toggle navigation">
            {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {menu && (
          <nav id="mobile-public-navigation" className="border-t border-white/10 bg-slate-950/95 px-5 py-4 md:hidden" aria-label="Mobile public navigation">
            <div className="grid gap-1">{PUBLIC_NAV_ITEMS.map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-3 py-3 text-sm font-bold text-slate-100 hover:bg-white/5">{item.label}</Link>)}</div>
          </nav>
        )}
      </header>
      <main className="relative z-10">{children}</main>
      <footer className="relative z-10 border-t border-white/10 bg-[rgba(3,5,10,0.96)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-200"><BrandName /></p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">The AI operating system for connected digital businesses.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-300 sm:grid-cols-3">
            <Link href="/platform" className="hover:text-white">Platform</Link>
            <Link href="/network-apps" className="hover:text-white">Network Apps</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-4 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 lg:px-8">2026 Amarktai Network</div>
      </footer>
    </div>
  )
}
