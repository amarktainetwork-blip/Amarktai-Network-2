'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
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
  const buf = useRef('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key.length !== 1) return
      buf.current = (buf.current + e.key).toLowerCase().slice(-7)
      if (buf.current.includes('login')) {
        buf.current = ''
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
    <div className="min-h-screen overflow-x-clip bg-[#07090f] text-[#d5d9e2]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(115,126,162,0.16),transparent_30%),radial-gradient(circle_at_85%_8%,rgba(84,96,164,0.13),transparent_30%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-20 [background-image:linear-gradient(rgba(210,216,232,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(210,216,232,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />

      <header className="sticky top-0 z-50 border-b border-[#2a2e3b] bg-[#07090f]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link href="/" className="text-lg font-semibold tracking-[0.08em] text-[#edf0f7] sm:text-xl" aria-label="AmarktAI Network home">
            AMARKTAI NETWORK
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Public navigation">
            {links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-xs uppercase tracking-[0.14em] transition ${pathname === item.href ? 'bg-[#171b27] text-[#f3f5fb]' : 'text-[#9ea7bc] hover:bg-[#121624] hover:text-[#e7ebf7]'}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            className="rounded-md border border-[#2c3242] px-3 py-2 text-xs uppercase tracking-[0.12em] text-[#bfc7db] md:hidden"
            onClick={() => setMenu((open) => !open)}
            aria-expanded={menu}
            aria-controls="mobile-nav"
          >
            Menu
          </button>
        </div>

        {menu && (
          <nav id="mobile-nav" className="border-t border-[#2c3242] px-5 py-4 md:hidden" aria-label="Mobile public navigation">
            <div className="space-y-2">
              {links.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-md px-3 py-2 text-xs uppercase tracking-[0.12em] text-[#b8bfd2] hover:bg-[#121624] hover:text-[#f0f3fb]">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-[#2a2e3b] bg-[#06080e]">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-2 lg:px-8">
          <p className="max-w-xl text-sm leading-7 text-[#99a3ba]">
            AmarktAI Network is a private AI operations layer for model routing, agent execution, memory coordination, and governed deployment operations.
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.12em] text-[#99a3ba] sm:grid-cols-3">
            <Link href="/about" className="hover:text-[#e8ebf5]">About</Link>
            <Link href="/apps" className="hover:text-[#e8ebf5]">Apps</Link>
            <Link href="/docs" className="hover:text-[#e8ebf5]">Docs</Link>
            <Link href="/contact" className="hover:text-[#e8ebf5]">Contact</Link>
            <Link href="/privacy" className="hover:text-[#e8ebf5]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#e8ebf5]">Terms</Link>
          </div>
        </div>
        <div className="border-t border-[#222736] px-5 py-4 text-xs uppercase tracking-[0.12em] text-[#78819a] lg:px-8">
          © {new Date().getFullYear()} AmarktAI Network
        </div>
      </footer>
    </div>
  )
}
