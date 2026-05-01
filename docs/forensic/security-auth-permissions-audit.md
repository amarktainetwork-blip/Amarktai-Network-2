# Safety / Auth / Permissions Audit

| Area | Status | Evidence | Blocker | Fix required |
| --- | --- | --- | --- | --- |
| admin login | Partial | `/api/admin/login`, `/admin/login`, middleware | live session not manually verified | browser login test |
| middleware protection | Partial | middleware file exists | route coverage not fully audited | test all admin/API routes unauthenticated |
| dashboard auth | Partial | pages under admin layout | client components rely on APIs | E2E unauth redirect |
| API auth | Partial | many admin routes call `getSession` | need route-by-route coverage | auth test matrix |
| role checks | Missing/Partial | operator only in UI | no clear roles | add admin/operator roles if multi-user |
| provider key encryption | Partial | `crypto-vault`, `integrationConfig` | GitHubConfig stores token separately | migrate GitHub to encrypted vault |
| GitHub token safety | Partial | masked responses, log redaction | two storage paths | single vault + rotation |
| adult permissions | Partial | flags/routes/tests | app-scope leakage not proven | enforce app/global/provider readiness |
| destructive confirmations | Partial | Repo Workbench confirm flags | not global | central approvals for deploy/merge/delete |
| repo path traversal | Stronger | `workspace-security.ts`, tests | live workspace root permissions | add E2E path tests |
| command allowlist | Stronger | `validateCommand`, tests | custom env could be risky | keep false in prod |
| logs secret redaction | Partial | redaction helper | not used by all logs | central log sanitizer |

Verdict: Auth/security base is present but not go-live complete until unauth route scan, role model decision, GitHub vault migration, and adult app-scope gates are done.
