# Adult Mode Go-Live Audit

Adult code exists in routes/tests/catalog, but user-facing media workflow is incomplete. Specialist providers appear to be HuggingFace/Together/xAI-style routes; adult must not silently route to general safe models.

| Requirement | Status | Evidence | Blocker | Fix required |
| --- | --- | --- | --- | --- |
| Global adult flag | Partial | `/api/admin/global-adult-mode`, Settings adult test route exist | Live admin gating not verified | Add single status endpoint consumed by Settings and Media Studio |
| App-level adult flag | Partial | app safety/profile routes exist | Not proven to gate media route per app | Enforce appSlug permission in adult routes |
| Settings Adult Mode UI | Partial | Settings calls `/api/admin/settings/test-adult` | Provider readiness not tied to Media Studio tab | Show READY/BLOCKED/UNAVAILABLE from same route |
| Media Studio Adult tab | Missing | `TabId` lacks `adult` | No user flow | Add tab gated by global + app + provider test |
| Adult provider test | Partial | test route exists | Live model generation not verified | Run real low-cost provider probe before READY |
| Adult image route | Partial | `/api/brain/adult-image`, `/api/brain/suggestive-image` exist | E2E artifact/job not verified | Add job/artifact test |
| Adult text route | Partial | `/api/brain/adult-text` tests exist | UI/conversation flow not verified | Wire explicit adult conversation mode |
| Suggestive video routes | Partial | `/api/brain/suggestive-video`, `/suggestive-video-gen` exist | Real video provider not proven | Add async job/provider test |
| Safety exclusions | Partial | `guardrails.ts`, adult tests cover some degrading/illegal prompts | Real-person deepfake and app-scope leakage need E2E tests | Expand moderation tests and route enforcement |
| Provider routing | Partial | adult tests assert specialist route behavior | GenX/direct fallback separation must be runtime-enforced | Log provider and refuse unsafe fallback |
| Artifact logging | Partial | Artifact system exists | Adult outputs not proven persisted | Require artifact on every adult output |

## Mandatory safety checks

| Safety rule | Status | Blocker |
| --- | --- | --- |
| minors blocked | Partial | tests needed against all adult endpoints |
| age ambiguous blocked | Partial | route-level checks not fully evidenced |
| non-consensual blocked | Partial | tests exist for degrading/non-consensual themes but need E2E |
| explicit sex acts blocked where policy requires | Partial | must be enforced in moderation and UI copy |
| real-person sexual deepfakes blocked | Missing/unknown | no clear dedicated check found |
| illegal content blocked | Partial | guardrails present, needs endpoint coverage |
| adult mode cannot leak to non-adult apps | Partial | app-level gating not proven |
| adult provider specialist only | Partial | adult text tests cover Together/HF, media E2E not proven |

Verdict: FAIL for go-live. Keep adult tab hidden until provider tests and app-scope gates pass.
