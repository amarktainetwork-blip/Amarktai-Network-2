'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'

const navLinks = [
  { href: '/', label: 'Platform' },
  { href: '/about', label: 'AmarktAI Assistant' },
  { href: '/apps', label: 'Ecosystem' },
  { href: '/apps#capabilities', label: 'Capabilities' },
]

function useLoginReveal() {
  const [revealed, setRevealed] = useState(false)
  const bufRef = useRef('')
  useEffect(() => {
    if (revealed) return
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key.length !== 1) return
      bufRef.current = (bufRef.current + e.key).toLowerCase().slice(-6)
      if (bufRef.current.includes('login')) setRevealed(true)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [revealed])
  return revealed
}

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const loginRevealed = useLoginReveal()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (pathname.startsWith('/admin')) return null

  return (
    <header className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-white/10 bg-[#030712]/88 shadow-2xl shadow-black/20 backdrop-blur-2xl' : 'bg-transparent'}`}>
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="leading-none" aria-label="Amarktai Network">
          <span className="block text-2xl font-black tracking-[-0.055em] text-white sm:text-3xl">
            Amarkt<span className="text-blue-400">AI</span> Network
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/65">Private AI operating ecosystem</span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.035] p-1 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => {
            const active = pathname === link.href
            return (
              <Link key={link.href} href={link.href}
                className={`rounded-xl px-3.5 py-2 text-sm transition ${active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white'}`}>
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <AnimatePresence>
            {loginRevealed && (
              <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.2 }}>
                <Link href="/admin/login" className="text-xs text-slate-500 hover:text-white">Operator Login</Link>
              </motion.div>
            )}
          </AnimatePresence>
          <Link href="/contact" className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-black text-slate-950 shadow-xl shadow-cyan-950/20 transition hover:bg-cyan-100">
            Request Access <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <button className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-slate-300 md:hidden" onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="border-t border-white/10 bg-[#050b1b]/96 md:hidden">
            <nav className="space-y-2 px-4 py-4">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                  {link.label}
                </Link>
              ))}
              {loginRevealed && <Link href="/admin/login" className="block rounded-xl px-3 py-2 text-sm text-slate-400 hover:bg-white/5 hover:text-white">Operator Login</Link>}
              <Link href="/contact" className="mt-2 block rounded-xl bg-white px-3 py-2.5 text-center text-sm font-black text-slate-950">Request Access</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
