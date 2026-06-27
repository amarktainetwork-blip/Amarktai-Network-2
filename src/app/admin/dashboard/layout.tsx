'use client'

import '@fontsource-variable/inter'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Activity, ChevronRight, Headphones, LogOut, Menu, Mic, Network, SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { DASHBOARD_NAV_ITEMS } from '@/lib/dashboard-nav'
import BrandName from '@/components/BrandName'

type HeaderStatus = { appStatus: string }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [assistantVoice, setAssistantVoice] = useState('AmarktAI Voice')
  const [status, setStatus] = useState<HeaderStatus>({ appStatus: 'Checking readiness' })
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    let mounted = true
    fetch('/api/admin/settings/status').then(r => r.json()).catch(() => null).then(response => {
      if (!mounted) return
      const truth = response?.truth
      const connected = Number(truth?.connectedCount ?? 0)
      const storageConnected = Boolean(truth?.storage?.connected)
      setStatus({ appStatus: storageConnected ? `${connected} connections ready` : 'Storage needs setup' })
      setPulse(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    const id = setInterval(() => setPulse(p => !p), 3000)
    return () => clearInterval(id)
  }, [])

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.push('/admin/login')
  }, [router])

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const activeItem = DASHBOARD_NAV_ITEMS.find(item => isActive(item.href)) ?? DASHBOARD_NAV_ITEMS[0]

  // Group nav items
  const groups = DASHBOARD_NAV_ITEMS.reduce<Record<string, typeof DASHBOARD_NAV_ITEMS[number][]>>((acc, item) => {
    const g = item.group ?? 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(item)
    return acc
  }, {})
  const groupOrder = ['Platform', 'Runtime', 'System']

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-4 py-4">
        <Link href="/admin/dashboard" className="group block">
          <div className="flex items-center gap-2.5">
            <Network className="h-4 w-4 text-cyan-300" />
            <p className="text-sm font-black tracking-tight text-slate-100"><BrandName /></p>
          </div>
        </Link>
      </div>

      {/* Vitals */}
      <div className="mx-4 mb-3 rounded-xl border border-slate-700/50 bg-slate-800/40 px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)] transition-opacity duration-700" style={{ opacity: pulse ? 1 : 0.4 }} />
          <p className="truncate text-[10px] font-bold text-slate-300">{status.appStatus}</p>
        </div>
      </div>

      {/* Nav with groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin" aria-label="Dashboard navigation">
        {groupOrder.map(groupName => {
          const items = groups[groupName]
          if (!items?.length) return null
          return (
            <div key={groupName} className="mb-3">
              <p className="mb-1 px-2 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600">{groupName}</p>
              <div className="space-y-0.5">
                {items.map(item => {
                  const active = isActive(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={[
                        'group flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-xs transition-all duration-150',
                        active
                          ? 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.06)]'
                          : 'border-transparent text-slate-500 hover:border-slate-700/50 hover:bg-slate-800/50 hover:text-slate-300',
                      ].join(' ')}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <item.icon className={['h-3.5 w-3.5 shrink-0 transition-colors', active ? 'text-cyan-400' : 'text-slate-600 group-hover:text-cyan-400/70'].join(' ')} />
                        <span className="truncate font-semibold">{item.label}</span>
                      </span>
                      {active && <ChevronRight className="h-3 w-3 shrink-0 text-cyan-500/60" />}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/50 px-3 py-2.5 text-xs font-bold text-slate-500 transition-all hover:border-slate-600 hover:bg-slate-800 hover:text-slate-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#030712] text-slate-100" style={{ fontFamily: "'Inter Variable','Inter',system-ui,-apple-system,sans-serif" }}>
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-64 -top-64 h-[600px] w-[600px] rounded-full bg-cyan-950/20 blur-[120px]" />
        <div className="absolute -right-64 top-1/3 h-[500px] w-[500px] rounded-full bg-indigo-950/25 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full bg-sky-950/15 blur-[100px]" />
      </div>

      {/* Sidebar - desktop */}
      <aside className="relative hidden w-56 shrink-0 border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-2xl lg:block">
        {sidebar}
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur-2xl">
          <div className="flex min-h-14 items-center justify-between gap-3 px-4 lg:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="rounded-lg border border-slate-700/60 bg-slate-800/60 p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
                onClick={() => setMobileOpen(v => !v)}
                aria-label="Open navigation"
              >
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-300"><BrandName /></p>
                <h1 className="truncate text-sm font-black tracking-tight text-slate-100">{activeItem.label}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <VoiceAssistantButton
                open={assistantOpen}
                voice={assistantVoice}
                onClick={() => setAssistantOpen((current) => !current)}
              />
              <StatusChip icon={<Activity className="h-3 w-3" />} label={status.appStatus} />
            </div>
          </div>
        </header>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
            <aside className="absolute inset-y-0 left-0 w-64 max-w-[86vw] border-r border-slate-800/60 bg-slate-950/95 backdrop-blur-2xl">
              {sidebar}
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 lg:px-6">
          {children}
        </main>
        <VoiceAssistantPanel
          open={assistantOpen}
          voice={assistantVoice}
          setVoice={setAssistantVoice}
          onClose={() => setAssistantOpen(false)}
        />
      </div>
    </div>
  )
}

function VoiceAssistantButton({ open, voice, onClick }: { open: boolean; voice: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-dashboard-voice-assistant="trigger"
      className={[
        'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-black transition',
        open ? 'border-blue-400/30 bg-blue-400/12 text-blue-200' : 'border-slate-700/60 bg-slate-800/60 text-slate-300 hover:border-blue-400/25 hover:text-blue-200',
      ].join(' ')}
      aria-expanded={open}
      aria-controls="dashboard-voice-assistant"
    >
      <Mic className="h-3.5 w-3.5 text-blue-400" />
      <span className="hidden sm:inline">{voice}</span>
      <span className="hidden rounded-full border border-amber-300/25 bg-amber-300/10 px-1.5 py-0.5 text-[9px] text-amber-200 md:inline">backend missing</span>
    </button>
  )
}

function VoiceAssistantPanel({
  open,
  voice,
  setVoice,
  onClose,
}: {
  open: boolean
  voice: string
  setVoice: (voice: string) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <aside
      id="dashboard-voice-assistant"
      data-dashboard-voice-assistant="panel"
      className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2rem))] rounded-2xl border border-slate-700/70 bg-slate-950/95 p-4 shadow-2xl shadow-black/40 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-blue-400/25 bg-blue-400/10 text-blue-300">
            <Headphones className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-black text-white">Dashboard Assistant</p>
            <p className="mt-0.5 text-xs font-bold text-amber-200">Voice backend not wired</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-slate-200" aria-label="Close assistant">
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-4 block">
        <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Voice shortcut
        </span>
        <select
          value={voice}
          onChange={(event) => setVoice(event.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-bold text-slate-200 outline-none focus:border-blue-400/50"
        >
          {['AmarktAI Voice', 'Calm Operator', 'Fast Assistant', 'Narrator'].map((option) => <option key={option}>{option}</option>)}
        </select>
      </label>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button type="button" className="rounded-xl border border-blue-400/25 bg-blue-400/10 px-3 py-2 text-xs font-black text-blue-200">
          Preview via /api/admin/voice/preview
        </button>
        <button type="button" disabled className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-black text-slate-500">
          Mic stream disabled: /api/realtime/session
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3">
        <p className="text-xs leading-6 text-slate-400">
          Memory indicator: dashboard memory route present at /api/admin/amarktai-assistant/memory. Voice options route present at /api/admin/voice/options. Realtime speaking/listening returns not available until /api/realtime/session is wired.
        </p>
      </div>
    </aside>
  )
}

function StatusChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-2.5 py-1.5">
      <span className="text-cyan-400">{icon}</span>
      <p className="max-w-40 truncate text-[11px] font-bold text-slate-300">{label}</p>
    </div>
  )
}
