'use client'

import { useEffect, useRef } from 'react'

type Layer = {
  id: string
  y: number
  color: string
}

type Node = {
  id: string
  lane: number
  x: number
  label: string
}

type Signal = {
  from: number
  to: number
  t: number
  speed: number
}

const LAYERS: Layer[] = [
  { id: 'input', y: 0.16, color: '120,131,167' },
  { id: 'routing', y: 0.28, color: '121,137,195' },
  { id: 'agent', y: 0.42, color: '132,144,214' },
  { id: 'memory', y: 0.54, color: '123,132,170' },
  { id: 'artifact', y: 0.66, color: '106,122,173' },
  { id: 'approval', y: 0.78, color: '145,154,199' },
  { id: 'deployment', y: 0.9, color: '133,149,236' },
]

const NODES: Node[] = [
  { id: 'node-input', lane: 0, x: 0.12, label: 'Input' },
  { id: 'node-routing-a', lane: 1, x: 0.32, label: 'Model Routing' },
  { id: 'node-routing-b', lane: 1, x: 0.55, label: 'Provider Decision' },
  { id: 'node-agent', lane: 2, x: 0.73, label: 'Agent' },
  { id: 'node-memory-a', lane: 3, x: 0.38, label: 'Memory' },
  { id: 'node-memory-b', lane: 3, x: 0.62, label: 'Context' },
  { id: 'node-artifact', lane: 4, x: 0.82, label: 'Artifact' },
  { id: 'node-approval-a', lane: 5, x: 0.28, label: 'Approval Gate' },
  { id: 'node-approval-b', lane: 5, x: 0.52, label: 'Policy Checkpoint' },
  { id: 'node-deploy', lane: 6, x: 0.75, label: 'Deployment' },
]

function nodePos(node: Node, w: number, h: number) {
  return {
    x: node.x * w,
    y: LAYERS[node.lane].y * h,
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

    const links: Array<[number, number]> = [
      [0, 1], [1, 2], [2, 3], [3, 6], [0, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [2, 4], [3, 5],
    ]

    const signals: Signal[] = reduced
      ? []
      : Array.from({ length: 24 }, (_, i) => ({
          from: links[i % links.length][0],
          to: links[i % links.length][1],
          t: Math.random(),
          speed: 0.15 + Math.random() * 0.32,
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
      const dt = Math.min(40, now - last)
      last = now
      const w = canvas.clientWidth
      const h = canvas.clientHeight

      ctx.clearRect(0, 0, w, h)

      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, 'rgba(15,18,28,0.92)')
      bg.addColorStop(1, 'rgba(8,10,15,0.96)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      for (let i = 0; i < LAYERS.length; i++) {
        const layer = LAYERS[i]
        const y = layer.y * h
        const drift = reduced ? 0 : Math.sin(now * 0.00028 + i * 0.7) * 6
        ctx.beginPath()
        ctx.moveTo(0, y + drift)
        ctx.lineTo(w, y + drift)
        ctx.strokeStyle = `rgba(${layer.color},0.28)`
        ctx.lineWidth = 1
        ctx.stroke()

        ctx.fillStyle = `rgba(${layer.color},0.42)`
        ctx.font = '600 10px var(--font-geist-mono), ui-monospace, monospace'
        ctx.textAlign = 'left'
        ctx.fillText(layer.id.toUpperCase(), 16, y + drift - 8)
      }

      for (const [a, b] of links) {
        const from = nodePos(NODES[a], w, h)
        const to = nodePos(NODES[b], w, h)
        const grad = ctx.createLinearGradient(from.x, from.y, to.x, to.y)
        grad.addColorStop(0, 'rgba(172,182,223,0.24)')
        grad.addColorStop(1, 'rgba(134,151,231,0.3)')
        ctx.beginPath()
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1
        ctx.stroke()
      }

      for (const node of NODES) {
        const p = nodePos(node, w, h)
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 14)
        glow.addColorStop(0, 'rgba(164,183,255,0.68)')
        glow.addColorStop(1, 'rgba(164,183,255,0)')
        ctx.beginPath()
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()

        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fillStyle = '#d8ddf0'
        ctx.fill()
      }

      if (!reduced) {
        for (const signal of signals) {
          signal.t += signal.speed * (dt / 1000)
          if (signal.t > 1) {
            signal.t = 0
            const next = links[Math.floor(Math.random() * links.length)]
            signal.from = next[0]
            signal.to = next[1]
          }
          const a = nodePos(NODES[signal.from], w, h)
          const b = nodePos(NODES[signal.to], w, h)
          const x = a.x + (b.x - a.x) * signal.t
          const y = a.y + (b.y - a.y) * signal.t

          const pulse = ctx.createRadialGradient(x, y, 0, x, y, 10)
          pulse.addColorStop(0, 'rgba(146,170,255,0.95)')
          pulse.addColorStop(1, 'rgba(146,170,255,0)')
          ctx.beginPath()
          ctx.arc(x, y, 10, 0, Math.PI * 2)
          ctx.fillStyle = pulse
          ctx.fill()
        }
      }

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
      aria-label="Intelligence Fabric animation showing model routing, agents, memory, approvals, and deployment flow"
    />
  )
}
