'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

const links = [
  { href: '/', label: 'Overview' },
  { href: '/about', label: 'About' },
  { href: '/apps', label: 'Apps' },
  { href: '/docs', label: 'Docs' },
  { href: '/contact', label: 'Contact' },
]

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menu, setMenu] = useState(false)
  const typed = useRef('')

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (event.key.length !== 1) return
      typed.current = (typed.current + event.key).toLowerCase().slice(-7)
      if (typed.current.includes('login')) {
        typed.current = ''
        router.push('/admin/login')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [router])

  useEffect(() => {
    setMenu(false)
  }, [pathname])

  return (
    <div className="min-h-screen overflow-x-clip bg-[var(--amarkt-obsidian)] text-[var(--amarkt-platinum)]">
      <div className="pointer-events-none fixed inset-0 public-field" />
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[rgba(3,5,10,0.78)] backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="font-mono text-[13px] font-semibold uppercase tracking-[0.18em] text-white" aria-label="AmarktAI Network home">
            AmarktAI Network
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
            {links.map((item) => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 text-[11px] uppercase tracking-[0.14em] transition ${
                    active
                      ? 'text-white'
                      : 'text-[var(--amarkt-muted)] hover:text-[var(--amarkt-soft)]'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center border border-white/[0.1] text-[var(--amarkt-soft)] md:hidden"
            onClick={() => setMenu((open) => !open)}
            aria-expanded={menu}
            aria-controls="mobile-public-navigation"
            aria-label="Toggle navigation"
          >
            {menu ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {menu && (
          <nav id="mobile-public-navigation" className="border-t border-white/[0.08] px-5 py-4 md:hidden" aria-label="Mobile public navigation">
            <div className="grid gap-1">
              {links.map((item) => (
                <Link key={item.href} href={item.href} className="px-3 py-3 text-[12px] uppercase tracking-[0.14em] text-[var(--amarkt-soft)]">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-white/[0.08] bg-[rgba(3,5,10,0.94)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 lg:grid-cols-[1fr_auto] lg:px-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">AmarktAI Network</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--amarkt-muted)]">
              Private AI operations architecture for routing, agents, memory, artifacts, approval control, and governed deployments.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-[11px] uppercase tracking-[0.14em] text-[var(--amarkt-muted)] sm:grid-cols-3">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/apps" className="hover:text-white">Apps</Link>
            <Link href="/docs" className="hover:text-white">Docs</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-5 py-4 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--amarkt-dim)] lg:px-8">
          2026 AmarktAI Network
        </div>
      </footer>
    </div>
  )
}
