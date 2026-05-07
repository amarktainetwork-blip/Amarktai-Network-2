'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push('/admin/dashboard')
        router.refresh()
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid credentials')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#06080d] px-4 text-[#e8ecf8]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(129,141,181,0.18),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(98,110,172,0.16),transparent_36%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(212,218,233,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(212,218,233,0.08)_1px,transparent_1px)] [background-size:60px_60px]" />

      <section className="relative z-10 w-full max-w-md border border-[#30384d] bg-[#0b0f19]/95 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <Link href="/" className="text-xs uppercase tracking-[0.16em] text-[#a6b1cd]">AmarktAI Network</Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-[-0.02em] text-[#eef2fb]">Restricted operator entry</h1>
        <p className="mt-2 text-sm text-[#99a5c2]">Authorized personnel only.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <label className="block text-xs uppercase tracking-[0.12em] text-[#94a0bc]">
            Email
            <div className="relative mt-2">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64708d]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-[#2d3448] bg-[#0a0d16] px-10 py-3 text-sm text-[#e6ebf8] outline-none transition focus:border-[#6e7dc4]"
              />
            </div>
          </label>

          <label className="block text-xs uppercase tracking-[0.12em] text-[#94a0bc]">
            Password
            <div className="relative mt-2">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64708d]" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-[#2d3448] bg-[#0a0d16] px-10 py-3 pr-10 text-sm text-[#e6ebf8] outline-none transition focus:border-[#6e7dc4]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6d7894] transition hover:text-[#cfd7eb]"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>

          {error && <div className="border border-[#4e2f39] bg-[#2a141b] px-3 py-2 text-xs text-[#f0b7c2]">{error}</div>}

          <button type="submit" disabled={loading} className="w-full border border-[#394664] bg-[#111830] px-5 py-3 text-xs uppercase tracking-[0.14em] text-[#e1e7f8] transition hover:bg-[#161f3d] disabled:opacity-50">
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Authenticate'}
          </button>
        </form>
      </section>
    </div>
  )
}
