# PUBLIC WEBSITE HARD RESET

## Rejected systems removed
- Removed old public animation and section components:
  - `src/components/public/CommandConstellationScene.tsx`
  - `src/components/public/PublicSection.tsx`
- Replaced prior public homepage sections and related copy on all public routes.
- Retired prior public CTA/hint language referencing restricted access workflows.

## New design language
- Visual baseline: deep ink/graphite shell with muted platinum text and restrained blue-violet accents.
- Layout system: architectural line grids, thin borders, editorial spacing, and low-noise typographic hierarchy.
- Public pages rebuilt from scratch:
  - `/`
  - `/about`
  - `/apps`
  - `/docs`
  - `/contact`
  - `/privacy`
  - `/terms`

## Animation architecture
- Added new integrated full-width animation:
  - `src/components/public/IntelligenceFabric.tsx`
- Intelligence Fabric renders layered command planes and route threads for:
  - input → routing → agent → memory → artifact → approval → deployment
- Includes reduced-motion compliance through `prefers-reduced-motion` branch.

## Public access wording removed
- Removed visible login/admin/dashboard CTAs from all public pages and shell.
- Removed any public copy that teaches or hints secret login access patterns.
- Hidden login trigger behavior remains in code path only (keyboard buffer match and route push).

## Login page cleaned visually only
- Updated `src/app/admin/login/page.tsx` visual style to a restrained premium shell.
- Preserved behavior and routing:
  - Same request endpoint: `/api/admin/login`
  - Same success route: `/admin/dashboard`
  - Same client-side error handling flow

## Dashboard untouched
- No dashboard page structure or backend routing changes were introduced.
- Public rebuild remains isolated to public routes/components and login page visual layer.

## One-source-of-truth proof
- Public implementation uses one shared shell and one shared animation in `src/components/public`:
  - `PublicShell.tsx`
  - `IntelligenceFabric.tsx`
- Removed duplicate/legacy public component paths listed in test audit.
- Test coverage validates the one-source-of-truth file set.

## Remaining gaps
- Legacy global CSS contains broader historical utility styles outside the public shell usage; this reset avoids changing dashboard-adjacent styling dependencies.
- Voice-access route remains a redirect surface and is not used for public access instructions.
