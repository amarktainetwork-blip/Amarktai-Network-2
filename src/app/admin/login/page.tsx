'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import BrandName from '@/components/BrandName'
import PublicShell from '@/components/public/PublicShell'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (response.ok) {
        router.push('/admin/dashboard')
        router.refresh()
      } else {
        const data = await response.json()
        setError(data.error || 'Invalid credentials')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PublicShell>
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-[var(--amarkt-obsidian)] px-4 py-16 text-white">
      <div className="pointer-events-none absolute inset-0 panel-grid opacity-35" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(100,167,255,0.08),transparent_34%,rgba(3,5,10,0.96))]" />

      <section className="relative z-10 w-full max-w-[420px] border border-white/[0.12] bg-[rgba(7,11,18,0.92)] shadow-2xl shadow-black/60 backdrop-blur-2xl">
        <div className="section-line h-px w-full" />
        <div className="px-8 py-9">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]"><BrandName /></p>
          <h1 className="mt-6 text-3xl font-semibold leading-tight text-white">Operator authentication</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--amarkt-muted)]">Authorized infrastructure operators only.</p>

          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--amarkt-dim)]">Email</span>
              <div className="relative mt-2">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--amarkt-dim)]" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full border border-white/[0.1] bg-black/20 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-[rgba(100,167,255,0.45)]"
                />
              </div>
            </label>

            <label className="block">
              <span className="block font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--amarkt-dim)]">Password</span>
              <div className="relative mt-2">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--amarkt-dim)]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full border border-white/[0.1] bg-black/20 py-3.5 pl-11 pr-11 text-sm text-white outline-none transition focus:border-[rgba(100,167,255,0.45)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--amarkt-dim)] transition hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && <div className="border border-[#5f2632] bg-[#180910] px-4 py-3 text-sm text-[#f0a0aa]">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center border border-white/[0.14] bg-white/[0.07] py-3.5 font-mono text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-white/[0.11] disabled:opacity-45"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Authenticate'}
            </button>
          </form>
        </div>
      </section>
    </div>
    </PublicShell>
  )
}
