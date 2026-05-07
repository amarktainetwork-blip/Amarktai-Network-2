'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'System' },
  { href: '/about', label: 'Mission' },
  { href: '/apps', label: 'Apps & Agents' },
  { href: '/docs', label: 'Docs' },
  { href: '/contact', label: 'Contact' },
]

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [revealed, setRevealed] = useState(false)
  const [menu, setMenu] = useState(false)
  const buf = useRef('')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key.length !== 1) return
      buf.current = (buf.current + e.key).toLowerCase().slice(-7)
      if (buf.current.includes('login')) setRevealed(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    setMenu(false)
  }, [pathname])

  return (
    <div className="min-h-screen overflow-x-clip bg-[#020612] text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.12),transparent_35%),radial-gradient(circle_at_90%_0%,rgba(59,130,246,0.12),transparent_34%)]" />
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#020612]/85 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-xl font-black tracking-[-0.04em] sm:text-2xl" aria-label="AmarktAI Network home">
            Amarkt<span className="text-cyan-300">AI</span> Network
          </Link>
          <nav className="hidden items-center gap-2 md:flex" aria-label="Public navigation">
            {links.map((item) => (
              <Link key={item.href} href={item.href} className={`rounded-xl px-3 py-2 text-sm transition ${pathname === item.href ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                {item.label}
              </Link>
            ))}
          </nav>
          <button className="rounded-xl border border-white/10 px-3 py-2 text-sm md:hidden" onClick={() => setMenu((open) => !open)} aria-expanded={menu} aria-controls="mobile-nav">
            Menu
          </button>
        </div>
        {menu && (
          <nav id="mobile-nav" className="border-t border-white/10 px-4 py-4 md:hidden" aria-label="Mobile public navigation">
            <div className="space-y-2">
              {links.map((item) => (
                <Link key={item.href} href={item.href} className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="relative z-10">{children}</main>

      <footer className="relative z-10 border-t border-white/10 bg-[#020916]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-lg font-black tracking-[-0.04em]">AmarktAI Network</p>
            <p className="mt-3 max-w-xl text-sm text-slate-400">
              A self-learning operating system for apps, agents, memory, workbench execution, artifacts, and guarded operations.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm text-slate-400 sm:grid-cols-3">
            <Link href="/about" className="hover:text-white">About</Link>
            <Link href="/apps" className="hover:text-white">Apps</Link>
            <Link href="/docs" className="hover:text-white">Docs</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl items-center justify-between border-t border-white/10 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} AmarktAI Network</span>
          <span>Restricted operator access</span>
        </div>
      </footer>

      {revealed && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-xs rounded-2xl border border-cyan-300/30 bg-[#041224]/95 p-4 shadow-2xl shadow-cyan-900/30">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">Restricted panel</p>
          <p className="mt-2 text-sm text-slate-300">Secure operator entry is available.</p>
          <Link href="/admin/login" className="mt-3 inline-flex rounded-xl border border-cyan-300/40 px-3 py-2 text-sm text-cyan-100 hover:bg-cyan-300/10">
            Open secure login
          </Link>
        </div>
      )}
    </div>
  )
}
