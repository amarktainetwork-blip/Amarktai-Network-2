# Media Runtime Truth

Date: 2026-06-15

`REAL` means an executable route can return a provider result and persist the
required artifact. It does not mean every declared provider has live proof.

| Capability | Status | Runtime truth |
| --- | --- | --- |
| Text to image | REAL | `/api/brain/image` uses the capability router. GenX, Qwen, Together, and HF adapters are represented; provider-level proof remains conservative in `PROVIDER_MATRIX.md`. Successful generated output is persisted. |
| Image edit | PLACEHOLDER | `/api/brain/image-edit` validates input and truthfully returns `UNAVAILABLE`; no source-image adapter is wired. |
| Image to video | PARTIAL | `/api/brain/video-generate` accepts source-image execution and can start GenX/Qwen jobs, but source handling and provider proof are incomplete. |
| Text to video | PARTIAL | Real GenX/Qwen job-start and polling paths exist. Completed outputs create artifacts; pending jobs do not fake completion. No universal success claim is justified. |
| Video planning | REAL | `/api/brain/video` produces and persists a scene/video plan. It is not a rendered video. |
| Long-form video | PARTIAL | Project and assembly code exists, but there is no production end-to-end proof for a complete long-form rendered artifact. |
| Video to video | NOT IMPLEMENTED | Capability matrix declares provider availability but no upload/transformation endpoint. |
| Music/song | PARTIAL | Music Studio can call GenX/HF routes, create jobs, and persist playable audio when returned. Otherwise it honestly stores a blueprint/planning artifact. |
| Lyrics | REAL | Lyrics/blueprint output is persisted, but some text fallback routing remains hardcoded. |
| TTS | REAL | MiMo, Together, and Groq have recorded playable artifact proof. GenX/HF paths exist but are not promoted to proven working here. |
| STT | PARTIAL | Multipart upload, Groq/Qwen/HF calls, and transcript artifacts exist. GenX behavior and all provider proofs are incomplete; defaults are hardcoded. |
| Avatar image | PARTIAL | `/api/brain/avatar` routes generation through the orchestrator and can create an artifact, but no dedicated live avatar proof is recorded. |
| Avatar video | PLACEHOLDER | `/api/brain/avatar-video` truthfully returns `needs_setup`; no approved lip-sync adapter exists. |
| Voice clone/design | NOT IMPLEMENTED | No consent record, durable voice-profile artifact, or approved clone adapter exists. |
| Suggestive image | PARTIAL | App-policy gated and routed through the image capability. Provider-level live proof is incomplete. |
| Suggestive video | PLACEHOLDER | Policy validation and planning artifact logic exist; the route explicitly says rendering is not wired. |
| Adult text | PARTIAL | Real app-policy gating and text execution exist. Provider-level adult proof remains unknown. |
| Adult image | PARTIAL | Real policy checks and Together/HF attempts exist; it returns `needs_setup` when no real image is produced. |
| Adult video | PARTIAL | Policy gating and planning/execution routing exist, but no general adult rendered-video proof exists. |
| Adult voice | PARTIAL | TTS route enforces app adult policy and content checks. Provider permissions and live adult-voice proof remain incomplete. |
| Artifacts | REAL | `artifact-store.ts`, storage adapters, admin APIs, preview/download URLs, reuse, archive, and artifact tests are active. |
| Media jobs | PARTIAL | Local and provider job tracking exists. Process-local media-job state is not sufficient for every multi-instance production case. |

## Canonical Media Ownership

- Artifact persistence: `src/lib/artifact-store.ts` and storage driver.
- Capability declaration: `src/lib/brain/v1-capability-matrix.ts`.
- App-facing execution: `src/lib/capability-router.ts` and specialist Brain
  routes.
- Media route metadata: `src/lib/media-capability-registry.ts`.

`music-studio.ts`, `genx-client.ts`, `ai-capability-adapters.ts`,
`video-route-specs.ts`, and specialist routes remain compatibility execution
code. They are not a second source of product truth.

## Broken Or Unsafe Claims

- Image edit must not be shown as working.
- Avatar video and voice cloning must not be shown as working.
- A storyboard, scene plan, lyrics sheet, or music blueprint is not a completed
  video, avatar, or song.
- A queued provider job is not a completed artifact.
- Adult capability approval is not evidence that a provider returned adult
  media.
