'use client'

import { useEffect, useRef } from 'react'

type SceneVariant = 'hero' | 'ambient'

type Node = {
  angle: number
  radiusRatio: number
  size: number
  speed: number
  color: string
  label?: string
}

type Pulse = {
  path: number
  t: number
  speed: number
  inbound: boolean
  color: string
}

const LABELS = ['Studio', 'Workbench', 'Apps', 'Memory', 'Operations', 'Assistant', 'Routing', 'Artifacts']

export default function SuperbrainScene({
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

    const nodes: Node[] = LABELS.map((label, index) => ({
      angle: (Math.PI * 2 * index) / LABELS.length,
      radiusRatio: 0.33 + (index % 2 ? 0.03 : -0.01),
      size: variant === 'hero' ? 6 : 4,
      speed: (index % 2 ? 1 : -1) * (variant === 'hero' ? 0.11 : 0.06),
      color: index % 3 === 0 ? '#60a5fa' : index % 3 === 1 ? '#22d3ee' : '#a78bfa',
      label: variant === 'hero' ? label : undefined,
    }))

    const pulses: Pulse[] = Array.from({ length: variant === 'hero' ? 40 : 18 }, (_, index) => ({
      path: index % nodes.length,
      t: Math.random(),
      speed: 0.12 + Math.random() * 0.16,
      inbound: index % 2 === 0,
      color: index % 3 === 0 ? '#22d3ee' : index % 3 === 1 ? '#60a5fa' : '#a78bfa',
    }))

    let raf = 0
    let last = performance.now()

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      const dt = Math.min(40, now - last)
      last = now

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const cx = width / 2
      const cy = height / 2
      const orbit = Math.min(width, height) * (variant === 'hero' ? 0.36 : 0.3)

      ctx.clearRect(0, 0, width, height)

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.65)
      bg.addColorStop(0, 'rgba(34,211,238,0.12)')
      bg.addColorStop(0.45, 'rgba(59,130,246,0.06)')
      bg.addColorStop(1, 'rgba(2,6,23,0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      const hubPulse = prefersReduced ? 1 : 1 + Math.sin(now * 0.0012) * 0.06
      const hubRadius = (variant === 'hero' ? 30 : 20) * hubPulse

      for (const node of nodes) {
        if (!prefersReduced) node.angle += node.speed * (dt / 1000)
      }

      const coords = nodes.map((node) => {
        const x = cx + Math.cos(node.angle) * orbit * node.radiusRatio
        const y = cy + Math.sin(node.angle) * orbit * node.radiusRatio
        return { x, y, ...node }
      })

      for (const node of coords) {
        const g = ctx.createLinearGradient(cx, cy, node.x, node.y)
        g.addColorStop(0, 'rgba(103,232,249,0.45)')
        g.addColorStop(1, 'rgba(103,232,249,0.08)')
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(node.x, node.y)
        ctx.strokeStyle = g
        ctx.lineWidth = variant === 'hero' ? 1.2 : 1
        ctx.stroke()
      }

      if (!prefersReduced) {
        for (const pulse of pulses) {
          pulse.t += (pulse.inbound ? -1 : 1) * pulse.speed * (dt / 1000)
          if (pulse.t > 1) {
            pulse.t = 1
            pulse.inbound = true
            pulse.path = Math.floor(Math.random() * coords.length)
          }
          if (pulse.t < 0) {
            pulse.t = 0
            pulse.inbound = false
            pulse.path = Math.floor(Math.random() * coords.length)
          }

          const target = coords[pulse.path]
          const px = cx + (target.x - cx) * pulse.t
          const py = cy + (target.y - cy) * pulse.t
          const glow = ctx.createRadialGradient(px, py, 0, px, py, 12)
          glow.addColorStop(0, pulse.color)
          glow.addColorStop(1, 'rgba(15,23,42,0)')
          ctx.beginPath()
          ctx.arc(px, py, 8, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }
      }

      for (const node of coords) {
        const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.size * 5)
        halo.addColorStop(0, `${node.color}88`)
        halo.addColorStop(1, `${node.color}00`)
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size * 5, 0, Math.PI * 2)
        ctx.fillStyle = halo
        ctx.fill()

        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
        ctx.fillStyle = node.color
        ctx.fill()

        if (node.label) {
          ctx.fillStyle = 'rgba(226,232,240,0.9)'
          ctx.font = '600 11px Inter, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(node.label, node.x, node.y - 14)
        }
      }

      for (let i = 0; i < (variant === 'hero' ? 3 : 1); i++) {
        const ring = (variant === 'hero' ? 56 : 40) + i * 18 + (prefersReduced ? 0 : Math.sin(now * 0.001 + i) * 3)
        ctx.beginPath()
        ctx.arc(cx, cy, ring, 0, Math.PI * 2)
        ctx.strokeStyle = i % 2 ? 'rgba(167,139,250,0.24)' : 'rgba(34,211,238,0.25)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, hubRadius * 1.6)
      hub.addColorStop(0, 'rgba(103,232,249,0.95)')
      hub.addColorStop(0.4, 'rgba(59,130,246,0.8)')
      hub.addColorStop(1, 'rgba(15,23,42,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, hubRadius * 1.6, 0, Math.PI * 2)
      ctx.fillStyle = hub
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, hubRadius, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(14,116,144,0.55)'
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, hubRadius * 0.45, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(224,242,254,0.8)'
      ctx.fill()

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [variant])

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} role="img" aria-label="AmarktAI Network superbrain animation" />
}
