# Final Go-Live Dashboard Implementation

## Studio Final Workflow

Studio is now the main command workspace. The default layout follows the final rule:

- left: mode selection, command composer, upload/media controls, primary run button, active job state, recent artifacts, advanced route controls
- right: live result workspace, previews, transcript/research/chat output, job timeline/status, artifact preview, next actions, advanced raw details

The public website was not changed.

## Workbench Final Workflow

Workbench remains in place at `/admin/dashboard/workbench` and keeps the real backend workflow:

1. Select repo
2. Select/create branch
3. Select Auto or governance-approved coding/reasoning model
4. Enter prompt
5. Start task
6. Review readable plan sections
7. Review diff and files
8. Approve changes
9. Run checks
10. Commit/push
11. Create PR
12. Guarded merge/deploy

The main surface now emphasizes one primary next action. Raw JSON/log output is moved behind Advanced details.

## Music, Voice, And Adult Implementation

Music uses governance capabilities:

- `music_generation`
- `song_generation`
- `lyrics_generation`
- `instrumental_music`

GenX Lyria models are visible in the Studio music copy:

- `lyria-3-clip-preview`
- `lyria-3-pro-preview`

Vocals/full song generation is displayed as: `Not verified - requires live provider test.`

Voice/TTS preserves provider/model/voice selection and keeps MiniMax/Mimo specialist status visible. STT keeps upload, transcript output, artifact save, and provider/model visibility.

Adult text and adult image remain policy-gated. Adult video and adult voice are exposed as modes, but they show exact governance blockers until route, provider policy, safeguards, polling/playback, artifact handling, and live tests exist.

## Provider Ownership

The dashboard continues to consume `src/lib/provider-capability-governance.ts`.

No dashboard route bypasses governance for manual provider/model selection. Workbench consumes coding/reasoning-capable models only.

## Governance Behavior

Advanced governance remains available, but no longer dominates the main dashboard:

- Studio: Advanced route details
- Workbench: Advanced details
- Settings: Advanced capability matrix
- Operations: Advanced governance/debug

## Settings And Operations Logic

Settings is kept as the go-live setup and capability control center:

- required blockers
- connected/tested count
- provider/tool cards
- save/test/blocker surfaces
- advanced capability matrix collapsed by default

Operations is kept as the live go-live command center:

- go-live readiness
- required blockers
- optional/later items
- provider tests
- jobs/artifacts
- storage/Redis/Playwright/GitHub truth
- advanced governance/debug collapsed by default

## Memory

Memory & Learning remains truthful and simple. Empty states stay clear: memory is created by Studio and Workbench when tasks are saved.

## Backend Safety

This pass does not remove backend guards, auth/session checks, provider governance, artifact persistence, Workbench guards, adult safeguards, or deployment guards.

## Required Live Tests

- GenX live model catalog and Studio execution
- GenX Lyria music job
- MiniMax/Mimo TTS
- STT transcription
- Adult text/image policy-gated route
- GitHub repo import/branch/patch/check/commit/push/PR
- Storage artifact preview
- Redis/job polling where configured
- Playwright/browser QA
- Firecrawl research

## Remaining Blockers

- Live keys must be added and tested.
- Adult video and adult voice need production routes, provider policy proof, safeguards, artifact handling, polling/playback, and live tests.
- Avatar/talking video remains optional/later.
- Automated memory promotion scheduler remains optional/later.

## Go-Live Verdict

Ready for live testing: yes.

Ready for go-live once keys/tests pass: yes.

Not go-live before live provider, Studio, Workbench, storage, and protected API tests pass.

