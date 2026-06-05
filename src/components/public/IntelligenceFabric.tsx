'use client'

import { useEffect, useRef } from 'react'

type NodeSpec = {
  label: string
  detail: string
  lane: 'input' | 'core' | 'output'
  x: number
  y: number
  accent: string
}

type Stream = {
  from: number
  to: number
  progress: number
  speed: number
  offset: number
}

const NODES: NodeSpec[] = [
  { label: 'Apps', detail: 'connected modules', lane: 'input', x: 0.56, y: 0.3, accent: '96,165,250' },
  { label: 'Media', detail: 'creative work', lane: 'input', x: 0.56, y: 0.62, accent: '94,234,212' },
  { label: 'Core OS', detail: 'one command layer', lane: 'core', x: 0.7, y: 0.39, accent: '96,165,250' },
  { label: 'Agents', detail: 'coordinated work', lane: 'core', x: 0.7, y: 0.65, accent: '167,139,250' },
  { label: 'Memory', detail: 'shared context', lane: 'output', x: 0.87, y: 0.31, accent: '94,234,212' },
  { label: 'Runtime Truth', detail: 'verified status', lane: 'output', x: 0.87, y: 0.62, accent: '125,211,252' },
]

const EDGES = [
  [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5],
]

const TELEMETRY = ['plan', 'build', 'launch', 'monitor', 'improve']

function project(x: number, y: number, depth: number) {
  const scale = 1 + depth * 0.035
  return { x: x * scale, y: y * scale, scale }
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function nodePosition(node: NodeSpec, width: number, height: number, compact: boolean) {
  const x = node.x * width
  const y = node.y * height
  if (!compact) return { x, y }

  if (node.lane === 'input') return { x: width * 0.16, y }
  if (node.lane === 'output') return { x: width * 0.84, y }
  return { x: width * (0.38 + (node.x - 0.42) * 0.85), y }
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: NodeSpec,
  x: number,
  y: number,
  elapsed: number,
  compact: boolean,
) {
  const w = compact ? (node.lane === 'core' ? 116 : 94) : node.lane === 'core' ? 150 : 126
  const h = compact ? 44 : 56
  const pulse = node.lane === 'core' ? 0.12 + 0.08 * Math.sin(elapsed * 1.2 + x * 0.01) : 0.04

  const boxX = x - w / 2
  const boxY = y - h / 2
  roundedRect(ctx, boxX, boxY, w, h, 7)
  ctx.fillStyle = `rgba(7, 12, 24, ${node.lane === 'core' ? 0.9 : 0.78})`
  ctx.fill()
  ctx.strokeStyle = `rgba(${node.accent}, ${0.24 + pulse})`
  ctx.lineWidth = node.lane === 'core' ? 1.2 : 1
  ctx.stroke()

  ctx.fillStyle = `rgba(${node.accent}, 0.76)`
  ctx.fillRect(boxX + 12, boxY + 10, compact ? 22 : 28, 1)

  ctx.fillStyle = node.lane === 'core' ? 'rgba(248,252,255,1)' : 'rgba(235,244,255,0.96)'
  ctx.font = `600 ${compact ? 9 : 11}px Inter, system-ui, sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(node.label, boxX + 12, boxY + (compact ? 27 : 32))

  if (!compact) {
    ctx.fillStyle = `rgba(${node.accent}, 0.82)`
    ctx.font = '400 9px Inter, system-ui, sans-serif'
    ctx.fillText(node.detail, boxX + 12, boxY + 46)
  }
}

function drawLine(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, alpha: number) {
  ctx.beginPath()
  ctx.moveTo(ax, ay)
  const midX = (ax + bx) / 2
  ctx.bezierCurveTo(midX, ay, midX, by, bx, by)
  ctx.strokeStyle = `rgba(138, 164, 205, ${alpha})`
  ctx.lineWidth = 1
  ctx.stroke()
}

export default function IntelligenceFabric({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let isMobile = window.innerWidth < 720
    let raf = 0
    let width = 0
    let height = 0
    let last = performance.now()
    const start = last

    const streams: Stream[] = reduced
      ? []
      : EDGES.flatMap(([from, to], index) => [
          { from, to, progress: (index * 0.13) % 1, speed: 0.1 + (index % 4) * 0.018, offset: index * 0.5 },
          { from, to, progress: (index * 0.21 + 0.48) % 1, speed: 0.08 + (index % 3) * 0.02, offset: index * 0.7 },
        ])

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      isMobile = width < 720
    }

    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (now: number) => {
      const elapsed = (now - start) / 1000
      const dt = Math.min(50, now - last) / 1000
      last = now

      ctx.clearRect(0, 0, width, height)

      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#05070c')
      bg.addColorStop(0.45, '#07101a')
      bg.addColorStop(1, '#020306')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      const grid = isMobile ? 42 : 54
      ctx.strokeStyle = 'rgba(157, 174, 205, 0.055)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += grid) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 0; y < height; y += grid) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      const positions = NODES.map((node, index) => {
        const base = nodePosition(node, width, height, isMobile)
        const depth = node.lane === 'core' ? Math.sin(elapsed * 0.35 + index) : 0
        const p = project(base.x - width / 2, base.y - height / 2, depth)
        return { x: p.x + width / 2, y: p.y + height / 2 }
      })

      ctx.fillStyle = 'rgba(7, 13, 25, 0.72)'
      roundedRect(ctx, isMobile ? width * 0.3 : width * 0.5, height * 0.22, isMobile ? width * 0.4 : width * 0.42, height * 0.48, 10)
      ctx.fill()
      ctx.strokeStyle = 'rgba(144, 168, 214, 0.16)'
      ctx.stroke()

      ctx.fillStyle = 'rgba(210,228,255,0.82)'
      ctx.font = '600 9px ui-monospace, SFMono-Regular, Consolas, monospace'
      ctx.textAlign = 'center'
      ctx.fillText('AMARKTAI NETWORK', width * (isMobile ? 0.5 : 0.71), height * 0.24)

      for (const [from, to] of EDGES) {
        const a = positions[from]
        const b = positions[to]
        drawLine(ctx, a.x, a.y, b.x, b.y, 0.14)
      }

      for (const stream of streams) {
        const a = positions[stream.from]
        const b = positions[stream.to]
        stream.progress = (stream.progress + stream.speed * dt) % 1
        const t = stream.progress
        const midX = (a.x + b.x) / 2
        const x1 = a.x + (midX - a.x) * t
        const y1 = a.y + (a.y - a.y) * t
        const x2 = midX + (b.x - midX) * t
        const y2 = a.y + (b.y - a.y) * t
        const x = t < 0.5 ? x1 : x2
        const y = t < 0.5 ? y1 : y2
        const alpha = Math.sin(t * Math.PI)
        ctx.beginPath()
        ctx.arc(x, y, isMobile ? 2.2 : 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(185, 214, 255, ${0.2 + alpha * 0.6})`
        ctx.fill()
      }

      if (!isMobile) {
        NODES.forEach((node, index) => {
          const pos = positions[index]
          drawNode(ctx, node, pos.x, pos.y, elapsed, false)
        })
      }

      const coreX = width * (isMobile ? 0.5 : 0.7)
      const coreY = height * 0.48
      ctx.beginPath()
      ctx.arc(coreX, coreY, isMobile ? 26 : 34, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(196, 181, 253, ${0.34 + 0.12 * Math.sin(elapsed * 1.4)})`
      ctx.lineWidth = 1.4
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(coreX, coreY, isMobile ? 11 : 15, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(220,230,255,0.86)'
      ctx.fill()

      const bandY = isMobile ? 22 : 30
      const step = width / TELEMETRY.length
      TELEMETRY.forEach((label, index) => {
        const active = Math.floor(elapsed * 1.1) % TELEMETRY.length === index
        ctx.fillStyle = active ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.09)'
        roundedRect(ctx, index * step + 5, bandY - 13, step - 10, 24, 5)
        ctx.fill()
        ctx.fillStyle = active ? 'rgba(225,246,255,1)' : 'rgba(214,230,250,0.9)'
        ctx.font = `600 ${isMobile ? 8 : 10}px ui-monospace, SFMono-Regular, Consolas, monospace`
        ctx.textAlign = 'center'
        ctx.fillText(label.toUpperCase(), index * step + step / 2, bandY + 3)
      })

      const vignette = ctx.createLinearGradient(0, 0, 0, height)
      vignette.addColorStop(0, 'rgba(0,0,0,0.18)')
      vignette.addColorStop(0.5, 'rgba(0,0,0,0)')
      vignette.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)

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
      aria-label="Amarktai Network operating system animation showing Core OS, apps, agents, media, memory, and runtime truth."
    />
  )
}
