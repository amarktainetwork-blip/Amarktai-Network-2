'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Mail, Lock, Loader2, Eye, EyeOff, Shield, ArrowRight } from 'lucide-react'
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
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 grid-bg opacity-25" />
        {/* Slow-pulse glow blobs */}
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.05, 0.13, 0.05] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-blue-600 rounded-full blur-[130px]"
        />
        <motion.div
          animate={{ scale: [1, 1.18, 1], opacity: [0.04, 0.10, 0.04] }}
          transition={{ duration: 11, repeat: Infinity, delay: 2.5, ease: 'easeInOut' }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600 rounded-full blur-[110px]"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.03, 0.07, 0.03] }}
          transition={{ duration: 7, repeat: Infinity, delay: 4, ease: 'easeInOut' }}
          className="absolute top-2/3 left-1/2 w-72 h-72 bg-cyan-500 rounded-full blur-[100px]"
        />
        {/* Subtle animated node lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" aria-hidden="true">
          <motion.line x1="20%" y1="15%" x2="50%" y2="50%" stroke="#60a5fa" strokeWidth="1"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0 }} />
          <motion.line x1="80%" y1="20%" x2="50%" y2="50%" stroke="#818cf8" strokeWidth="1"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} />
          <motion.line x1="15%" y1="75%" x2="50%" y2="50%" stroke="#22d3ee" strokeWidth="1"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 2 }} />
          <motion.line x1="85%" y1="80%" x2="50%" y2="50%" stroke="#60a5fa" strokeWidth="1"
            animate={{ opacity: [0, 1, 0] }} transition={{ duration: 4.5, repeat: Infinity, delay: 0.5 }} />
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Branding header */}
        <div className="text-center mb-8">
          <motion.div
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="inline-flex mb-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-400 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-900/40">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </motion.div>

          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-400 mb-2">
            Amarkt<span className="text-cyan-300">AI</span> Network
          </p>
          <h1 className="text-2xl font-extrabold text-white mb-1 font-heading">
            Operator Access
          </h1>
          <p className="text-slate-500 text-xs font-mono">
            Restricted — authorized personnel only
          </p>
        </div>

        {/* Login card */}
        <div className="glass-card rounded-2xl p-8 relative overflow-hidden border border-blue-500/15">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
                <Mail className="w-3 h-3" />
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@amarktai.network"
                className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all font-mono"
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 mb-2">
                <Lock className="w-3 h-3" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/[0.06] transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="px-4 py-3 bg-red-500/8 border border-red-500/20 rounded-xl text-xs text-red-400 font-mono"
              >
                ⚠ {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50 mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Authenticate <ArrowRight className="w-4 h-4 relative z-10" /></>
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-5">
          <Link href="/" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
            ← Back to site
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
