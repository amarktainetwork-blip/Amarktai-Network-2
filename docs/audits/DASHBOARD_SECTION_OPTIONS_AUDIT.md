# Dashboard Section Options Audit

## Purpose

The dashboard is still not acceptable as an operator console. Current issues include marketing-style overview copy, repeated actions, scattered readiness/health concepts, duplicate mental models, old naming, and too many pages that feel like disconnected feature demos instead of one AmarktAI Network control room.

This audit does **not** implement dashboard code. It defines what must stay, what must leave, and three possible content/layout options for each canonical section. The next implementation PR should choose one option per section and delete/hide everything outside the chosen direction.

## Current Problems To Fix

- Overview/Command Center still reads like a marketing landing page in places.
- Actions are repeated across multiple pages instead of one approval queue.
- Health/readiness/proof concepts are still scattered instead of fully living in Diagnostics.
- Repo Workbench still has too many visible mechanics and not enough prompt-first magic.
- The assistant naming must be AmarktAI Assistant everywhere visible. AmarktAI Assistant/AmarktAI Assistant must not appear in user-facing UI.
- Settings, providers, tools, health and readiness need one source of truth.
- Dashboard has too many feature stubs and not enough operational hierarchy.
- Some old pages should be hidden, redirected, or deleted after mapping.

## Canonical Dashboard Navigation

Use exactly these visible sections:

1. Command Center
2. AmarktAI Assistant
3. Apps
4. Agents
5. Repo Workbench
6. Research
7. Creative Studio
8. Memory
9. Actions
10. Diagnostics
11. Settings

Everything else should be deleted, hidden, or redirected into one of these 11 sections.

## Dashboard Design Rules

- Dashboard is not marketing. It is an operator console.
- Every page must have one job.
- Use compact information hierarchy, not a wall of cards.
- Each page should have:
  - title
  - one-line purpose
  - status badge
  - primary action
  - compact metrics strip
  - main work area
  - right-side context/status panel where useful
- Only these statuses are allowed:
  - Working
  - Needs key
  - Backend pending
  - Ready to wire
  - Blocked
  - Post-launch
- Nothing is Working unless an endpoint and live proof exist.
- No public/provider/marketing copy inside dashboard pages.
- No visible AmarktAI Assistant/AmarktAI Assistant naming.
- No overlapping floating assistant by default.
- Settings is the only configuration surface.
- Diagnostics is the only health/readiness/proof surface.

---

# Section Options

## 1. Command Center

### What it must do

The Command Center is the dashboard home. It should answer:

- Is the network healthy?
- What needs attention?
- Which apps/agents are active?
- What is waiting for approval?
- What is the next best action?

### Must remove

- Marketing hero language.
- Repeated module cards that duplicate every other page.
- Go-live/internal build wording.
- Any provider catalogue copy.

### Option A — Executive Control Room

Best for: fastest clarity.

Layout:

- Top strip: Network Health, Apps, Agents, Pending Approvals.
- Main left: AmarktAI Assistant briefing.
- Main right: Critical blockers and approvals.
- Bottom: activity feed.

Pros:

- Cleanest dashboard home.
- Low clutter.
- Easy to understand at a glance.

Cons:

- Less visual wow.
- Depends on good activity/briefing data later.

### Option B — Operations Cockpit

Best for: power users.

Layout:

- Left column: status timeline and incidents.
- Center: network map of apps/agents/jobs.
- Right column: approvals, blockers, VPS warnings.

Pros:

- Feels like a real control center.
- Good for monitoring many apps.

Cons:

- More complex to build well.
- Can become cluttered if not strict.

### Option C — Assistant-Led Briefing

Best for: AmarktAI Assistant-first experience.

Layout:

- Large assistant briefing at top.
- Under it: suggested actions.
- Below: compact network metrics and activity feed.

Pros:

- Makes AmarktAI Assistant feel central.
- Natural for admin workflow.

Cons:

- Needs working assistant/backend to shine.
- If not wired, it may feel empty.

### Recommendation

Use Option A now. Add Option C elements after assistant backend is live.

---

## 2. AmarktAI Assistant

### What it must do

Main operator conversation page. It must not overlap dashboard content.

### Must include

- Conversation panel.
- Selected app context.
- Selected agent/model route.
- Memory preview.
- Pending actions preview.
- Voice settings preview.
- Status panel.

### Must remove

- Floating overlap by default.
- AmarktAI Assistant/AmarktAI Assistant visible copy.
- Fake online/working states.

### Option A — Chat + Context Split

Layout:

- Left 65%: chat.
- Right 35%: context, memory, route, actions.

Pros:

- Clean and familiar.
- Easy to wire incrementally.

Cons:

- Less advanced for multi-agent tasks.

### Option B — Mission Console

Layout:

- Prompt at top.
- Middle: active plan/steps.
- Right: selected app/agent/model.
- Bottom: logs and memory.

Pros:

- Better for task execution.
- Similar to agentic workbench.

Cons:

- More complex before assistant actions work.

### Option C — App-Aware Assistant

Layout:

- App selector first.
- Chat attached to selected app.
- Context/memory/actions scoped to the app.

Pros:

- Best long-term for multi-app ecosystem.

Cons:

- Needs app profiles wired.

### Recommendation

Use Option A now. Build toward Option C after Apps and Memory are wired.

---

## 3. Apps

### What it must do

Every app connected to AmarktAI Network lives here.

### Must include

- App profile.
- App type/niche.
- Linked repo.
- Linked website URL.
- Assigned agents.
- Memory policy.
- Adult policy.
- Tool/provider permissions.
- Deployment/health status.

### Option A — App Cards + Detail Drawer

Layout:

- Grid of app cards.
- Click opens right drawer with profile, agents, memory, repo, policy.

Pros:

- Clean overview.
- Good for 5–20 apps.

Cons:

- Drawer can become cramped.

### Option B — App Table + Detail Page

Layout:

- Table list.
- Each app opens detail page.

Pros:

- Best for scaling.
- Easier to manage serious operational data.

Cons:

- Less visually exciting.

### Option C — App Map

Layout:

- Visual network map of apps with agents/tools.
- Detail panel on selection.

Pros:

- Strong visual identity.

Cons:

- Harder to make useful quickly.

### Recommendation

Use Option A for frontend foundation. Add detail pages later if app count grows.

---

## 4. Agents

### What it must do

Central registry for specialist agents.

### Must include

- AmarktAI Assistant Operator.
- Repo Builder.
- Repo Auditor.
- Frontend Designer.
- Backend Wiring Agent.
- Researcher Agent.
- App Discovery Agent.
- Marketing Agent.
- Scraper Agent.
- Media Agent.
- Voice Agent.
- Memory / Emotion Agent.
- Adult-App Agent.
- Diagnostics Agent.
- Deployment Agent.
- Crypto Agent.

Each agent shows:

- assigned app
- role
- provider/model route
- allowed tools
- memory access
- adult access
- PR/merge/deploy permissions
- approval requirement
- status
- logs placeholder

### Option A — Agent Registry Table

Pros:

- Best for admin clarity.
- Easy to filter by app/status.

Cons:

- Less visual.

### Option B — Agent Cards By Category

Categories:

- Core
- Code
- Research
- Creative
- Operations
- App-specific

Pros:

- More understandable for setup.

Cons:

- Can become card overload.

### Option C — Agent Builder Workflow

Layout:

- Choose template.
- Assign app.
- Choose model/tools/memory/permissions.

Pros:

- Best for creating agents.

Cons:

- Needs backend wiring to be meaningful.

### Recommendation

Use Option B now with compact category groups. Add Option C as create-agent flow later.

---

## 5. Repo Workbench

### What it must do

Turn a plain prompt into repo work, plan, diff, checks, and PR.

### User correction

Remove mandatory “Choose task.” The AI must read the prompt and decide task type/agent/model behind the scenes. Admin can optionally override agent/model, but should not have to.

### Must include

- Add repo.
- Pull/update repo.
- Optional agent/model selector.
- Main prompt box: “Tell AmarktAI Assistant what to do.”
- Auto classification: task, agent, model, risk.
- Plan.
- Diff.
- Checks.
- PR.
- Website URL preview mode.
- Repo status, branch status, checks status.

### Must remove

- Mandatory task picker.
- GitHub PAT input.
- Main file explorer.
- Confusing legacy panels.
- Active merge/deploy if not approval-gated and proofed.

### Option A — Prompt-First Workbench

Layout:

- Repo selector/add repo.
- Optional agent/model row.
- Large prompt box.
- Generated plan and diff below.

Pros:

- Closest to how admin wants to work.
- Simple and powerful.

Cons:

- Needs good auto-classification later.

### Option B — Wizard Workbench

Layout:

- Repo → prompt → plan → diff → checks → PR.

Pros:

- Safer for first wiring.

Cons:

- Feels less magical.

### Option C — Split Preview Workbench

Layout:

- Left: prompt/plan.
- Center: diff/checks.
- Right: website preview/repo status.

Pros:

- Best for frontend work and visual review.

Cons:

- More layout complexity.

### Recommendation

Use Option C, but keep the prompt-first flow of Option A. Website preview should be optional and graceful if iframe is blocked.

---

## 6. Research

### What it must do

Researcher Agent, app discovery, competitor research, provider/tool discovery.

### Must include

- Firecrawl primary.
- Backup crawler placeholder.
- Manual URL input.
- Manual notes/source upload placeholder.
- Screenshot/manual review placeholder.
- Scraped page storage.
- Research jobs.
- App opportunity alerts.
- Competitor reports.
- Create App Plan.
- Send to Repo Workbench.

### Must not do

- Rely only on Firecrawl.
- Use “clone.” Use “improved alternative” or “differentiated product plan.”

### Option A — Research Inbox

Pros:

- Good for alerts/opportunities.

### Option B — Research Workbench

Pros:

- Best for entering URLs, notes, and jobs.

### Option C — Opportunity Pipeline

Pros:

- Best for app discovery and product ideas.

### Recommendation

Use combined B + C: URL research workbench at top, opportunity pipeline below.

---

## 7. Creative Studio

### What it must do

One place for media and multi-AI creative workflows.

### Must include

- Image.
- Video.
- Voice.
- Music.
- Talking Avatar.
- Music Video.
- Asset Mixer.

### Asset Mixer must include

- text → image → video
- lyrics → voice/music → video
- image → avatar → voice
- research → script → media pack
- app idea → brand assets → landing copy
- multiple model comparison
- multi-AI experiment board

### Option A — Tabbed Studio

Pros:

- Familiar and clean.

### Option B — Workflow Cards

Pros:

- Better for “combine multiple AIs” concept.

### Option C — Canvas/Timeline

Pros:

- Best long-term for music videos and asset mixing.

### Recommendation

Use Option B now. Add canvas/timeline later.

---

## 8. Memory

### What it must do

Make self-learning visible and controlled.

### Must include

- Global memory.
- Admin memory.
- App memory.
- User memory.
- Emotional profile.
- Preferences.
- Summaries.
- Consent/privacy controls.
- Local VPS storage status.
- Vector/retrieval placeholder.
- Export/backup placeholder.

### Storage direction

VPS/local-first for now. No external memory provider required to start.

### Option A — Memory Vault

Pros:

- Clear and safe.

### Option B — Learning Timeline

Pros:

- Shows how the network learns over time.

### Option C — App/User Matrix

Pros:

- Best for app-scoped memory management.

### Recommendation

Use Option A + compact timeline. Add matrix later.

---

## 9. Actions

### What it must do

Single approval queue for all powerful operations.

### Must include

- PR approval.
- Merge approval.
- Deploy approval.
- Adult access changes.
- Spend/provider cost approval.
- Destructive action approval.
- Marketing send approval.
- VPS/service restart approval.
- Audit logs.

### Option A — Approval Queue

Pros:

- Cleanest and safest.

### Option B — Risk Board

Pros:

- Organizes by risk level.

### Option C — Action Timeline

Pros:

- Best audit trail.

### Recommendation

Use Option A with risk badges and timeline below.

---

## 10. Diagnostics

### What it must do

Only place for health/readiness/proof.

### Must include

- Live readiness.
- Static asset proof.
- Provider status.
- GitHub status.
- Webdock/VPS status.
- Storage status.
- Database/queue/jobs.
- App health.
- Blockers.
- Recent errors.
- Upgrade recommendation.

### Must remove

- Separate visible System Health.
- Separate visible Live Readiness.
- Repeated health cards elsewhere.

### Option A — Health Summary + Detail Panels

Pros:

- Cleanest first version.

### Option B — Incident Console

Pros:

- Best for debugging failures.

### Option C — Capacity Dashboard

Pros:

- Best for Webdock/VPS scaling.

### Recommendation

Use Option A now. Add B/C panels inside Diagnostics later.

---

## 11. Settings

### What it must do

Only configuration surface.

### Must include tabs

- AI Stack
- Tools
- Scraping & Storage
- Memory
- Voice & Media
- Adult & Safety
- Admin & Security
- Diagnostics

### Visible providers only

- GenX
- Qwen / DashScope
- MiniMax / Mimo
- Gemini
- Groq
- Together AI
- xAI / Grok
- Hugging Face
- GitHub
- Webdock
- Firecrawl
- Storage

### Must remove/hide

- OpenAI Direct
- Anthropic
- Cohere
- Mistral
- Suno
- Udio
- Perplexity
- Tavily
- Jina
- RunPod
- fal.ai
- Fireworks
- Cerebras
- AssemblyAI
- GitHub PAT duplicate surfaces
- provider catalogue pages

### Option A — Settings Tabs

Pros:

- Best familiar admin pattern.

### Option B — Setup Checklist

Pros:

- Best for first go-live.

### Option C — Split Config + Diagnostics

Pros:

- Keeps configuration and status separate.

### Recommendation

Use Option A with a setup checklist at top.

---

# Delete / Hide / Redirect Candidates

The implementation PR must audit actual files before deleting, but conceptually:

## Delete or hide from nav

- old overview/marketing dashboard page
- separate System Health nav
- separate Live Readiness nav
- old AI Engine hub as a primary destination
- provider catalogue pages
- old model catalogue pages
- build studio/labs if not part of Creative Studio
- standalone music/video/voice pages if duplicated by Creative Studio
- duplicate GitHub/PAT setup pages

## Redirect aliases

- /admin/dashboard → /admin/dashboard/command-center
- /admin/dashboard/AmarktAI Assistant → /admin/dashboard/amarktai-assistant
- /admin/dashboard/system-health → /admin/dashboard/diagnostics
- /admin/dashboard/live-readiness → /admin/dashboard/diagnostics
- /admin/dashboard/media-studio → /admin/dashboard/creative-studio
- /admin/dashboard/memory-emotions → /admin/dashboard/memory

# Recommended Rebuild Choice

Use this combined approach for the next code PR:

- Command Center: Option A
- AmarktAI Assistant: Option A
- Apps: Option A
- Agents: Option B
- Repo Workbench: Option C with prompt-first flow
- Research: B + C
- Creative Studio: Option B
- Memory: A + timeline
- Actions: A + risk badges
- Diagnostics: A
- Settings: A + setup checklist

# Implementation PR Scope After Approval

The next PR should be dashboard code only and should:

1. Replace visible nav with the 11 canonical sections.
2. Remove marketing copy from Command Center.
3. Remove visible AmarktAI Assistant/AmarktAI Assistant copy.
4. Simplify Repo Workbench into prompt-first flow.
5. Add/clean frontend pages for Agents, Memory, Actions, Diagnostics, Creative Studio.
6. Hide/redirect old pages.
7. Keep all unfinished modules truthful.
8. Add tests to enforce the new structure.

# Verification for Next Implementation PR

Run:

```bash
npm run build
npm run lint
npx vitest run \
  src/lib/__tests__/dashboard-golive.test.ts \
  src/lib/__tests__/repo-workbench-production.test.ts \
  src/lib/__tests__/one-source-of-truth.test.ts \
  src/lib/__tests__/public-website-foundation.test.ts
```

Add:

```bash
src/lib/__tests__/dashboard-section-options.test.ts
```

or equivalent tests to enforce:

- exactly 11 nav sections
- no visible AmarktAI Assistant/AmarktAI Assistant copy in dashboard/public UI
- Repo Workbench has no mandatory Choose Task step
- Diagnostics is the only visible health/readiness/proof section
- Settings is the only configuration surface
- approved provider stack only
