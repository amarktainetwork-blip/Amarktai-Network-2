'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, Menu, X } from 'lucide-react'
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
    <div className="public-site min-h-screen overflow-x-clip bg-[var(--amarkt-ink)] text-slate-100">
      <div className="public-grid-glow pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
      <div className="public-orbit public-orbit-one pointer-events-none fixed left-[-18rem] top-20 z-0 h-[32rem] w-[32rem] rounded-full" aria-hidden="true" />
      <div className="public-orbit public-orbit-two pointer-events-none fixed right-[-14rem] top-[22rem] z-0 h-[24rem] w-[24rem] rounded-full" aria-hidden="true" />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header
        className={[
          'sticky top-0 z-50 border-b transition-all duration-300',
          scrolled
            ? 'border-white/10 bg-[rgba(5,8,16,0.86)] shadow-[0_16px_48px_rgba(0,0,0,.45)] backdrop-blur-2xl'
            : 'border-transparent bg-transparent',
        ].join(' ')}
      >
        <div className="mx-auto flex h-[4.75rem] max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Brand */}
          <Link
            href="/"
            className="group flex items-center gap-3 text-white transition hover:text-white"
            aria-label="AmarktAI home"
          >
            <span className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-cyan-400/20 bg-white/[0.04] text-cyan-300 shadow-[0_0_0_1px_rgba(125,211,252,0.04)] transition duration-300 group-hover:border-cyan-300/45 group-hover:bg-cyan-400/10">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(125,211,252,0.24),transparent_45%),linear-gradient(160deg,rgba(255,255,255,0.05),rgba(255,255,255,0))]" />
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
            <div>
              <p className="text-[0.68rem] font-black uppercase tracking-[0.28em] text-slate-500">One Brain</p>
              <BrandName className="text-sm font-black tracking-[0.18em] uppercase" />
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1.5 md:flex" aria-label="Public navigation">
            {PUBLIC_NAV_ITEMS.map((item) => {
              const active = item.href === '/' ? pathname === '/' : pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] transition',
                    active
                      ? 'bg-cyan-300 text-slate-950 shadow-[0_10px_30px_rgba(56,189,248,0.25)]'
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
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-100 transition hover:border-cyan-300/30 hover:bg-cyan-400/10 hover:text-white"
            >
              Talk to us <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/admin/login"
              className="inline-flex items-center gap-1.5 rounded-full bg-cyan-300 px-5 py-2.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.28)] transition hover:bg-cyan-200 hover:shadow-[0_22px_48px_rgba(56,189,248,0.35)]"
            >
              Open AmarktAI <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/5 text-slate-100 transition hover:bg-white/10 md:hidden"
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
            className="border-t border-white/10 bg-[rgba(5,8,16,0.98)] px-5 py-5 md:hidden"
            aria-label="Mobile public navigation"
          >
            <div className="grid gap-2">
              {PUBLIC_NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-2xl border border-white/6 bg-white/[0.03] px-4 py-3 text-sm font-bold text-slate-200 transition hover:border-cyan-300/20 hover:bg-cyan-400/8 hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Link
                  href="/contact"
                  className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-black text-white"
                >
                  Contact <ArrowUpRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/admin/login"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950"
                >
                  Open AmarktAI <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </nav>
        )}
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="relative z-10">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0)),#04070f]">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
            {/* Brand column */}
            <div>
              <p className="font-mono text-[11px] font-black uppercase tracking-[0.22em] text-white">
                <BrandName network={false} /> Network
              </p>
              <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
                One Brain for many apps. Capability-first execution, research, media, jobs, artifacts, and control-plane visibility.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['One Brain', 'Capability first', 'Control plane'].map((tag) => (
                  <span key={tag} className="rounded-full border border-cyan-400/20 bg-cyan-400/8 px-2.5 py-1 text-[10px] font-bold text-cyan-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Platform links */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Product</p>
              <div className="mt-3 grid gap-2">
                {[
                  { href: '/', label: 'Overview' },
                  { href: '/platform', label: 'Platform' },
                  { href: '/about', label: 'About' },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="text-sm text-slate-400 transition hover:text-white">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Platform</p>
              <div className="mt-3 grid gap-2">
                {[
                  { href: '/platform', label: 'Capability routing' },
                  { href: '/contact', label: 'Contact' },
                  { href: '/admin/login', label: 'Admin login' },
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

          <div className="mt-12 flex flex-col gap-3 border-t border-white/8 pt-6 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p className="font-mono uppercase tracking-[0.14em]">
              © 2026 <BrandName network={false} />. All rights reserved.
            </p>
            <p className="max-w-2xl text-[11px] leading-6 text-slate-600">
              Behind-the-scenes infrastructure stays behind the scenes. Apps request capabilities. AmarktAI chooses the execution path.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
