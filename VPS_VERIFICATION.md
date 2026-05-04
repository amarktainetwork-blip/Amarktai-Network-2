# VPS Branch Verification

## Correct Branch

```
copilot/go-live-audit-clean-slate-readiness
```

> ⚠️ **Do NOT use** `origin/copilot/copilotgo-live-audit-clean-slate-readiness`  
> That branch has an incorrect name and will fail VPS checkout.

## VPS Checkout Command

```bash
git fetch origin
git checkout -B copilot/go-live-audit-clean-slate-readiness origin/copilot/go-live-audit-clean-slate-readiness
git rev-parse --short HEAD
ls -la scripts/final_go_live_audit.sh
```

## Expected Output

```
65fc939
-rwxrwxr-x 1 ... scripts/final_go_live_audit.sh
```

## Blocker Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | `scripts/final_go_live_audit.sh` exists | ✅ |
| 2 | `scripts/final_go_live_audit.sh` is executable (`-rwxrwxr-x`) | ✅ |
| 3 | `src/app/admin/dashboard/repo-workbench/page.tsx` contains `/admin/dashboard/settings` | ✅ |
| 4 | `src/lib/__tests__/go-live-clean-slate-audit.test.ts` exists | ✅ |
| 5 | Old unsupported providers removed from Settings UI | ✅ |
| 6 | `/admin/dashboard/operations` redirects to `/admin/dashboard/actions` | ✅ |
| 7 | No visible Aiva/AIVA copy in user-facing UI | ✅ |
| 8 | Adult policy is app-level and clean-slate gated | ✅ |
| 9 | Settings clean-slate status does not pretend keys are configured | ✅ |

## Build / Lint / Test Results

### `npm run lint`
Passes — warnings only (no errors).

### `npm run build`
Build succeeded.

### `npx vitest run` (targeted suite)

```
✓ src/lib/__tests__/go-live-clean-slate-audit.test.ts     (111 tests)
✓ src/lib/__tests__/dashboard-golive.test.ts               (66 tests)
✓ src/lib/__tests__/one-source-of-truth.test.ts            (23 tests)
✓ src/lib/__tests__/dashboard-foundation-complete.test.ts  (61 tests)
✓ src/lib/__tests__/public-website-foundation.test.ts      (36 tests)
✓ src/lib/__tests__/repo-workbench-production.test.ts       (8 tests)

Test Files  6 passed (6)
     Tests  305 passed (305)
  Duration  620ms
```
# Branch: copilot/go-live-audit-clean-slate-readiness

