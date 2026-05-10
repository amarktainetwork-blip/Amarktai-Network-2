# Dashboard Productization Fix

## Executive Verdict

This pass productizes the existing dashboard in place. It does not add a new dashboard, duplicate routes, alter public website files, or bypass provider governance. The fix focuses on removing debug-first UI from the main operator path and making each dashboard page task-first, truthful, and harder to misuse.

## Removed Or Simplified

- Removed fake Studio job rows before any real job exists.
- Removed static job-state ladders from the default Studio result panel.
- Removed Adult Video and Adult Voice from normal Studio modes unless governance can make them production-ready later.
- Removed duplicated Settings key-entry surfaces by replacing provider/tool sections with one unified setup list.
- Moved Operations blocker categories, route-present provider details, underused provider details, and file paths behind advanced disclosures.
- Replaced Apps & Agents onboarding-first presentation with a root workspace-first view.
- Kept raw logs, route details, and governance diagnostics out of the main workflow surfaces.

## Studio State Fixes

Studio now starts with a real empty state: "Run a command to see live results here." Active jobs show "No active jobs yet" until a real job, stream, status, payload, or result exists.

Job status is only displayed after execution starts. Provider/model, artifact, next action, and timeline panels no longer imply work has happened before the backend returns state.

Route/context details such as protected routes, dashboard context, memory, fallback chain, and raw payloads are available only in Advanced details.

## Workbench State Machine Fixes

Workbench now separates the workflow into explicit steps:

1. Start task generates the readable plan.
2. Generate patch uses the plan/task id.
3. Approve changes waits for a patch.
4. Run checks waits for approval.
5. Commit and push waits for passed checks.
6. Create PR waits for commit/push readiness.
7. Merge/deploy remain guarded in Advanced details.

Readable plan rendering no longer surfaces raw object JSON as the main UI. Findings are formatted into severity, location, issue, and fix fields where possible, with raw logs left in Advanced details.

## Settings Dedupe

Settings now has a single setup list for:

- GenX
- GitHub
- OpenAI
- Groq
- Together AI
- Hugging Face
- Qwen/DashScope
- MiniMax/Mimo
- Firecrawl
- Redis
- Playwright
- Storage
- Webdock
- SMTP/email

Each card owns status, unlocks, env/key needed, test route, last test result, blocker, save, and test entry points. GenX, GitHub, and Storage are no longer duplicated across multiple key-entry sections.

Adult policy defaults in normal UI are limited to off, suggestive, adult_text, adult_image, and full_adult_app_mode. Adult video and adult voice remain hidden from normal defaults until governance, backend routes, safeguards, polling/playback, artifacts, and live tests prove they are production-ready.

## Operations Cleanup

Operations now reads as a go-live command center:

- Can go live
- Required blockers
- Optional/later items
- Live-tested surfaces
- Provider health
- Storage/artifacts
- Research stack
- Required services
- Costs/usage
- Redis/jobs

Debug blocker categories, route-present-not-approved providers, underused capabilities, and low-level storage paths are collapsed into Advanced sections.

## Apps And Agents Cleanup

Apps & Agents now starts with the root workspace rule:

"AmarktAI Network has full configured access."

Internal agents are grouped by:

- Build & Code
- Research
- Creative Media
- Operations
- Safety
- Memory

Unavailable agents are isolated under "Not available yet." External onboarding remains collapsed under "Add external managed app" and is clearly only for future managed apps.

## Memory Fix

Memory no longer looks broken when empty. It explains that memory is created by saved Studio results, saved Workbench summaries, or agent workflows writing through the protected memory route.

When empty, it says:

"No memory yet. Studio and Workbench create memory when tasks are saved."

## Storage Truth Fix

Settings and Operations both consume the same storage truth surface:

- Settings uses `/api/admin/settings/status` and the platform settings truth object.
- Operations checks `LOCAL_STORE_FILES.artifacts` with `checkWritable` and reconciles display with `settingsTruth.storage.status`.

If local artifact storage is writable, Operations shows writable and Settings can show connected/writable truth. If it is not writable, both surfaces expose the same blocker path instead of conflicting status.

## Remaining Live-Test Blockers

- Provider keys must be added where missing.
- Provider live tests must pass before Connected status is trusted.
- Studio media routes need live provider validation for final output URLs.
- Workbench needs live GitHub repo/branch/patch/check/PR testing.
- Adult video and adult voice remain unavailable in normal UI until route, provider policy, safeguards, artifact preview/playback, polling, and live tests exist.
- Avatar/talking video remains optional/later.
- Automated memory promotion scheduler remains optional/later.

## Go-Live Verdict

Ready for live testing: yes.

Ready for go-live once keys/tests pass: yes, after required provider, Studio, Workbench, storage, and protected route live tests pass.

Not ready for go-live before live provider execution, Studio media lifecycle, Workbench PR flow, and deployment guard verification pass.
