# Media Studio Go-Live Audit

Source: `src/app/admin/dashboard/media-studio/page.tsx` and API routes under `/api/brain/*`, `/api/admin/music-studio`, `/api/admin/artifacts`.

| Tab | UI fields | Model selector | Provider selector | Endpoint called | Job handling | Artifact handling | Error handling | Status | Exact blocker | Fix required |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Images | prompt | hard-coded `recraft-v3`, `grok-imagine`, `dalle-3` | none | `/api/admin/workspace/run` | none visible | displays URL only; history via artifacts separately | inline error | FAIL/PARTIAL | Uses workspace run, not canonical `/api/brain/image`; only 3 static models; no edit/upload flow here | Wire to `/api/brain/image`, load live model catalog, persist artifact/job, add image edit source flow |
| Video | prompt | none | none | none; button disabled | none | none | amber warning | FAIL | Button disabled; no polling; no GenX video model selector | Wire `/api/brain/video-generate`, `/api/brain/video-generate/[jobId]`, show job/artifact status |
| Voice | text, provider, voice/model, mode, speed | static voice/model list | auto/groq/openai/gemini | `/api/brain/tts` | synchronous blob response | object URL only, not persisted in visible code | inline error | PARTIAL | Batch TTS only; streaming marked pending; provider/model support not loaded from runtime truth | Add voice catalog/status, STT tab, artifact persistence, streaming service gate |
| Music | prompt/style only | none | none | none; button disabled | none | none | disabled warning | FAIL | Music generation disabled; no lyrics/genre/mood/vocal/duration controls | Wire `/api/admin/music-studio` async job route, add full song fields and polling |
| Adult | not a tab | none | none | none | none | none | only env-gated banner | FAIL/MISSING | Prompt requires Adult tab, but `TabId` lacks adult and tab list lacks adult | Add gated Adult tab only after global/app flag and provider test pass |
| History | artifact list/download | none | none | `/api/admin/artifacts?limit=30` | none | filters media artifacts and downloads storageUrl | empty/loading | PARTIAL | History works only if artifacts are persisted by other routes | Link generated media to artifacts consistently |

## Specific checks

- Image generation showing only 3 models is insufficient when GenX catalog has many image models.
- Video models are not listed as real selectable options.
- Voice has provider/model/speed, but no language and no live voice catalog.
- Music lacks lyrics, genre, mood, vocal/instrumental, duration, and working generation.
- Adult must remain hidden until enabled and provider test passes; currently it is not a functional tab at all.
- No tab should fake output; current disabled video/music is truthful but not live-ready.

Verdict: FAIL for media go-live.
