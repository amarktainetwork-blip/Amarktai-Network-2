'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Loader2, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030712] px-4 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_82%_12%,rgba(59,130,246,0.14),transparent_30%),radial-gradient(circle_at_50%_90%,rgba(168,85,247,0.10),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:56px_56px] opacity-40" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center"
      >
        <section className="hidden lg:block">
          <Link href="/" className="inline-block leading-none">
            <span className="block text-4xl font-black tracking-[-0.06em] text-white">
              Amarkt<span className="text-blue-400">AI</span> Network
            </span>
            <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-200/65">Private AI operating ecosystem</span>
          </Link>
          <h1 className="mt-12 max-w-xl text-5xl font-black tracking-[-0.06em] text-white">
            Operator access for a private command network.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-400">
            Restricted admin entry for approved operators only. Every powerful action belongs behind identity, permissions, approval gates and audit trails.
          </p>
          <div className="mt-8 grid max-w-md gap-3">
            {['Private access only', 'Approval-gated operations', 'AmarktAI Assistant command layer'].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 text-sm text-slate-300">
                <ShieldCheck className="h-4 w-4 text-cyan-200" />
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.045] p-7 shadow-2xl shadow-black/30 backdrop-blur-2xl">
          <div className="mb-8 text-center lg:text-left">
            <Link href="/" className="mb-8 inline-block leading-none lg:hidden">
              <span className="block text-3xl font-black tracking-[-0.06em] text-white">
                Amarkt<span className="text-blue-400">AI</span> Network
              </span>
              <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-200/65">Private AI operating ecosystem</span>
            </Link>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Operator Access</p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-white">Restricted login</h2>
            <p className="mt-2 text-sm text-slate-500">Authorized personnel only.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-xs font-medium text-slate-400">
              Email Address
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@amarktai.com"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-11 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40 focus:bg-black/30"
                />
              </div>
            </label>

            <label className="block text-xs font-medium text-slate-400">
              Password
              <div className="relative mt-2">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-11 py-3.5 pr-12 text-sm text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-300/40 focus:bg-black/30"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 transition hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            {error && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-xs text-red-200">
                {error}
              </motion.div>
            )}

            <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition hover:bg-cyan-100 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Authenticate <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-xs text-slate-600 transition hover:text-slate-400">← Back to public site</Link>
          </div>
        </section>
      </motion.div>
    </div>
  )
}
