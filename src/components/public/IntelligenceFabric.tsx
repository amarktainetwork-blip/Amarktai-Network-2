'use client'

import { useEffect, useRef } from 'react'

// Product modules that orbit the central command core
const ORBIT_MODULES = [
  { label: 'Studio', sublabel: 'Multimodal', color: '96,165,250', ring: 0 },
  { label: 'Workbench', sublabel: 'Repo-to-Deploy', color: '139,92,246', ring: 1 },
  { label: 'Apps & Agents', sublabel: 'Orchestration', color: '167,139,250', ring: 0 },
  { label: 'Memory', sublabel: 'Persistent', color: '99,102,241', ring: 1 },
  { label: 'Operations', sublabel: 'Runtime', color: '79,70,229', ring: 0 },
  { label: 'Settings', sublabel: 'Control', color: '109,40,217', ring: 1 },
]

// Operational pipeline nodes shown in the lower telemetry band
const PIPELINE_LABELS = ['input', 'routing', 'agent', 'memory', 'artifact', 'approval', 'deployment']

type Stream = {
  moduleIdx: number
  t: number
  speed: number
  reverse: boolean
}

function project(x: number, y: number, z: number, cx: number, cy: number, fov: number) {
  const scale = fov / (fov + z)
  return { x: cx + x * scale, y: cy + y * scale, scale }
}

function drawModuleCard(
  ctx: CanvasRenderingContext2D,
  px: number, py: number, depthScale: number,
  label: string, sublabel: string, colorRgb: string,
  elapsed: number, compact: boolean,
) {
  const w = compact ? 72 : 88
  const h = compact ? 38 : 50
  const sw = w * depthScale
  const sh = h * depthScale
  const x = px - sw / 2
  const y = py - sh / 2

  const cardGrad = ctx.createLinearGradient(x, y, x + sw, y + sh)
  cardGrad.addColorStop(0, `rgba(${colorRgb},0.18)`)
  cardGrad.addColorStop(1, `rgba(${colorRgb},0.06)`)
  ctx.fillStyle = cardGrad
  ctx.fillRect(x, y, sw, sh)

  ctx.strokeStyle = `rgba(${colorRgb},${0.38 + 0.18 * Math.sin(elapsed * 1.8)})`
  ctx.lineWidth = depthScale * 0.9
  ctx.strokeRect(x, y, sw, sh)

  // Top accent bar
  ctx.fillStyle = `rgba(${colorRgb},0.85)`
  ctx.fillRect(x, y, sw, depthScale * 1.8)

  if (depthScale > 0.52) {
    const alpha = Math.min(1, (depthScale - 0.45) / 0.3)
    ctx.fillStyle = `rgba(228,238,255,${alpha})`
    ctx.font = `600 ${Math.round(Math.max(7, 9 * depthScale))}px Inter,ui-sans-serif,system-ui,sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(label, px, py - sh * 0.06)
    if (depthScale > 0.68 && !compact) {
      ctx.fillStyle = `rgba(${colorRgb},${alpha * 0.82})`
      ctx.font = `400 ${Math.round(Math.max(6, 7.5 * depthScale))}px Inter,ui-sans-serif,system-ui,sans-serif`
      ctx.fillText(sublabel, px, py + sh * 0.26)
    }
  }
}

export default function IntelligenceFabric({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let isMobile = window.innerWidth < 640

    let raf = 0
    const startTime = performance.now()
    let last = startTime

    const streams: Stream[] = reduced
      ? []
      : Array.from({ length: 20 }, (_, i) => ({
          moduleIdx: i % ORBIT_MODULES.length,
          t: Math.random(),
          speed: 0.16 + Math.random() * 0.2,
          reverse: Math.random() > 0.5,
        }))

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      isMobile = canvas.clientWidth < 640
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      const elapsed = (now - startTime) / 1000
      const dt = Math.min(50, now - last) / 1000
      last = now

      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const cx = w * 0.5
      const cy = h * 0.46
      const fov = 420
      const radius = Math.min(w * 0.34, h * 0.36, 190)

      ctx.clearRect(0, 0, w, h)

      // Deep space background
      const bg = ctx.createRadialGradient(cx, cy * 0.85, 0, cx, cy, Math.max(w, h) * 0.8)
      bg.addColorStop(0, '#080c1c')
      bg.addColorStop(0.45, '#050810')
      bg.addColorStop(1, '#020407')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Ambient core glow
      const ambGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.7)
      ambGlow.addColorStop(0, `rgba(59,130,246,${0.07 + 0.03 * Math.sin(elapsed * 1.3)})`)
      ambGlow.addColorStop(0.5, 'rgba(99,102,241,0.04)')
      ambGlow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = ambGlow
      ctx.fillRect(0, 0, w, h)

      const rotSpeed = reduced ? 0 : 0.055
      const ringTilts = [0.30, 0.18]

      // Draw orbit ellipses
      for (let ri = 0; ri < 2; ri++) {
        const tilt = ringTilts[ri]
        const r = ri === 0 ? radius : radius * 0.8
        const color = ri === 0 ? '139,92,246' : '96,165,250'
        ctx.beginPath()
        const steps = 90
        let first = true
        for (let s = 0; s <= steps; s++) {
          const a = (s / steps) * Math.PI * 2
          const x3 = Math.cos(a) * r
          const y3 = Math.sin(a) * r * Math.cos(tilt)
          const z3 = Math.sin(a) * r * Math.sin(tilt)
          const p = project(x3, y3, z3, cx, cy, fov)
          if (first) { ctx.moveTo(p.x, p.y); first = false } else { ctx.lineTo(p.x, p.y) }
        }
        ctx.strokeStyle = `rgba(${color},0.15)`
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Compute 3D module positions
      const modPositions = ORBIT_MODULES.map((mod, i) => {
        const tilt = ringTilts[mod.ring]
        const r = mod.ring === 0 ? radius : radius * 0.8
        const dir = mod.ring === 0 ? 1 : -0.65
        const baseAngle = (i / ORBIT_MODULES.length) * Math.PI * 2
        const a = baseAngle + elapsed * rotSpeed * dir
        const x3 = Math.cos(a) * r
        const y3 = Math.sin(a) * r * Math.cos(tilt)
        const z3 = Math.sin(a) * r * Math.sin(tilt)
        const p = project(x3, y3, z3, cx, cy, fov)
        return { ...p, mod, z3 }
      })

      // Painter's sort: back → front
      const sorted = [...modPositions].sort((a, b) => a.z3 - b.z3)

      const drawPass = (frontPass: boolean) => {
        for (const mp of sorted) {
          const isFront = mp.z3 > 0
          if (isFront !== frontPass) continue

          // Connection line
          const lineGrad = ctx.createLinearGradient(cx, cy, mp.x, mp.y)
          lineGrad.addColorStop(0, `rgba(${mp.mod.color},0)`)
          lineGrad.addColorStop(0.25, `rgba(${mp.mod.color},0.1)`)
          lineGrad.addColorStop(1, `rgba(${mp.mod.color},0.22)`)
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(mp.x, mp.y)
          ctx.strokeStyle = lineGrad
          ctx.lineWidth = mp.scale * 0.9
          ctx.stroke()

          // Data stream particles
          if (!reduced) {
            for (const s of streams) {
              if (s.moduleIdx !== modPositions.indexOf(mp)) continue
              s.t += s.speed * dt
              if (s.t > 1) s.t -= 1
              const t = s.reverse ? 1 - s.t : s.t
              const sx = cx + (mp.x - cx) * t
              const sy = cy + (mp.y - cy) * t
              const alpha = Math.sin(s.t * Math.PI) * 0.85
              const pg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 7)
              pg.addColorStop(0, `rgba(${mp.mod.color},${alpha})`)
              pg.addColorStop(1, `rgba(${mp.mod.color},0)`)
              ctx.beginPath()
              ctx.arc(sx, sy, 7, 0, Math.PI * 2)
              ctx.fillStyle = pg
              ctx.fill()
              ctx.beginPath()
              ctx.arc(sx, sy, 1.5, 0, Math.PI * 2)
              ctx.fillStyle = `rgba(215,230,255,${alpha})`
              ctx.fill()
            }
          }

          // Module card
          drawModuleCard(ctx, mp.x, mp.y, mp.scale * 0.88, mp.mod.label, mp.mod.sublabel, mp.mod.color, elapsed, isMobile)
        }
      }

      drawPass(false) // back pass

      // ── Central Command Core ──
      const pulse = 0.06 + 0.04 * Math.sin(elapsed * 1.6)
      const pulse2 = 0.06 + 0.04 * Math.sin(elapsed * 2.1 + 1)

      // Outer glow halo
      const coreHalo = ctx.createRadialGradient(cx, cy, 0, cx, cy, 70)
      coreHalo.addColorStop(0, `rgba(96,165,250,${pulse + 0.05})`)
      coreHalo.addColorStop(0.4, `rgba(99,102,241,${pulse})`)
      coreHalo.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.beginPath()
      ctx.arc(cx, cy, 70, 0, Math.PI * 2)
      ctx.fillStyle = coreHalo
      ctx.fill()

      // Outer pulsing ring
      ctx.beginPath()
      ctx.arc(cx, cy, 34 + pulse2 * 8, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(96,165,250,${0.22 + pulse2})`
      ctx.lineWidth = 1
      ctx.stroke()

      // Mid ring (static)
      ctx.beginPath()
      ctx.arc(cx, cy, 26, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(148,163,255,0.5)`
      ctx.lineWidth = 1.2
      ctx.stroke()

      // Rotating tick marks
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(elapsed * 0.45)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(Math.cos(a) * 20, Math.sin(a) * 20)
        ctx.lineTo(Math.cos(a) * 26, Math.sin(a) * 26)
        ctx.strokeStyle = 'rgba(96,165,250,0.55)'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      ctx.restore()

      // Counter-rotating hexagon
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(elapsed * -0.18)
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 6
        const r = 17
        if (i === 0) { ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r) } else { ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r) }
      }
      ctx.closePath()
      const hexFill = ctx.createLinearGradient(-17, -17, 17, 17)
      hexFill.addColorStop(0, 'rgba(96,165,250,0.28)')
      hexFill.addColorStop(1, 'rgba(99,102,241,0.12)')
      ctx.fillStyle = hexFill
      ctx.strokeStyle = 'rgba(148,163,255,0.65)'
      ctx.lineWidth = 1
      ctx.fill()
      ctx.stroke()
      ctx.restore()

      // Core center dot
      ctx.beginPath()
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(220,235,255,${0.82 + 0.18 * Math.sin(elapsed * 2.2)})`
      ctx.fill()

      // Label below core
      ctx.fillStyle = 'rgba(140,165,215,0.45)'
      ctx.font = '500 8px Inter,ui-sans-serif,system-ui,sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('COMMAND CORE', cx, cy + 58)

      drawPass(true) // front pass (over core connection lines)

      // Telemetry pipeline — bottom strip
      if (!isMobile) {
        const stripY = h - 36
        const segW = w / PIPELINE_LABELS.length
        for (let i = 0; i < PIPELINE_LABELS.length; i++) {
          const lx = segW * i + segW / 2
          const active = Math.floor(elapsed * 0.9) % PIPELINE_LABELS.length === i
          ctx.fillStyle = active ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)'
          ctx.fillRect(segW * i + 1, stripY - 8, segW - 2, 28)
          ctx.fillStyle = active ? 'rgba(96,165,250,0.8)' : 'rgba(150,170,210,0.35)'
          ctx.font = `500 9px Inter,ui-sans-serif,system-ui,sans-serif`
          ctx.textAlign = 'center'
          ctx.fillText(PIPELINE_LABELS[i].toUpperCase(), lx, stripY + 8)
          if (i > 0) {
            ctx.beginPath()
            ctx.moveTo(segW * i, stripY - 8)
            ctx.lineTo(segW * i, stripY + 20)
            ctx.strokeStyle = 'rgba(100,120,180,0.12)'
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
        ctx.strokeStyle = 'rgba(100,120,180,0.15)'
        ctx.lineWidth = 1
        ctx.strokeRect(0, stripY - 8, w, 28)
      }

      // Edge vignette
      const vig = ctx.createRadialGradient(cx, cy, h * 0.28, cx, cy, h * 0.82)
      vig.addColorStop(0, 'rgba(0,0,0,0)')
      vig.addColorStop(1, 'rgba(0,0,8,0.55)')
      ctx.fillStyle = vig
      ctx.fillRect(0, 0, w, h)

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)

    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') last = performance.now()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      role="img"
      aria-label="3D command core animation: Studio, Workbench, Apps and Agents, Memory, Operations, and Settings modules orbit the central AI operations core. Pipeline telemetry shows input, routing, agent, memory, artifact, approval, and deployment stages."
    />
  )
}
