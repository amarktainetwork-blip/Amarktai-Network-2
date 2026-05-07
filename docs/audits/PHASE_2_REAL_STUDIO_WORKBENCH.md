# Phase 2 Real Studio + Workbench

## What Was Wired

Phase 2 keeps the six-section dashboard and wires Studio plus Workbench to real protected backend routes without adding a new dashboard architecture.

Studio now uses a shared route map in `src/lib/studio-route-map.ts` and protected admin wrappers for execution:

| Studio tab | Protected route | Backend route used | Persistence |
| --- | --- | --- | --- |
| Chat | `/api/admin/amarktai-assistant/stream` | GenX streaming assistant route | Assistant/memory route available |
| Coding | `/api/admin/studio/workbench-handoff` | Workbench handoff artifact | Artifact record |
| Research | `/api/admin/studio/execute` | `/api/admin/research/assist` | Research artifact |
| Image | `/api/admin/studio/execute` | `/api/brain/image` | Image artifact when execution succeeds |
| Video | `/api/admin/studio/execute` | `/api/brain/video-generate` | Video job artifact when a real job is returned |
| Music / Audio | `/api/admin/studio/execute` | `/api/admin/music-studio` | Music job/artifact returned by existing route |
| Voice / TTS | `/api/admin/studio/execute` | `/api/brain/tts` | Audio artifact and playback when audio bytes are returned |
| STT / Transcription | `/api/admin/studio/stt` | `/api/brain/stt` | Transcript artifact |
| Avatar / Talking Video | none | none | Marked backend missing for Phase 3 |
| Adult | `/api/admin/studio/execute` | `/api/brain/adult-text`, `/api/brain/adult-image` | Text/image artifacts when app policy and providers allow |
| Artifacts | `/api/admin/artifacts` | artifact store/list route | Artifact browser |

## Workbench Lifecycle Route Map

Workbench keeps the simple operator flow:

repo -> branch/auto branch -> AI/model/auto -> prompt -> Start work -> plan -> approve -> apply/checks/PR

The page calls the existing backend lifecycle:

| Step | Route |
| --- | --- |
| Repo list | `/api/admin/repo-workbench/github/repos` |
| Branch list | `/api/admin/repo-workbench/github/branches` |
| Import/sync | `/api/admin/repo-workbench/import` |
| Plan | `/api/admin/repo-workbench/[workspaceId]/plan` |
| Patch/diff | `/api/admin/repo-workbench/[workspaceId]/patch` |
| Apply | `/api/admin/repo-workbench/[workspaceId]/apply-patch` |
| Detect checks | `/api/admin/repo-workbench/[workspaceId]/checks` |
| Run checks | `/api/admin/repo-workbench/[workspaceId]/run-check` |
| Commit | `/api/admin/repo-workbench/[workspaceId]/commit` |
| Push | `/api/admin/repo-workbench/[workspaceId]/push` |
| PR | `/api/admin/repo-workbench/[workspaceId]/pr` |
| Merge | `/api/admin/repo-workbench/[workspaceId]/merge` |
| Deploy | `/api/admin/repo-workbench/[workspaceId]/deploy` |
| Resume latest job | `/api/admin/repo-workbench/jobs/latest` |

## Persistence Map

| Data | Store |
| --- | --- |
| Studio generated outputs | Artifact DB/storage, with existing artifact fallback behavior where available |
| Studio coding handoff | Artifact DB/storage |
| Studio STT transcripts | Artifact DB/storage |
| Workbench workspaces | `RepoWorkspace` |
| Workbench plans | `RepoTask.planJson` plus report artifact |
| Workbench patches/diffs | `RepoPatch.diffText` plus patch artifact |
| Workbench commit/push/PR metadata | `RepoPatch` fields plus report artifacts |
| Workbench latest-job resume | `RepoTask`/`RepoPatch` via `/jobs/latest` |
| Workbench logs | storage-root logs via existing redacted log reader |

## Settings Status Truth

Settings connected count now means:

- a key exists, and
- the relevant live test/status has passed or has a last-known success signal.

Configured keys without a passed test show `Configured - needs live test`.

## Known Missing Provider Capabilities

- Avatar/talking video still needs a dedicated provider-specific implementation in Phase 3.
- Adult video and adult voice are not exposed as working Studio actions.
- Non-GenX streaming remains honest: supported streaming is GenX; other providers must use real non-stream execution where available.
- Some media routes depend on live provider keys and account access; missing keys return real blockers.

## Remaining Phase 3 Work

- Browser smoke coverage for login -> Studio/Workbench in a live environment.
- Provider-specific avatar/talking-video implementation.
- Full conversation browser/history UI on top of existing assistant persistence.
- Richer Studio artifact preview by media type.
- Live VPS proof for provider keys, Webdock, storage, and deployed app monitoring.

## Live VPS Verification Commands

Run without printing secrets:

```bash
git status
git rev-parse --abbrev-ref HEAD
git log -1 --oneline
npm run build
npm run lint
npm test
systemctl status amarktai-network --no-pager
curl -I https://YOUR_DOMAIN/
curl -I https://YOUR_DOMAIN/admin/login
curl -sS https://YOUR_DOMAIN/api/health | jq .
curl -sS -o /dev/null -w "%{http_code}\n" https://YOUR_DOMAIN/api/admin/settings/status
```

After logging in as admin in a browser:

```bash
curl -sS -b cookies.txt https://YOUR_DOMAIN/api/admin/settings/status | jq .
curl -sS -b cookies.txt https://YOUR_DOMAIN/api/admin/ai-model-catalog | jq '.universal.models | length'
curl -sS -b cookies.txt https://YOUR_DOMAIN/api/admin/repo-workbench/jobs/latest | jq .
curl -sS -b cookies.txt "https://YOUR_DOMAIN/api/admin/artifacts?appSlug=superbrain&limit=5" | jq .
```

Smoke in the UI:

- Log in and confirm the first dashboard section is Studio.
- Run Studio Chat with GenX configured.
- Run Studio Image only with a configured approved image provider.
- Upload a small audio file in STT and confirm transcript artifact.
- Open Workbench, choose repo, choose branch/auto branch, enter prompt, Start work, approve only after reviewing diff, then create PR.
- Navigate away and return to Workbench; confirm the latest job rehydrates from backend state.
