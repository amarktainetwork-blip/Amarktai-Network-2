# PUBLIC WEBSITE — 3D PRODUCT SHOWCASE REBUILD

**Audit type:** Complete public website rebuild  
**Date:** May 2026  
**Status:** Production-ready

---

## What was replaced

| Component / Page | Previous state | Replacement |
|---|---|---|
| `IntelligenceFabric.tsx` | 2D layered canvas with flat node graph | Full 3D canvas with perspective projection, orbiting product modules, command core, data streams |
| `app/page.tsx` | 7 basic text sections, small boxed animation | 9 cinematic product sections, full-bleed 3D hero animation |
| `app/about/page.tsx` | 3 plain principle cards | Hero + design principles + product pillars + mission statement |
| `app/apps/page.tsx` | Simple table of apps/agents | Rich ecosystem cards with agent tag chips + shared infrastructure section |
| `app/docs/page.tsx` | 6-item grid of summaries | System blueprint with expanded detail + scope caveats |
| `app/contact/page.tsx` | Basic form | Institutional inquiry form with sidebar context panel (form behavior unchanged) |
| `app/admin/login/page.tsx` | Standard auth form | Visual polish — gradient accents, tighter spacing, premium typography (zero behavior change) |

---

## 3D animation approach

**File:** `src/components/public/IntelligenceFabric.tsx`  
**Technology:** HTML5 Canvas + custom 3D perspective projection math (no Three.js dependency)

### Architecture

```
Perspective projection:  project(x, y, z, cx, cy, fov)
  → scale = fov / (fov + z)
  → screen x = cx + world_x * scale
  → screen y = cy + world_y * scale
```

### Visual layers (render order: back → front)

1. **Deep space background** — radial gradient from `#080c1c` → `#020407`
2. **Ambient core glow** — radial blue/indigo halo behind the command core
3. **Orbit ellipses** — two tilted orbit rings drawn with 3D projection (tilt angles: 0.30 and 0.18 rad)
4. **Back-facing connection lines** — gradient lines from core to back-half modules
5. **Data stream particles** (back) — particles travelling along connection paths (suppressed under `prefers-reduced-motion`)
6. **Back-facing product module cards** — depth-scaled 2D cards with accent border and labels
7. **Central command core** — pulsing halo, outer ring, rotating tick marks, counter-rotating hexagon, center dot, label
8. **Front connection lines + particles + front module cards**
9. **Pipeline telemetry strip** — bottom bar showing `INPUT → ROUTING → AGENT → MEMORY → ARTIFACT → APPROVAL → DEPLOYMENT` with active-stage highlight
10. **Edge vignette** — radial dark overlay for cinematic feel

### Product modules on orbit rings

| Module | Ring | Orbit direction |
|---|---|---|
| Studio | Outer (r = 1.0) | CW |
| Workbench | Inner (r = 0.8) | CCW |
| Apps & Agents | Outer | CW |
| Memory | Inner | CCW |
| Operations | Outer | CW |
| Settings | Inner | CCW |

### Colour palette

- Background: obsidian (`#04060e`–`#020407`)
- Orbit rings: deep violet `rgba(139,92,246,0.15)` / electric blue `rgba(96,165,250,0.14)`
- Core accent: electric blue `rgba(96,165,250,…)` pulsing
- Module cards: per-module accent with warm graphite fill
- Data particles: white/platinum cores, colored halos
- Telemetry strip: muted platinum with electric blue active state

---

## Product showcase sections (homepage)

| # | Section | Visual approach |
|---|---|---|
| 1 | **Cinematic hero** | Full-height 3D animation, headline pinned to bottom-left, gradient overlay for legibility |
| 2 | **Product cockpit** | 6-card grid with gradient top accent lines, hover state, per-module color |
| 3 | **Workbench showcase** | 6-step pipeline grid with step numbers, arrow connectors, grid overlay background |
| 4 | **Studio showcase** | Split layout: copy left, capability grid right |
| 5 | **Agent orchestration** | 5-card grid with colored indicator dots, glow accent |
| 6 | **Memory & learning** | Split: memory node grid left, doctrine statements right |
| 7 | **Runtime control** | 6-metric grid with colored accent bars |
| 8 | **Amarktai Assistant** | Split: copy + trait list left, simulated interface panel right |
| 9 | **Closing** | Full-width statement, no CTA, gradient border divider |

---

## Access wording cleanup

### Removed from all public pages and shell
- "Sign in" / "Sign up" / "Request access" / "Get access"
- Any reference to `/admin/login` or `/admin/dashboard` in visible copy
- "Type login" / keyboard hints / "secret command" text
- "Restricted panel" / "Open secure login" copy

### Preserved (code-only)
- Hidden keyboard trigger in `PublicShell.tsx`:
  ```ts
  buf.current = (buf.current + e.key).toLowerCase().slice(-7)
  if (buf.current.includes('login')) {
    router.push('/admin/login')
  }
  ```
  This is **code-only** — no visible UI element, no text hint, no tooltip.

---

## One-source-of-truth cleanup

`src/components/public/` contains exactly:
- `IntelligenceFabric.tsx` — 3D animation system
- `PublicShell.tsx` — nav/footer shell with hidden login trigger

Previously removed components (confirmed absent):
- `CommandConstellationScene.tsx`
- `PublicSection.tsx`
- `SuperbrainScene.tsx`
- `EcosystemNetwork.tsx`
- `LivingCore.tsx`
- `NetworkPulseBackground.tsx`

---

## Mobile and performance notes

| Concern | Mitigation |
|---|---|
| High pixel density | `devicePixelRatio` capped at `2` to prevent over-rendering |
| Motion sensitivity | `prefers-reduced-motion` check suppresses all particle streams and freezes rotation |
| Mobile complexity | `isMobile` flag (< 640px) removes pipeline telemetry strip and reduces module card detail |
| Tab backgrounding | `visibilitychange` listener resets `last` timestamp to prevent frame-skip runaway |
| Delta time | `dt` capped at `50ms` (Math.min) — prevents physics jumps after tab switch |
| Responsive canvas | `ResizeObserver` re-calculates canvas dimensions and DPR on every resize |
| Cleanup | `cancelAnimationFrame`, `ro.disconnect()`, `removeEventListener` all called on unmount |

---

## Test coverage

New test file: `src/lib/__tests__/public-website-3d-product-showcase.test.ts`

Covers:
- 3D animation component existence and architecture
- Prefers-reduced-motion and mobile safeguards
- All six product modules present in animation
- All seven pipeline telemetry stages present
- Nine homepage sections present
- No public login/access hints
- No retired branding (Aiva, Superbrain, GenX)
- Hidden login trigger preserved without public hint
- One-source-of-truth: exactly two files in `components/public/`
- No stale animation components
- Dashboard files exist and are isolated
- Dashboard root still exports `StudioPage`
- Audit documentation file exists

---

## Remaining gaps

| Item | Status |
|---|---|
| Three.js / React Three Fiber | Not added (no dependency available) — CSS+Canvas 3D used instead. Could be upgraded if R3F is added to project. |
| Login page visual animation | Static background only — no animated element on login page (login page is not public). |
| Privacy / Terms pages | Updated layout style matches new design language but no new content sections added. |
| Real-time provider status on public site | Not shown — Operations telemetry is internal-only per scope rules. |
| CMS integration | Copy is hardcoded in page files — no headless CMS connected. |

---

*This document is part of the public website rebuild audit trail.*
