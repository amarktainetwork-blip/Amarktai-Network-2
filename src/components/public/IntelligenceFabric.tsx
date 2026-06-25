'use client'

import { useEffect, useRef } from 'react'

type Particle = {
  x: number
  y: number
  radius: number
  speed: number
  phase: number
}

const PARTICLE_COUNT = 38

export default function IntelligenceFabric({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let width = 0
    let height = 0
    const start = performance.now()

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
      x: (index * 0.61803398875) % 1,
      y: (index * 0.38196601125 + 0.17) % 1,
      radius: 1.2 + (index % 5) * 0.45,
      speed: reduced ? 0 : 0.012 + (index % 7) * 0.002,
      phase: index * 0.47,
    }))

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      const elapsed = (now - start) / 1000
      ctx.clearRect(0, 0, width, height)

      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#03050a')
      bg.addColorStop(0.48, '#071426')
      bg.addColorStop(1, '#02040a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      const grid = width < 720 ? 42 : 58
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)'
      ctx.lineWidth = 1
      for (let x = 0; x <= width; x += grid) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y <= height; y += grid) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const flowY = height * 0.5
      const flow = ctx.createLinearGradient(width * 0.12, flowY, width * 0.92, flowY)
      flow.addColorStop(0, 'rgba(59, 130, 246, 0)')
      flow.addColorStop(0.24, 'rgba(45, 212, 191, 0.2)')
      flow.addColorStop(0.5, 'rgba(96, 165, 250, 0.36)')
      flow.addColorStop(0.76, 'rgba(167, 139, 250, 0.2)')
      flow.addColorStop(1, 'rgba(59, 130, 246, 0)')
      ctx.strokeStyle = flow
      ctx.lineWidth = width < 720 ? 26 : 42
      ctx.beginPath()
      ctx.moveTo(width * 0.08, flowY + Math.sin(elapsed * 0.35) * 18)
      ctx.bezierCurveTo(width * 0.28, height * 0.24, width * 0.56, height * 0.78, width * 0.94, height * 0.38)
      ctx.stroke()

      for (const particle of particles) {
        const drift = reduced ? 0 : (elapsed * particle.speed + particle.x) % 1
        const x = width * (0.1 + drift * 0.84)
        const y = height * (0.22 + particle.y * 0.56) + Math.sin(elapsed * 0.8 + particle.phase) * 18
        const alpha = 0.2 + 0.45 * Math.sin(Math.PI * drift)
        ctx.beginPath()
        ctx.arc(x, y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(191, 219, 254, ${alpha})`
        ctx.fill()
      }

      const vignette = ctx.createRadialGradient(width * 0.68, height * 0.46, 0, width * 0.68, height * 0.46, Math.max(width, height) * 0.7)
      vignette.addColorStop(0, 'rgba(15, 23, 42, 0)')
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.66)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="AmarktAI capability flow background."
    />
  )
}
