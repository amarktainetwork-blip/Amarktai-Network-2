# Budget / Cost / Queue Audit

| Area | Status | Evidence | Blocker | Fix required |
| --- | --- | --- | --- | --- |
| global budget settings | Partial | `/api/admin/budgets`, AI Engine | enforcement not universal | enforce in brain/media/repo routes |
| per-app budget | Partial | `/api/admin/app-budgets` | live cost tracking incomplete | apply before expensive jobs |
| provider budget | Partial | budget modules | not tied to provider routes everywhere | provider-cost middleware |
| capability budget | Partial | runtime capability concepts | not enforced in Media Studio | require cost estimate + approval |
| model cost estimates | Partial | model registry cost tiers | not real GenX live pricing | load `/api/v1/account/pricing` if GenX supports |
| video cost estimates | Missing/Partial | Media Studio warns expensive | no actual estimate/confirm | show price before submit |
| generation queue | Partial | `job-queue.ts`, job routes | heavy jobs not universal async | central async queue |
| concurrency limits | Missing/Partial | no clear global limiter | VPS overload risk | queue concurrency config |
| retry limits | Partial | scattered | not standardized | job policy per capability |
| cancellation | Partial | GenX cancel route maybe, UI absent | no universal cancel | add cancel endpoint/button |
| long-running jobs | Partial | video/music/repo jobs in parts | Media Studio video/music disabled | async polling everywhere |
| VPS overload protection | Missing | no clear CPU/RAM gate before jobs | media can overload if direct | preflight capacity checks |

Answer: This cannot safely run open-ended media generation at scale yet. Heavy jobs must be async, budgeted, cancellable, and concurrency-limited before go-live.
