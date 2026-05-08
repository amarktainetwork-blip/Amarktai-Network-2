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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04060e] px-4 text-[#e8ecf8]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(99,102,241,0.12),transparent_50%),radial-gradient(ellipse_at_80%_90%,rgba(96,165,250,0.08),transparent_50%)]" />
        <div className="absolute inset-0 opacity-[0.025] [background-image:linear-gradient(rgba(200,215,240,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(200,215,240,0.6)_1px,transparent_1px)] [background-size:52px_52px]" />
      </div>

      {/* Card */}
      <section className="relative z-10 w-full max-w-[400px]">
        {/* Top accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(96,165,250,0.4)] to-transparent" />

        <div className="border border-[#1c2640] bg-[#080c1a]/96 px-8 py-9 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <Link href="/" className="text-[10px] uppercase tracking-[0.22em] text-[#3d5278]">
            AmarktAI Network
          </Link>

          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#e8eef8]">
            Restricted operator entry
          </h1>
          <p className="mt-2 text-sm text-[#6074a0]">Authorized personnel only.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#4a6080]">Email</label>
              <div className="relative mt-2">
                <Mail className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3d5278]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-[#1e2c48] bg-[#060a16] py-3 pl-10 pr-4 text-sm text-[#d8e4f5] outline-none transition focus:border-[#4a6aaa] focus:bg-[#070c1a]"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.18em] text-[#4a6080]">Password</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#3d5278]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-[#1e2c48] bg-[#060a16] py-3 pl-10 pr-10 text-sm text-[#d8e4f5] outline-none transition focus:border-[#4a6aaa] focus:bg-[#070c1a]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#3d5278] transition hover:text-[#8aa5d0]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="border border-[#4a2030] bg-[#1a0c14] px-4 py-2.5 text-xs text-[#d07a85]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full border border-[#2a3a62] bg-[#0d1428] py-3.5 text-xs uppercase tracking-[0.18em] text-[#c8d8f0] transition hover:bg-[#111c38] disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="mx-auto h-4 w-4 animate-spin" />
              ) : (
                'Authenticate'
              )}
            </button>
          </form>
        </div>

        {/* Bottom accent line */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(99,102,241,0.2)] to-transparent" />
      </section>
    </div>
  )
}
