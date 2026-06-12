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
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setMenu(false), [pathname])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen overflow-x-clip bg-[#07111F] text-slate-100">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className={[
          'sticky top-0 z-50 border-b transition-all duration-300',
          scrolled
            ? 'border-white/10 bg-[rgba(7,17,31,0.95)] shadow-[0_8px_32px_rgba(0,0,0,.4)] backdrop-blur-2xl'
            : 'border-transparent bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-white transition hover:text-teal-300"
            aria-label="AmarktAI Network home"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-teal-500/40 bg-teal-500/15 text-teal-400">
              <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                <circle cx="8" cy="8" r="2.5" fill="currentColor" />
                <circle cx="2.5" cy="5" r="1.5" fill="currentColor" opacity=".6" />
                <circle cx="13.5" cy="5" r="1.5" fill="currentColor" opacity=".6" />
                <circle cx="2.5" cy="11" r="1.5" fill="currentColor" opacity=".6" />
                <circle cx="13.5" cy="11" r="1.5" fill="currentColor" opacity=".6" />
                <line x1="8" y1="8" x2="2.5" y2="5" stroke="currentColor" strokeWidth="0.8" opacity=".4" />
                <line x1="8" y1="8" x2="13.5" y2="5" stroke="currentColor" strokeWidth="0.8" opacity=".4" />
                <line x1="8" y1="8" x2="2.5" y2="11" stroke="currentColor" strokeWidth="0.8" opacity=".4" />
                <line x1="8" y1="8" x2="13.5" y2="11" stroke="currentColor" strokeWidth="0.8" opacity=".4" />
              </svg>
            </span>
            <BrandName />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-lg px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.12em] transition',
                    active
                      ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/30'
                      : 'text-slate-300 hover:bg-white/6 hover:text-white',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-slate-950 shadow-[0_0_20px_rgba(20,184,166,0.3)] transition hover:bg-teal-400 hover:shadow-[0_0_32px_rgba(20,184,166,0.45)]"
            >
              Open Command <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-100 transition hover:bg-white/10 md:hidden"
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
            className="border-t border-white/10 bg-[rgba(7,17,31,0.98)] px-5 py-4 md:hidden"
            aria-label="Mobile public navigation"
          >
            <div className="grid gap-1">
              {PUBLIC_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/admin/login"
                className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-4 py-3 text-sm font-black text-slate-950"
              >
                Open Command Center <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </nav>
        )}
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 bg-[#05070D]">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr]">
            {/* Brand column */}
            <div>
              <p className="font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-white">
                <BrandName />
              </p>
              <p className="mt-3 max-w-xs text-sm leading-7 text-slate-400">
                The universal AI capability engine for apps, media, automation, and connected products.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['62 capabilities', '6 providers', 'Connected apps'].map((tag) => (
                  <span key={tag} className="rounded-full border border-teal-500/25 bg-teal-500/8 px-2.5 py-0.5 text-[10px] font-bold text-teal-400">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Platform links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Platform</p>
              <div className="mt-3 grid gap-2">
                {[
                  { href: '/platform', label: 'Platform overview' },
                  { href: '/network-apps', label: 'Network Apps' },
                  { href: '/about', label: 'About' },
                  { href: '/admin/login', label: 'Command Center' },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="text-sm text-slate-400 transition hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Legal links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Legal</p>
              <div className="mt-3 grid gap-2">
                {[
                  { href: '/privacy', label: 'Privacy Policy' },
                  { href: '/terms', label: 'Terms of Service' },
                  { href: '/contact', label: 'Contact' },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="text-sm text-slate-400 transition hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/8 pt-6 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-600">
            © 2026 AmarktAI Network. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
