'use client'

import { useEffect, useRef } from 'react'

const NODES = [
  { label: 'Studio',       color: '#22d3ee', group: 0 },
  { label: 'Workbench',    color: '#60a5fa', group: 1 },
  { label: 'Agents',       color: '#a78bfa', group: 0 },
  { label: 'Memory',       color: '#34d399', group: 1 },
  { label: 'Operations',   color: '#60a5fa', group: 0 },
  { label: 'Media',        color: '#f472b6', group: 1 },
  { label: 'Deployments',  color: '#22d3ee', group: 0 },
  { label: 'Providers',    color: '#a78bfa', group: 1 },
  { label: 'Repositories', color: '#34d399', group: 0 },
]

type NodeState = {
  label: string
  color: string
  group: number
  angle: number
  orbitSpeed: number
  orbitRadius: number
  size: number
}

type Pulse = {
  nodeIndex: number
  t: number
  speed: number
  inbound: boolean
  color: string
  alpha: number
}

export type SceneVariant = 'hero' | 'ambient' | 'section'

export default function CommandConstellationScene({
  variant = 'hero',
  className = '',
}: {
  variant?: SceneVariant
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const isHero = variant === 'hero'
    const isMini = variant === 'ambient'

    const nodeCount = isMini ? 6 : NODES.length
    const nodeStates: NodeState[] = NODES.slice(0, nodeCount).map((n, i) => ({
      ...n,
      angle: (Math.PI * 2 * i) / nodeCount + i * 0.15,
      orbitSpeed: (n.group === 0 ? 1 : -1) * (isHero ? 0.08 : 0.05) * (0.85 + i * 0.04),
      orbitRadius: 0,
      size: isHero ? 7 : 5,
    }))

    const pulseCount = isHero ? 36 : isMini ? 14 : 24
    const pulses: Pulse[] = Array.from({ length: pulseCount }, (_, i) => ({
      nodeIndex: i % nodeCount,
      t: Math.random(),
      speed: 0.10 + Math.random() * 0.18,
      inbound: i % 2 === 0,
      color: NODES[i % nodeCount].color,
      alpha: 0.5 + Math.random() * 0.5,
    }))

    let raf = 0
    let last = performance.now()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now

      const W = canvas.clientWidth
      const H = canvas.clientHeight
      const cx = W * 0.5
      const cy = H * 0.5
      const minDim = Math.min(W, H)
      const orbit = minDim * (isHero ? 0.34 : 0.32)

      ctx.clearRect(0, 0, W, H)

      // Ambient background glow
      const bgGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, minDim * 0.7)
      bgGlow.addColorStop(0, 'rgba(34,211,238,0.09)')
      bgGlow.addColorStop(0.4, 'rgba(59,130,246,0.05)')
      bgGlow.addColorStop(1, 'rgba(2,6,18,0)')
      ctx.fillStyle = bgGlow
      ctx.fillRect(0, 0, W, H)

      // Secondary accent glow
      const accentGlow = ctx.createRadialGradient(cx * 0.6, cy * 0.4, 0, cx * 0.6, cy * 0.4, minDim * 0.5)
      accentGlow.addColorStop(0, 'rgba(167,139,250,0.06)')
      accentGlow.addColorStop(1, 'rgba(2,6,18,0)')
      ctx.fillStyle = accentGlow
      ctx.fillRect(0, 0, W, H)

      // Animate node angles
      if (!prefersReduced) {
        for (const n of nodeStates) {
          n.angle += n.orbitSpeed * (dt / 1000)
        }
      }

      // Compute positions
      const positions = nodeStates.map((n) => {
        const jitter = 0.94 + (n.group === 0 ? 0.06 : -0.04)
        return {
          x: cx + Math.cos(n.angle) * orbit * jitter,
          y: cy + Math.sin(n.angle) * orbit * jitter * 0.9,
          ...n,
        }
      })

      // Draw orbital ring tracks (faint)
      const ringAlpha = isHero ? 0.12 : 0.08
      for (let ring = 0; ring < (isHero ? 2 : 1); ring++) {
        const r = orbit * (0.97 + ring * 0.04)
        ctx.beginPath()
        ctx.ellipse(cx, cy, r, r * 0.9, 0, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(59,130,246,${ringAlpha})`
        ctx.lineWidth = 1
        ctx.setLineDash([3, 9])
        ctx.stroke()
        ctx.setLineDash([])
      }

      // Draw signal lines from core to nodes
      for (const pos of positions) {
        const grad = ctx.createLinearGradient(cx, cy, pos.x, pos.y)
        grad.addColorStop(0, `${pos.color}55`)
        grad.addColorStop(0.7, `${pos.color}18`)
        grad.addColorStop(1, `${pos.color}00`)
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(pos.x, pos.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = isHero ? 1.5 : 1
        ctx.stroke()
      }

      // Draw pulses
      if (!prefersReduced) {
        for (const pulse of pulses) {
          pulse.t += (pulse.inbound ? -1 : 1) * pulse.speed * (dt / 1000)
          if (pulse.t >= 1) {
            pulse.t = 1
            pulse.inbound = true
            pulse.nodeIndex = Math.floor(Math.random() * nodeCount)
            pulse.color = NODES[pulse.nodeIndex].color
          }
          if (pulse.t <= 0) {
            pulse.t = 0
            pulse.inbound = false
            pulse.nodeIndex = Math.floor(Math.random() * nodeCount)
            pulse.color = NODES[pulse.nodeIndex].color
          }
          const target = positions[pulse.nodeIndex]
          const px = cx + (target.x - cx) * pulse.t
          const py = cy + (target.y - cy) * pulse.t
          const pr = isHero ? 7 : 5
          const glow = ctx.createRadialGradient(px, py, 0, px, py, pr * 2.5)
          glow.addColorStop(0, `${pulse.color}${Math.round(pulse.alpha * 220).toString(16).padStart(2, '0')}`)
          glow.addColorStop(1, `${pulse.color}00`)
          ctx.beginPath()
          ctx.arc(px, py, pr * 2.5, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
          // pulse core
          ctx.beginPath()
          ctx.arc(px, py, isHero ? 3 : 2, 0, Math.PI * 2)
          ctx.fillStyle = pulse.color
          ctx.globalAlpha = pulse.alpha
          ctx.fill()
          ctx.globalAlpha = 1
        }
      }

      // Draw node halos and cores
      for (const pos of positions) {
        const haloR = pos.size * 4.5
        const halo = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, haloR)
        halo.addColorStop(0, `${pos.color}44`)
        halo.addColorStop(1, `${pos.color}00`)
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, haloR, 0, Math.PI * 2)
        ctx.fillStyle = halo
        ctx.fill()

        ctx.beginPath()
        ctx.arc(pos.x, pos.y, pos.size, 0, Math.PI * 2)
        ctx.fillStyle = pos.color
        ctx.fill()

        // Inner highlight
        ctx.beginPath()
        ctx.arc(pos.x - pos.size * 0.3, pos.y - pos.size * 0.3, pos.size * 0.45, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.55)'
        ctx.fill()

        // Label
        if (isHero) {
          ctx.save()
          ctx.font = '600 10.5px "Geist Sans", "Inter", system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillStyle = 'rgba(226,232,240,0.88)'
          ctx.fillText(pos.label, pos.x, pos.y - pos.size - 7)
          ctx.restore()
        }
      }

      // Core nucleus rings (animated breathe)
      const breathe = prefersReduced ? 1 : 1 + Math.sin(now * 0.0009) * 0.05
      const coreR = (isHero ? 32 : 22) * breathe

      // Outer ring pulses
      for (let i = 2; i >= 0; i--) {
        const ringR = coreR + (isHero ? 20 : 14) + i * (isHero ? 15 : 10)
        const ringAlphaVal = (prefersReduced ? 0.2 : 0.15 + Math.sin(now * 0.0007 + i) * 0.05)
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.strokeStyle = i % 2 ? `rgba(167,139,250,${ringAlphaVal})` : `rgba(34,211,238,${ringAlphaVal})`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Core glass gradient
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.8)
      coreGrad.addColorStop(0, 'rgba(103,232,249,0.95)')
      coreGrad.addColorStop(0.35, 'rgba(59,130,246,0.75)')
      coreGrad.addColorStop(0.75, 'rgba(99,102,241,0.30)')
      coreGrad.addColorStop(1, 'rgba(2,6,18,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, coreR * 1.8, 0, Math.PI * 2)
      ctx.fillStyle = coreGrad
      ctx.fill()

      // Core solid
      ctx.beginPath()
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(14,116,144,0.6)'
      ctx.fill()

      // Core highlight
      ctx.beginPath()
      ctx.arc(cx - coreR * 0.28, cy - coreR * 0.28, coreR * 0.42, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(224,242,254,0.85)'
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="AmarktAI Network command constellation — live operational intelligence network"
    />
  )
}
