# Live Proof Commands

## Workspace verification used in this cleanup pass

- `git status -sb`
- `npm exec knip -- --no-progress`
- `npm exec ts-prune`
- `npx tsc --noEmit`
- `npm test -- --run`
- `npm run build`
- `git diff --check`
- `git diff --stat`

## Notes

- This repository does not define a `typecheck` script in `package.json`, so `npx tsc --noEmit` is the closest existing equivalent.
- For this Next.js app, use `npm run build` as the TypeScript validity check. Standalone `npx tsc --noEmit` is not authoritative until the `.next/types` generation mismatch is separately fixed.
- Evidence from this cleanup pass: `next build` completes successfully and performs Next's validity/type checks, while standalone `tsc` still resolves a broader Next-managed `.next/types/**/*.ts` set than is actually present on disk in this environment.
- Provider settings tests do not count as full runtime proof unless they execute a real capability route.
- Admin provider-capability proof is single-provider proof only and bypasses canonical orchestration by design.
