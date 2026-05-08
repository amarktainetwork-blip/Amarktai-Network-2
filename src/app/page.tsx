import PublicShell from '@/components/public/PublicShell'
import IntelligenceFabric from '@/components/public/IntelligenceFabric'

const platformLayers = [
  {
    title: 'Orchestration',
    detail: 'Tasks enter one control plane, then move through scoped agents, tools, models, and artifact stores with traceable state.',
  },
  {
    title: 'Routing',
    detail: 'Requests are matched to providers by capability, latency, health, policy, cost, and fallback readiness.',
  },
  {
    title: 'Memory',
    detail: 'Repository decisions, generated artifacts, job outcomes, and session context remain available to future workflows.',
  },
  {
    title: 'Agents',
    detail: 'Specialized workers coordinate research, code, media, validation, policy, and deployment activity.',
  },
  {
    title: 'Approvals',
    detail: 'High-impact actions pass through reviewable gates before production systems, releases, or stored records change.',
  },
  {
    title: 'Deployments',
    detail: 'Code moves from prompt to plan, patch, checks, pull request, approval, and validated release.',
  },
]

const studioCapabilities = [
  ['Research', 'Deep inquiry, source synthesis, and structured findings routed through the right model path.'],
  ['Chat', 'Workspace-aware conversation grounded in memory, artifacts, and active operational state.'],
  ['Image and video', 'Generation workflows that produce stored artifacts instead of isolated files.'],
  ['Audio', 'Speech, transcription, and media tasks governed by the same routing and policy layer.'],
  ['Artifacts', 'Outputs are indexed, versioned, and retrievable across Studio, Workbench, agents, and operations.'],
  ['Streaming', 'Long-running work reports progress through visible execution state instead of opaque waiting.'],
]

const workbenchSteps = [
  ['Prompt', 'Intent, repository, constraints, and target surface are captured.'],
  ['Plan', 'The system proposes the implementation path and risk boundary.'],
  ['Patch', 'Changes are generated against scoped files with reviewable diffs.'],
  ['Checks', 'Lint, tests, policy, and runtime checks establish readiness.'],
  ['PR', 'A pull request preserves review, commentary, and approval history.'],
  ['Deploy', 'Release execution passes through validation and guard conditions.'],
]

const agentSystems = [
  ['Connected apps', 'Application context is attached to the work, not recreated per conversation.'],
  ['Assigned agents', 'Research, coding, media, policy, and deployment agents operate within defined scopes.'],
  ['Orchestration mesh', 'Agents exchange state through the control plane rather than ad hoc handoffs.'],
  ['Workflow systems', 'Repeated work becomes a governed sequence of inputs, checks, outputs, and memory updates.'],
]

const memoryItems = [
  'Persistent context across sessions and workflows',
  'Artifact memory for generated text, code, image, video, and audio',
  'Repository memory for patches, reviews, and release decisions',
  'Operational memory for routing outcomes, health, queues, and approvals',
  'Workflow learning that improves future route selection',
]

const operations = [
  ['Runtime truth', 'Live view of provider health, queues, storage, deployment state, and approval pressure.'],
  ['Provider health', 'Route quality, latency, failure state, and fallback options remain visible.'],
  ['Queues', 'Concurrent work is tracked by workload, agent class, and execution stage.'],
  ['Storage', 'Artifacts and memory records are governed as durable operational assets.'],
  ['Approvals', 'Policy clearance and human review are first-class system states.'],
  ['Deployments', 'Production movement is validated, recorded, and reversible by process.'],
]

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--amarkt-dim)]">{children}</p>
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string
  title: string
  body?: string
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-5 text-3xl font-semibold leading-tight text-balance text-white sm:text-4xl lg:text-5xl">{title}</h2>
      {body && <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--amarkt-muted)]">{body}</p>}
    </div>
  )
}

export default function HomePage() {
  return (
    <PublicShell>
      <section className="relative min-h-[calc(100svh-4rem)] overflow-hidden bg-[var(--amarkt-obsidian)]">
        <div className="absolute inset-0">
          <IntelligenceFabric className="h-full w-full" />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(3,5,10,0.95)_0%,rgba(3,5,10,0.62)_34%,rgba(3,5,10,0.2)_70%),linear-gradient(180deg,rgba(3,5,10,0.18)_0%,rgba(3,5,10,0.32)_58%,#03050a_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] max-w-7xl items-end px-5 pb-14 pt-20 lg:px-8 lg:pb-20">
          <div className="max-w-4xl">
            <Eyebrow>AI operations architecture</Eyebrow>
            <h1 className="mt-5 text-5xl font-semibold leading-[1.02] text-balance text-white sm:text-6xl lg:text-7xl">
              Private AI infrastructure for work that reaches production.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--amarkt-soft)] sm:text-lg">
              AmarktAI Network coordinates models, agents, memory, artifacts, approvals, and deployment workflows inside one governed operating layer.
            </p>
          </div>
        </div>
      </section>

      <section className="architecture-band py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeader
            eyebrow="What the platform does"
            title="AmarktAI turns AI work into an operating system, not a collection of disconnected prompts."
            body="The platform receives work, understands context, selects execution paths, coordinates agents, persists outcomes, and protects production with approvals."
          />
          <div className="mt-14 grid gap-px border border-white/[0.08] bg-white/[0.08] md:grid-cols-2 lg:grid-cols-3">
            {platformLayers.map((layer) => (
              <article key={layer.title} className="min-h-[220px] bg-[var(--amarkt-graphite)] p-7">
                <div className="section-line h-px w-16" />
                <h3 className="mt-6 text-xl font-semibold text-white">{layer.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">{layer.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--amarkt-black)] py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
          <SectionHeader
            eyebrow="Studio"
            title="A multimodal execution surface backed by memory, routing, streaming, and artifacts."
            body="Studio is where research, conversation, media generation, transcription, and long-running workflows converge. Every output can become operational context."
          />
          <div className="grid gap-px border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
            {studioCapabilities.map(([title, detail]) => (
              <article key={title} className="bg-[var(--amarkt-graphite)] p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--amarkt-teal)]">{title}</p>
                <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--amarkt-obsidian)] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-0 panel-grid opacity-50" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeader
            eyebrow="Workbench"
            title="The flagship path from prompt to validated production movement."
            body="Workbench treats repository work as a governed pipeline: prompt -> plan -> patch -> checks -> PR -> deploy. Each stage produces evidence."
          />
          <div className="mt-14 overflow-hidden border border-white/[0.1] bg-[rgba(5,7,12,0.7)]">
            <div className="grid gap-px bg-white/[0.08] lg:grid-cols-6">
              {workbenchSteps.map(([title, detail], index) => (
                <article key={title} className="relative min-h-[190px] bg-[var(--amarkt-graphite)] p-6">
                  <p className="font-mono text-[11px] text-[var(--amarkt-dim)]">0{index + 1}</p>
                  <h3 className="mt-6 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--amarkt-muted)]">{detail}</p>
                  <div className="absolute bottom-0 left-0 h-px w-full bg-[linear-gradient(90deg,rgba(100,167,255,0.55),transparent)]" />
                </article>
              ))}
            </div>
            <div className="grid gap-px bg-white/[0.08] lg:grid-cols-[1.2fr_0.8fr]">
              <div className="bg-[#070b12] p-6 font-mono text-[11px] leading-7 text-[var(--amarkt-muted)]">
                <p className="text-[var(--amarkt-soft)]">repo://production/platform</p>
                <p>branch: codex/workbench-change</p>
                <p>patch: scoped file set, reviewable diff</p>
                <p>checks: lint, tests, runtime policy</p>
                <p>release: awaiting approval gate</p>
              </div>
              <div className="bg-[#080d15] p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--amarkt-warm)]">Approval checkpoint</p>
                <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">
                  Production changes remain constrained until review, policy, and validation state agree.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--amarkt-black)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeader
            eyebrow="Apps and agents"
            title="Connected workflows become a coordinated network of application context and assigned agents."
          />
          <div className="mt-14 grid gap-px border border-white/[0.08] bg-white/[0.08] md:grid-cols-2 lg:grid-cols-4">
            {agentSystems.map(([title, detail]) => (
              <article key={title} className="bg-[var(--amarkt-graphite)] p-7">
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="mt-4 text-sm leading-7 text-[var(--amarkt-muted)]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="architecture-band py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:px-8">
          <SectionHeader
            eyebrow="Memory and learning"
            title="Context persists beyond the session and becomes operational advantage."
            body="AmarktAI preserves the work history that matters: artifacts, repository decisions, routing outcomes, session threads, approval records, and workflow results."
          />
          <div className="premium-panel p-7">
            <div className="space-y-5">
              {memoryItems.map((item) => (
                <div key={item} className="flex gap-4 border-b border-white/[0.06] pb-5 last:border-0 last:pb-0">
                  <div className="mt-2 h-1.5 w-1.5 shrink-0 bg-[var(--amarkt-teal)]" />
                  <p className="text-sm leading-7 text-[var(--amarkt-soft)]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--amarkt-obsidian)] py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <SectionHeader
            eyebrow="Operations"
            title="Runtime truth for the systems that execute, store, route, approve, and deploy."
          />
          <div className="mt-14 grid gap-px border border-white/[0.08] bg-white/[0.08] md:grid-cols-2 lg:grid-cols-3">
            {operations.map(([title, detail]) => (
              <article key={title} className="min-h-[190px] bg-[var(--amarkt-graphite)] p-7">
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--amarkt-blue)]">{title}</p>
                <p className="mt-5 text-sm leading-7 text-[var(--amarkt-muted)]">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[var(--amarkt-black)] py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-8">
          <SectionHeader
            eyebrow="AmarktAI Assistant"
            title="The operational AI interface for work that knows the workspace."
            body="AmarktAI Assistant is positioned as the command interface for memory-aware, workspace-aware, and deployment-aware execution. It can reason across context, route work, and expose gate state without hiding the system."
          />
          <div className="premium-panel">
            <div className="border-b border-white/[0.08] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--amarkt-dim)]">
              assistant runtime transcript
            </div>
            <div className="space-y-4 p-6">
              {[
                ['operator', 'Review repository memory and current deployment guard state.'],
                ['assistant', 'Memory context loaded. Two recent patches, one blocked deployment, provider route stable.'],
                ['operator', 'Prepare the next patch and hold at approval.'],
                ['assistant', 'Plan generated. Patch queued. Checks will run before the approval gate opens.'],
              ].map(([role, text]) => (
                <div key={text} className={role === 'operator' ? 'ml-auto max-w-[84%] bg-[#101827] p-4' : 'max-w-[84%] bg-[#07101d] p-4'}>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--amarkt-dim)]">{role}</p>
                  <p className="mt-2 text-sm leading-7 text-[var(--amarkt-soft)]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[var(--amarkt-obsidian)] py-24 lg:py-32">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px section-line" />
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <Eyebrow>Private infrastructure</Eyebrow>
          <h2 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight text-balance text-white lg:text-6xl">
            A serious control plane for organizations that need AI systems to operate with memory, review, and consequence.
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--amarkt-muted)]">
            The product is the architecture: routes, agents, artifacts, memory, operations, and approvals acting as one governed system.
          </p>
        </div>
      </section>
    </PublicShell>
  )
}
