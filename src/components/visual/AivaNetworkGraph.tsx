'use client'

import { motion } from 'framer-motion'

/** Network nodes: central AmarktAI + 8 surrounding capability nodes */
const AIVA = { x: 400, y: 240 }

const OUTER_NODES = [
  { id: 'apps',   x: 175,  y: 120, label: 'Apps',          color: '#60a5fa', status: 'Learn'   },
  { id: 'agents', x: 400,  y: 60,  label: 'Agents',        color: '#a78bfa', status: 'Act'     },
  { id: 'memory', x: 625,  y: 120, label: 'Memory',        color: '#34d399', status: 'Learn'   },
  { id: 'code',   x: 690,  y: 270, label: 'Code',          color: '#fb923c', status: 'Act'     },
  { id: 'media',  x: 600,  y: 390, label: 'Media',         color: '#f472b6', status: 'Create'  },
  { id: 'research',x: 390, y: 420, label: 'Research',      color: '#facc15', status: 'Heal'    },
  { id: 'security',x: 195, y: 390, label: 'Security',      color: '#f87171', status: 'Secure'  },
  { id: 'infra',  x: 110,  y: 270, label: 'Infrastructure',color: '#67e8f9', status: 'Heal'    },
]

const STATUS_COLOR: Record<string, string> = {
  Learn:  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Act:    'bg-violet-500/20 text-violet-300 border-violet-500/30',
  Heal:   'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Secure: 'bg-red-500/20 text-red-300 border-red-500/30',
  Create: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
}

function PulseDot({
  x1, y1, x2, y2, color, delay, duration,
}: {
  x1: number; y1: number; x2: number; y2: number
  color: string; delay: number; duration: number
}) {
  const d = `M${x1} ${y1} L${x2} ${y2}`
  return (
    <>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={color} strokeOpacity={0.12} strokeWidth={1.5}
        strokeLinecap="round"
      />
      <motion.path
        d={d}
        stroke={color}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="6 500"
        strokeDashoffset={0}
        initial={{ opacity: 0 }}
        animate={{ strokeDashoffset: [-8, -520], opacity: [0, 0.85, 0.85, 0] }}
        transition={{
          duration,
          repeat: Infinity,
          delay,
          ease: 'easeInOut',
          times: [0, 0.08, 0.88, 1],
        }}
      />
    </>
  )
}

export default function AivaNetworkGraph({ className = '' }: { className?: string }) {
  return (
    <div className={`relative w-full max-w-[520px] mx-auto select-none ${className}`} aria-hidden="true">
      <svg
        viewBox="0 50 800 430"
        className="w-full"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background radial glow around AmarktAI centre */}
        <radialGradient id="aiva-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <circle cx={AIVA.x} cy={AIVA.y} r={140} fill="url(#aiva-glow)" />

        {/* Connection lines with pulse dots */}
        {OUTER_NODES.map((node, i) => (
          <PulseDot
            key={node.id}
            x1={AIVA.x} y1={AIVA.y}
            x2={node.x} y2={node.y}
            color={node.color}
            delay={i * 0.45}
            duration={2.8 + (i % 3) * 0.4}
          />
        ))}

        {/* Outer node pulses */}
        {OUTER_NODES.map((node, i) => (
          <motion.circle
            key={`ring-${node.id}`}
            cx={node.x} cy={node.y} r={10}
            stroke={node.color} strokeOpacity={0} strokeWidth={1} fill="none"
            animate={{ r: [8, 18], strokeOpacity: [0.5, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.38, ease: 'easeOut' }}
          />
        ))}

        {/* Outer node dots */}
        {OUTER_NODES.map((node) => (
          <motion.circle
            key={node.id}
            cx={node.x} cy={node.y} r={5}
            fill={node.color}
            animate={{ opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 2.8, repeat: Infinity, delay: Math.random() * 1.2, ease: 'easeInOut' }}
          />
        ))}

        {/* AmarktAI core outer pulse ring */}
        <motion.circle
          cx={AIVA.x} cy={AIVA.y} r={30}
          stroke="#22d3ee" strokeOpacity={0} strokeWidth={1.5} fill="none"
          animate={{ r: [26, 46], strokeOpacity: [0.4, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut' }}
        />
        {/* AmarktAI core inner ring */}
        <circle cx={AIVA.x} cy={AIVA.y} r={24}
          fill="#0a1628" stroke="#22d3ee" strokeOpacity={0.35} strokeWidth={1.5} />
        {/* AmarktAI core dot */}
        <motion.circle
          cx={AIVA.x} cy={AIVA.y} r={10}
          fill="#22d3ee" fillOpacity={0.9}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>

      {/* AmarktAI centre label */}
      <div
        className="absolute flex flex-col items-center"
        style={{
          left: `${(AIVA.x / 800) * 100}%`,
          top: `${((AIVA.y - 50) / 430) * 100}%`,
          transform: 'translate(-50%, calc(-100% - 36px))',
        }}
      >
        <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-cyan-200 uppercase">
          AmarktAI
        </span>
      </div>

      {/* Outer node labels */}
      {OUTER_NODES.map((node) => {
        const leftPct = (node.x / 800) * 100
        const topPct  = ((node.y - 50) / 430) * 100
        const isLeft  = node.x < AIVA.x
        return (
          <motion.div
            key={`label-${node.id}`}
            className="absolute flex flex-col items-center gap-1"
            style={{
              left: `${leftPct}%`,
              top: `${topPct}%`,
              transform: `translate(-50%, ${node.y < AIVA.y ? 'calc(-100% - 14px)' : '14px'})`,
            }}
            initial={{ opacity: 0, y: isLeft ? 6 : -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <span className="text-[10px] font-medium text-slate-300 whitespace-nowrap">{node.label}</span>
            <span className={`rounded-full border px-1.5 py-0.5 text-[9px] font-semibold whitespace-nowrap ${STATUS_COLOR[node.status]}`}>
              {node.status}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}
