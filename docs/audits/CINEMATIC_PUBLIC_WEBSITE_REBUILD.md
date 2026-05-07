# CINEMATIC PUBLIC WEBSITE REBUILD

**Branch:** `copilot/rebuild-public-website-experience`
**Scope:** Public website only — dashboard, APIs, auth, and backend untouched.

---

## Old Public Code Removed

| File | Status |
|---|---|
| `src/components/public/SuperbrainScene.tsx` | ✅ Deleted |
| All "superbrain" copy on homepage | ✅ Removed |
| All "superbrain" copy on about/contact pages | ✅ Removed |
| Old isolated boxed canvas animation | ✅ Replaced |
| Old homepage hero grid layout | ✅ Replaced |
| `components/layout/Header.tsx` | ✅ Already removed (verified) |
| `components/layout/Footer.tsx` | ✅ Already removed (verified) |
| `components/EcosystemNetwork.tsx` | ✅ Already removed (verified) |
| `components/LivingCore.tsx` | ✅ Already removed (verified) |
| `app/about-amarktai-network/page.tsx` | ✅ Already removed (verified) |

---

## New Animation Systems

### CommandConstellationScene (`src/components/public/CommandConstellationScene.tsx`)

Replaces `SuperbrainScene`. Key improvements:

- **9 command nodes** orbiting the central nucleus:
  Studio, Workbench, Agents, Memory, Operations, Media, Deployments, Providers, Repositories
- **Bidirectional pulses** — signals flow into the core (inbound) and outward (results/deployments)
- **Full-viewport hero mode** — canvas fills the entire hero section; no boxed isolation
- **Ambient/section mode** — reduced-opacity background for inner pages
- **Dashed orbital ring tracks** — communicates active orbital paths
- **Glass-effect command nucleus** — layered radial gradients, inner highlight, breathe animation
- **Node inner highlights** — glass sphere effect on each orbital node
- **DPR-aware sizing** — `Math.min(devicePixelRatio, 2)` prevents oversized canvas on high-DPI displays
- **ResizeObserver** — always fills parent without clipping or overflow
- **Reduced motion** — all animations pause; static diagram shown instead
- **No memory leaks** — `cancelAnimationFrame` + `ro.disconnect()` in cleanup

---

## Page Structure Changes

### Homepage (`/`)
**Old:** Two-column layout with boxed animation, "Living Superbrain" heading, "self-learning superbrain" headline.

**New:** 9-section cinematic structure:
1. **Hero** — full-viewport CommandConstellationScene background, cinematic headline
2. **Command Layer** — 6 orchestration signal cards (routing, providers, approvals, artifacts, memory, logging)
3. **Studio** — multimodal capabilities grid
4. **Workbench** — pipeline: Prompt → Plan → Patch → Checks → PR → Deploy
5. **Apps & Agents** — App Mesh orchestration
6. **Memory & Learning** — compound operational memory
7. **Operations & Runtime** — provider health, deployment status, approvals, storage
8. **Amarktai Assistant** — workspace/memory/action-aware operator interface
9. **Command Constellation** — system surface cards (all 6 pillars)

### About (`/about`)
- Removed "superbrain" references
- Added cinematic hero with `CommandConstellationScene` ambient background
- Restructured: Mission, Operator Model, Trust Model pillars + Operating Philosophy grid

### Apps (`/apps`)
- Removed "superbrain" references
- Rebuilt with **App Mesh** orchestration concept
- 6 mesh capability cards + 8 specialist agent type items

### Contact (`/contact`)
- Removed "superbrain" from headline
- Added `CommandConstellationScene` ambient hero background
- Access model criteria grid (4 items)

### Docs (`/docs`)
- Removed "superbrain" references
- System architecture cards + execution flow step-by-step sequence

### Privacy & Terms
- Already clean — no superbrain references

---

## Hidden Login Preservation

The hidden login behavior in `PublicShell.tsx` is **unchanged**:
- User types "login" anywhere on the page (not in an input/textarea)
- Restricted panel slides in from bottom-right
- Panel contains link to `/admin/login`
- No public login button exists on any public page
- No `/admin/dashboard` link exists on any public page

---

## One-Source-of-Truth Cleanup

- There is exactly ONE public shell: `PublicShell.tsx`
- There is exactly ONE animation scene: `CommandConstellationScene.tsx`
- There is exactly ONE layout provider: `PublicSection.tsx` (`SectionWrap`, `SectionInner`, `SurfaceCard`)
- No duplicate landing components remain
- No dead CSS added

---

## Mobile Behavior

- Hero uses `min-h-[92vh]` — prevents clipping on mobile viewports
- Canvas fills parent via `h-full w-full` — no fixed pixel dimensions
- ResizeObserver ensures correct sizing on viewport resize
- `overflow-hidden` on hero section prevents horizontal scroll
- Workbench pipeline wraps with `flex-wrap` on small screens
- All grid layouts use `sm:` breakpoints — stack to single column on mobile
- Reduced motion: `@media (prefers-reduced-motion: reduce)` in `globals.css` + in-canvas check

---

## Remaining Gaps

- Pages (`/privacy`, `/terms`) have minimal visual treatment — functional but not cinematic
- No Framer Motion used (Canvas animation is sufficient and more performant)
- Full-page docs system (navigation, search, versioned content) is out of scope for this PR
- Admin dashboard pages are intentionally untouched per spec

---

## Test Coverage

`src/lib/__tests__/public-website-rebuild.test.ts` — 9 tests:

1. ✅ All public pages use `PublicShell`
2. ✅ Homepage uses `CommandConstellationScene` and has Command Layer sections
3. ✅ Homepage contains no "superbrain" / "Superbrain" wording
4. ✅ Hidden login behavior preserved (`includes('login')`, `/admin/login`, `Restricted panel`)
5. ✅ No public auth/dashboard CTAs on any public page
6. ✅ No retired branding (`Aiva`, `GenX`, `Powered by GenX`, `superbrain`) in any public source
7. ✅ `SuperbrainScene.tsx` deleted, `CommandConstellationScene.tsx` exists
8. ✅ Old components confirmed removed
9. ✅ Dashboard routes untouched and separate from public implementation
