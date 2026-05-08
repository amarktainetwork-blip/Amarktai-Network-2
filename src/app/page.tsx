import PublicShell from '@/components/public/PublicShell'
import IntelligenceFabric from '@/components/public/IntelligenceFabric'

// ── Data ─────────────────────────────────────────────────────────────────────

const productModules = [
  {
    id: 'studio',
    label: 'Studio',
    tag: 'Multimodal Execution',
    description:
      'Chat, research, image synthesis, video generation, audio, transcription, and artifact production in a single unified execution surface.',
    accent: '96,165,250',
  },
  {
    id: 'workbench',
    label: 'Workbench',
    tag: 'Repo-to-Deploy Pipeline',
    description:
      'Prompt → plan → patch → automated checks → PR review → guarded deployment. Full repository path with traceability at every stage.',
    accent: '139,92,246',
  },
  {
    id: 'apps-agents',
    label: 'Apps & Agents',
    tag: 'Agent Orchestration',
    description:
      'Connected applications with dedicated agent assignments. Coding, research, runtime, policy, and deployment agents operating across the network.',
    accent: '167,139,250',
  },
  {
    id: 'memory',
    label: 'Memory',
    tag: 'Persistent Operational Context',
    description:
      'Historical outcomes, repository decisions, and job records remain addressable across sessions. Context compounds with every execution cycle.',
    accent: '99,102,241',
  },
  {
    id: 'operations',
    label: 'Operations',
    tag: 'Runtime Control',
    description:
      'Provider health, queue pressure, storage durability, approval state, and deployment guard conditions — visible and governed in real time.',
    accent: '79,70,229',
  },
  {
    id: 'settings',
    label: 'Settings',
    tag: 'Infrastructure Configuration',
    description:
      'Model routing policies, provider keys, adult content controls, agent behaviour rules, and system-wide governance parameters.',
    accent: '109,40,217',
  },
]

const workbenchSteps = [
  { step: '01', label: 'Prompt', detail: 'Operator intent and repository scope defined in plain language.' },
  { step: '02', label: 'Plan', detail: 'Automated change map and implementation path generated.' },
  { step: '03', label: 'Patch', detail: 'Code edits applied with explicit file and boundary scope.' },
  { step: '04', label: 'Checks', detail: 'Validation, lint, security scan, and policy compliance gates.' },
  { step: '05', label: 'PR', detail: 'Traceable pull request with full review state and approval record.' },
  { step: '06', label: 'Deploy', detail: 'Controlled release into runtime with deployment guard approval.' },
]

const studioCapabilities = [
  { label: 'Chat', detail: 'Context-aware conversation routed through the optimal model.' },
  { label: 'Research', detail: 'Deep-search tasks with web, document, and memory integration.' },
  { label: 'Image', detail: 'Text-to-image synthesis via routed generation providers.' },
  { label: 'Video', detail: 'Prompt-driven video production with artifact storage.' },
  { label: 'Audio', detail: 'Speech synthesis and voice-based workflow triggers.' },
  { label: 'Transcription', detail: 'High-accuracy multiformat audio-to-text conversion.' },
  { label: 'Artifacts', detail: 'Every output stored, versioned, and retrievable.' },
]

const agentTypes = [
  {
    type: 'App Agents',
    role: 'Operate within connected application scopes, managing app-specific context and instructions.',
    accent: '96,165,250',
  },
  {
    type: 'Coding Agents',
    role: 'Plan, patch, test, and submit repository changes through the Workbench pipeline.',
    accent: '139,92,246',
  },
  {
    type: 'Research Agents',
    role: 'Execute deep-search tasks, synthesise findings, and produce structured artifacts.',
    accent: '167,139,250',
  },
  {
    type: 'Deployment Agents',
    role: 'Manage release sequencing, approval gates, and runtime verification checks.',
    accent: '99,102,241',
  },
  {
    type: 'Safety Agents',
    role: 'Enforce content policy, audit outputs, and block non-compliant operations before execution.',
    accent: '79,70,229',
  },
]

const memoryNodes = [
  { label: 'Artifact history', detail: 'Every generated output indexed and retrievable.' },
  { label: 'Repository decisions', detail: 'Patches, PRs, and deployment outcomes recorded.' },
  { label: 'Job outcomes', detail: 'Completed task results inform future routing.' },
  { label: 'App context', detail: 'Per-application operational history preserved.' },
  { label: 'Session threads', detail: 'Conversation continuity across operator sessions.' },
  { label: 'Model performance', detail: 'Route quality and latency history tracked.' },
]

const runtimeMetrics = [
  {
    label: 'Provider health',
    value: 'Live route quality, latency scoring, and automatic failover state.',
    accent: '96,165,250',
  },
  {
    label: 'Queues',
    value: 'Execution pressure across all active workloads and concurrency limits.',
    accent: '139,92,246',
  },
  {
    label: 'Storage',
    value: 'Artifact and memory durability status with retention policy visibility.',
    accent: '167,139,250',
  },
  {
    label: 'Approvals',
    value: 'Pending, accepted, and blocked operations with full audit trail.',
    accent: '99,102,241',
  },
  {
    label: 'Deployment guards',
    value: 'Pre-release check state and release gate approval conditions.',
    accent: '79,70,229',
  },
  {
    label: 'Policy controls',
    value: 'Content governance, agent limits, and operator permission boundaries.',
    accent: '109,40,217',
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <PublicShell>
      {/* ── 1. Cinematic Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] overflow-hidden">
        {/* Full-bleed 3D animation */}
        <div className="absolute inset-0">
          <IntelligenceFabric className="h-full w-full" />
        </div>

        {/* Gradient overlay for legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#05070f]/60 via-transparent to-[#05070f]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#05070f] to-transparent" />

        {/* Hero copy — anchored to bottom-left */}
        <div className="relative z-10 flex h-full min-h-[92vh] flex-col justify-end px-5 pb-16 lg:px-8 lg:pb-20">
          <div className="max-w-4xl">
            <p className="mb-4 text-[11px] uppercase tracking-[0.28em] text-[#6b82b8]">
              Private AI operations infrastructure
            </p>
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-[#eef2fb] sm:text-5xl lg:text-[3.75rem]">
              A complete operating system<br className="hidden sm:block" />
              for AI at production scale.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#8fa4cc] sm:text-lg sm:leading-9">
              From operator input to governed deployment: model routing, agent orchestration, persistent memory, multimodal Studio, and artifact management — coordinated in one private infrastructure layer.
            </p>
          </div>
        </div>
      </section>

      {/* ── 2. Product Cockpit ────────────────────────────────────────────── */}
      <section className="relative bg-[#05070f] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-14">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#5a6f9a]">Product surface</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#eef2fb] sm:text-4xl">
              Six integrated operating areas. One controlled environment.
            </h2>
          </div>

          <div className="grid gap-[1px] overflow-hidden rounded-sm border border-[#1a2038] bg-[#1a2038] md:grid-cols-2 lg:grid-cols-3">
            {productModules.map((mod) => (
              <article key={mod.id} className="group relative bg-[#070a14] p-7 transition duration-300 hover:bg-[#0b0f1e]">
                {/* Accent top line */}
                <div
                  className="absolute inset-x-0 top-0 h-px transition duration-300 group-hover:opacity-100"
                  style={{
                    background: `linear-gradient(90deg, transparent, rgba(${mod.accent},0.6), transparent)`,
                    opacity: 0.4,
                  }}
                />
                <p
                  className="text-[10px] font-medium uppercase tracking-[0.22em]"
                  style={{ color: `rgba(${mod.accent},0.75)` }}
                >
                  {mod.tag}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.02em] text-[#e8edf8]">{mod.label}</h3>
                <p className="mt-3 text-sm leading-7 text-[#8a97b8]">{mod.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. Workbench Showcase ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#040610] py-24 lg:py-32">
        {/* Background grid */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(96,165,250,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.5)_1px,transparent_1px)] [background-size:48px_48px]" />
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(99,102,241,0.12),transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-14">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#5a6f9a]">Workbench</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#eef2fb] sm:text-4xl">
              Repository path from intent to governed deployment.
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#7a8daf]">
              A structured pipeline that converts natural-language instructions into reviewed, tested, and approved production releases.
            </p>
          </div>

          {/* Pipeline flow */}
          <div className="grid gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] lg:grid-cols-6">
            {workbenchSteps.map((item, i) => (
              <article key={item.step} className="relative bg-[#070a14] px-5 pb-7 pt-6">
                {/* Step number */}
                <p
                  className="font-mono text-[11px] tracking-[0.12em]"
                  style={{ color: 'rgba(99,102,241,0.55)' }}
                >
                  {item.step}
                </p>
                <h3 className="mt-3 text-base font-semibold tracking-[-0.01em] text-[#e2e8f5]">{item.label}</h3>
                <p className="mt-2 text-xs leading-6 text-[#7a8daf]">{item.detail}</p>
                {/* Arrow connector */}
                {i < workbenchSteps.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-[9px] text-[#2a3458] lg:block">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M2 9h14M10 3l6 6-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
              </article>
            ))}
          </div>

          {/* Terminal-style label */}
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1e2a48] to-transparent" />
            <span className="font-mono text-[10px] tracking-[0.18em] text-[#374266]">
              WORKBENCH · CONTROLLED AUTOMATION
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#1e2a48] to-transparent" />
          </div>
        </div>
      </section>

      {/* ── 4. Studio Showcase ────────────────────────────────────────────── */}
      <section className="bg-[#05070f] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#5a6f9a]">Studio</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#eef2fb] sm:text-4xl">
                Multimodal production in one execution surface.
              </h2>
              <p className="mt-5 text-sm leading-8 text-[#7a8daf]">
                Every creative and analytical workflow — from deep research to video synthesis — runs through the same routing layer, memory system, and artifact pipeline.
              </p>
              <div className="mt-8 border-l border-[#1e2a48] pl-5">
                <p className="text-xs leading-7 text-[#5d70a0]">
                  Artifacts generated in Studio are available to Workbench, Agents, and Operations — indexed in memory and retrievable in future sessions.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] sm:grid-cols-2">
              {studioCapabilities.map((cap) => (
                <article key={cap.label} className="bg-[#070a14] px-5 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#b0c0e0]">{cap.label}</p>
                  <p className="mt-2 text-xs leading-6 text-[#6a7da0]">{cap.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Agent Orchestration ────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#040610] py-24 lg:py-32">
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.08),transparent_70%)]" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-14">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#5a6f9a]">Agent orchestration</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#eef2fb] sm:text-4xl">
              Specialised agents operating across every system layer.
            </h2>
          </div>

          <div className="grid gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] md:grid-cols-2 lg:grid-cols-3">
            {agentTypes.map((agent, i) => (
              <article key={agent.type} className={`bg-[#070a14] p-7 ${i === agentTypes.length - 1 && agentTypes.length % 3 !== 0 ? 'md:col-span-2 lg:col-span-1' : ''}`}>
                <div className="mb-4 flex items-center gap-3">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: `rgba(${agent.accent},0.8)` }}
                  />
                  <h3 className="text-sm font-semibold tracking-[-0.01em] text-[#d8e3f5]">{agent.type}</h3>
                </div>
                <p className="text-sm leading-7 text-[#7a8daf]">{agent.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Memory & Learning ──────────────────────────────────────────── */}
      <section className="bg-[#05070f] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#5a6f9a]">Memory & learning</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#eef2fb] sm:text-4xl">
                Operational context that compounds with every cycle.
              </h2>
              <p className="mt-5 text-sm leading-8 text-[#7a8daf]">
                Historical outcomes, repository decisions, and deployment records remain permanently addressable. Routing decisions, agent behaviour, and approval context improve as memory depth grows.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038]">
                {memoryNodes.map((node) => (
                  <div key={node.label} className="bg-[#070a14] px-4 py-4">
                    <p className="text-xs font-medium text-[#a0b2d4]">{node.label}</p>
                    <p className="mt-1 text-[11px] leading-5 text-[#576480]">{node.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="space-y-5 border-l border-[#1e2a48] pl-7">
                {[
                  'Runtime truth is context-aware.',
                  'Agents access historical job outcomes.',
                  'Routing quality improves with data depth.',
                  'Approval records build governance history.',
                ].map((line) => (
                  <p key={line} className="text-sm leading-7 text-[#8a9dbe]">{line}</p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. Runtime Control ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#040610] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 opacity-[0.03] [background-image:linear-gradient(rgba(96,165,250,0.6)_1px,transparent_1px),linear-gradient(90deg,rgba(96,165,250,0.6)_1px,transparent_1px)] [background-size:60px_60px]" />

        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-14">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[#5a6f9a]">Runtime control</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-[#eef2fb] sm:text-4xl">
              Infrastructure governance with full runtime visibility.
            </h2>
          </div>

          <div className="grid gap-[1px] overflow-hidden border border-[#1a2038] bg-[#1a2038] md:grid-cols-2 lg:grid-cols-3">
            {runtimeMetrics.map((metric) => (
              <article key={metric.label} className="group relative bg-[#070a14] px-6 py-6 transition hover:bg-[#0b0f1e]">
                <div className="mb-3 flex items-center gap-2.5">
                  <div
                    className="h-1 w-5 rounded-full"
                    style={{ background: `rgba(${metric.accent},0.65)` }}
                  />
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c4d0e8]">{metric.label}</h3>
                </div>
                <p className="text-sm leading-7 text-[#7a8daf]">{metric.value}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Amarktai Assistant ─────────────────────────────────────────── */}
      <section className="bg-[#05070f] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#5a6f9a]">Amarktai Assistant</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-[#eef2fb] sm:text-4xl">
                The operator interface for command execution and oversight.
              </h2>
              <p className="mt-5 text-sm leading-8 text-[#7a8daf]">
                Amarktai Assistant is the calm operator interface for issuing instructions, retrieving memory, navigating routing decisions, triggering workflow transitions, and maintaining governed execution states.
              </p>
              <div className="mt-8 space-y-3">
                {['Context-aware across all system layers', 'Action-aware with routing and approval state', 'Memory-aware with persistent session history'].map((trait) => (
                  <div key={trait} className="flex items-start gap-3">
                    <div className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[rgba(96,165,250,0.6)]" />
                    <p className="text-sm leading-6 text-[#8a9dbe]">{trait}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Simulated interface panel */}
            <div className="overflow-hidden border border-[#1a2038]">
              <div className="flex items-center gap-2 border-b border-[#1a2038] bg-[#060910] px-5 py-3">
                <div className="h-2 w-2 rounded-full bg-[rgba(96,165,250,0.4)]" />
                <span className="font-mono text-[10px] tracking-[0.18em] text-[#3d5280]">AMARKTAI ASSISTANT</span>
              </div>
              <div className="bg-[#050810] p-6">
                <div className="space-y-4">
                  {[
                    { role: 'operator', text: 'Review memory context for current repository workload.' },
                    { role: 'assistant', text: 'Retrieving 14 relevant artifacts from the last 3 deployment cycles. Memory confidence: high. Routing suggestion ready.' },
                    { role: 'operator', text: 'Proceed with patch generation and submit for approval.' },
                    { role: 'assistant', text: 'Patch queued. Checks running. Approval gate awaiting policy clearance.' },
                  ].map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'operator' ? 'justify-end' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="mt-1 h-5 w-5 shrink-0 rounded-sm bg-[rgba(96,165,250,0.15)] ring-1 ring-[rgba(96,165,250,0.3)]" />
                      )}
                      <div
                        className={`max-w-[82%] rounded-sm px-4 py-3 text-xs leading-6 ${
                          msg.role === 'operator'
                            ? 'bg-[#0f1628] text-[#9ab0d4]'
                            : 'bg-[#0a102a] text-[#b8ccec]'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex items-center gap-2 border border-[#1a2540] px-4 py-3">
                  <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[rgba(96,165,250,0.6)]" />
                  <span className="font-mono text-[10px] text-[#374870]">SYSTEM READY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. Closing ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#040610] py-24 lg:py-32">
        {/* Top border with gradient */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(99,102,241,0.35)] to-transparent" />

        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.26em] text-[#4a5f88]">AmarktAI Network</p>
              <h2 className="mt-5 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-[-0.03em] text-[#d8e3f5] sm:text-4xl">
                Private AI operations require controlled routing, persistent context, and reviewable deployment governance.
              </h2>
              <p className="mt-6 max-w-xl text-sm leading-8 text-[#6074a0]">
                AmarktAI Network is the infrastructure layer where models, agents, memory, and deployment operate as one governed system.
              </p>
            </div>
            <div className="flex flex-col items-end gap-4">
              <div className="text-right">
                <p className="font-mono text-[10px] tracking-[0.2em] text-[#2e3e62]">AMARKTAI NETWORK</p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-[#1f2d4a]">PRIVATE INFRASTRUCTURE</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
