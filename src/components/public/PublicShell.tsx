'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'
import BrandName from '@/components/BrandName'
import { PUBLIC_NAV_ITEMS } from '@/lib/public-nav'

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [menu, setMenu] = useState(false)

  useEffect(() => setMenu(false), [pathname])

  return (
    <div className="min-h-screen overflow-x-clip bg-[#03050a] text-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[rgba(3,5,10,0.88)] shadow-[0_8px_32px_rgba(0,0,0,.35)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-white" aria-label="AmarktAI home">
            <BrandName />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
            {PUBLIC_NAV_ITEMS.filter(i => i.label !== 'Login').map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                    active
                      ? 'bg-blue-500/12 text-blue-200 ring-1 ring-blue-400/25'
                      : 'text-slate-300 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-[0_0_16px_rgba(59,130,246,0.35)] transition hover:bg-blue-500"
            >
              Login <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 md:hidden"
            onClick={() => setMenu((open) => !open)}
            aria-expanded={menu}
            aria-controls="mobile-public-navigation"
            aria-label="Toggle navigation"
          >
            {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menu && (
          <nav
            id="mobile-public-navigation"
            className="border-t border-white/10 bg-slate-950/97 px-5 py-4 md:hidden"
            aria-label="Mobile public navigation"
          >
            <div className="grid gap-1">
              {PUBLIC_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-3 text-sm font-bold transition ${
                    item.label === 'Login'
                      ? 'text-blue-300 hover:bg-blue-500/10'
                      : 'text-slate-100 hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      {/* Main */}
      <main className="relative z-10">{children}</main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-[rgba(2,4,9,0.98)]">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {/* Brand col */}
            <div>
              <p className="font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-white">
                <BrandName />
              </p>
              <p className="mt-3 max-w-xs text-sm leading-7 text-slate-400">
                A central <span className="text-blue-400">AI</span> capability platform for building and running AI-powered apps.
              </p>
              <Link
                href="/admin/login"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white transition hover:bg-blue-500"
              >
                Launch workflow <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Platform col */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Platform</p>
              <ul className="mt-4 space-y-3">
                {[
                  { href: '/platform', label: 'Overview' },
                  { href: '/features', label: 'Features' },
                  { href: '/what-we-can-do', label: 'What We Can Do' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-400 transition hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company col */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Company</p>
              <ul className="mt-4 space-y-3">
                {[
                  { href: '/about', label: 'About Us' },
                  { href: '/privacy', label: 'Privacy' },
                  { href: '/terms', label: 'Terms' },
                  { href: '/contact', label: 'Contact Us' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-400 transition hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Access col */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Access</p>
              <ul className="mt-4 space-y-3">
                {[
                  { href: '/admin/login', label: 'Login' },
                  { href: '/admin/dashboard', label: 'Control Centre' },
                ].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-400 transition hover:text-white">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-white/8 px-5 py-4 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500 lg:px-8">
          &copy; 2026 AmarktAI. All rights reserved.
        </div>
      </footer>
    </div>
  )
}
