# AmarktAI Network V1

AmarktAI Network V1 is the central AI capability infrastructure for the AmarktAI ecosystem.

It is a reusable capability gateway, runtime, media/job system, artifact handoff layer, provider router, and control room. External product apps connect to it. External apps do not live inside it.

This local repository is the source of truth for the project.

Current source baseline for this handover: `828f98a fix: collapse v1 provider runtime policy`.

## Project Identity

AmarktAI Network provides the hard reusable AI infrastructure that many apps can share:

- provider and model-family governance
- capability routing
- GenX, Together, and Groq execution paths
- media generation, image, video, long-form video, voice, STT, TTS, music/song, and avatar foundations
- scraper, brand, RAG, and knowledge capabilities
- jobs, artifacts, callbacks, and webhook handoff
- app API keys and app capability permissions
- future agent, learning, self-improvement, and self-healing foundations
- dashboard control room for proof, status, providers, jobs, artifacts, and system health

It is not the Marketing App, Music App, Crypto App, Religious App, Horse App, or any other external product app.

## Architecture Overview

External apps own their own product surface:

- users
- databases
- storage
- UI
- business rules
- workflows
- permissions
- publishing, social, exchange, community, or domain-specific integrations
- app-specific records and data

AmarktAI Network owns shared AI execution:

- authenticating connected apps
- checking allowed capabilities
- accepting prompt/context/payload data
- validating temporary asset references
- choosing provider and model internally
- executing the capability
- storing temporary generated artifacts
- returning job, artifact, and callback results

Final product records and durable customer-facing storage remain with the external app unless a specific handoff contract says otherwise.

## How Apps Connect

Apps connect by API key and capability jobs.

A connected app sends:

- `appId` or app identity
- tenant, workspace, user, and request context such as `tenantId`, `userId`, or app-specific IDs
- the requested capability
- prompts, instructions, and domain context
- brand data or app data
- temporary signed asset references
- callback or webhook destination

Examples of signed asset references:

- logos
- product images
- brand guides
- PDFs and source documents
- audio references
- video references
- image references
- product, campaign, or customer support attachments

AmarktAI Network then:

- validates the app credential
- checks the app is allowed to use the requested capability
- downloads or validates temporary asset references
- rejects provider/model override attempts from app routes
- chooses the provider/model internally
- executes the capability
- stores temporary generated artifacts
- returns a result by response, artifact handoff, job polling, or webhook callback

External apps then store final outputs in their own database and storage.

## Provider Policy

Active V1 runtime providers are exactly:

- GenX
- Together
- Groq

Future/workbench only:

- MiMo

MiMo is preserved for future coding, workbench, reasoning, and V2 agent support. It is not an active app runtime provider in V1.

Removed or deferred from active V1 runtime:

- Hugging Face
- Adult mode
- Qwen
- Gemini
- MiniMax

Kling is not a top-level active provider unless a direct Kling API is added and approved later. If Kling is reachable through GenX, it is a GenX video/model family for Video Studio, Long-form Video, or Avatar workflows.

Apps do not choose providers or models. Apps request capabilities. AmarktAI Network chooses providers and models.

## Capability Model

A capability is a reusable unit of AI work. Build it once in AmarktAI Network, then connected apps can use it through their own products.

Examples:

- chat and text generation
- image generation
- image editing
- video generation
- image-to-video
- long-form video assembly
- music and song generation
- text-to-speech
- speech-to-text
- avatar image/video foundations
- scraper and brand extraction
- RAG and knowledge workflows
- research summaries
- campaign generation
- artifact creation
- webhook and handoff jobs

The runtime must not mark route existence as proof. A capability is proven only when real execution, artifact persistence, and truthful status reporting prove it.

## External App Examples

Marketing App may use:

- website scraping
- brand identity extraction
- logo, product, and brand-file references
- copy generation
- image generation
- reels
- long-form video
- voiceover
- music
- avatar presenter
- daily content generation
- webhook and artifact handoff

Music App may use:

- lyrics
- genre selectors
- song generation
- instrumental generation
- cover art
- music video
- avatar performer
- promo reels
- voice
- webhook and artifact handoff

Religious App may use:

- source-grounded RAG content
- sermon, devotional, and study generation
- voice/audio
- short video clips
- image generation

Crypto App may use:

- research summaries
- market commentary
- education content
- chart-aware context from the app
- alert copy
- video and social posts

Horse App may use:

- summaries
- health and training reports
- document and image support
- voice notes and STT
- educational content

Each app keeps its own users, storage, database, permissions, publishing connections, and business rules.

## Asset Reference Model

External apps should not permanently move all product data into AmarktAI Network.

Instead, apps can provide signed or temporary references for assets required by a job:

- logos
- product images
- brand books
- PDFs
- audio samples
- video clips
- source images
- reference campaigns

AmarktAI Network validates, fetches, and uses those references during execution. Generated outputs are stored temporarily as artifacts and returned to the app. The app stores final outputs in its own storage and database.

This keeps tenant data boundaries clean while still allowing shared AI capability execution.

## Dashboard Model

The dashboard is the AmarktAI Network control room. It is not a product app.

The dashboard should show real status only:

- proven
- blocked
- configured
- missing
- deferred
- failed

No fake readiness. No route-only proof. No stale provider clutter.

Expected control-room areas:

- Command Center
- Studio
- App Connections
- Capabilities
- Text & Chat Studio
- Image Studio
- Video Studio
- Long-form Video Studio
- Music / Song Studio
- Voice Studio
- Avatar Studio
- Scrape / Brand Studio
- RAG / Knowledge Studio
- Providers & Models
- Jobs & Artifacts
- Webhooks / Handoff
- Agents / Learning
- System / Settings

The full dashboard redesign is not complete in this handover.

## Capability Studios

Studios are focused control surfaces for exercising and proving capabilities.

Expected studios:

- Text & Chat: chat, text, reasoning, copy, and text proof.
- Image: image generation, image variants, asset ingestion, and proof.
- Video: short video and image-to-video job execution.
- Long-form Video: scene planning, clip execution, ffmpeg assembly, and final artifact proof.
- Music / Song: lyrics, structure, genre, vocals, instrumental/full-song generation, and audio artifact proof.
- Voice: TTS, STT, transcription, and voice artifact proof.
- Avatar: avatar image, avatar video/lip-sync, and presenter workflows.
- Scrape / Brand: website scraping, product/brand extraction, and brand memory inputs.
- RAG / Knowledge: source ingestion, retrieval, grounded answer generation, and research outputs.
- Jobs / Webhooks: job state, retries, callback delivery, artifact handoff, and proof.

Studios should display the provider/model selected by runtime after execution. They must not add provider/model selectors for app-facing requests.

## Agents And Learning

Agents and learning are future platform foundations. They are important, but they are not fully done unless code and proof say so.

The intended platform direction includes:

- app-specific agents
- agents that operate connected apps
- shared learning across apps without leaking private tenant data
- provider performance learning
- creative performance learning
- daily improvement loops
- self-healing and retry intelligence
- capability recommendations
- cross-app pattern learning

For V1, preserve the foundations and avoid claiming complete agent autonomy until live execution proves it.

## Current Known State

As of `828f98a fix: collapse v1 provider runtime policy`:

- provider runtime policy has been cleaned
- active runtime providers are GenX, Together, and Groq
- Groq remains active for proven/wired STT, chat, text, and voice-related paths where appropriate
- MiMo is preserved as future/workbench only
- Hugging Face is removed/deferred from active runtime, proof, readiness, and provider candidate lists
- adult mode is removed/deferred from active V1 runtime and proof
- Qwen, Gemini, and MiniMax are not active V1 runtime providers
- Pack A music must not use Hugging Face
- music proof requires `GENX_MUSIC_MODEL`
- dashboard redesign is not complete
- live beta is not complete
- capability packs and studios still need proof/build phases
- route existence is not proof

## Development Rules

- The local repo is the source of truth.
- Do not clone again to solve confusion.
- Do not use VPS state as the source of truth.
- Do not touch `opencode.json` unless explicitly instructed.
- Do not create duplicate `proof-v2`, `router-v2`, or `dashboard-v2` truth layers.
- Do not create new competing audit/truth/readiness documents.
- Do not claim ready without proof.
- Do not expose provider/model overrides to app routes.
- Do not mark route existence as proof.
- Do not add providers casually. V1 active providers are GenX, Together, and Groq.
- Do not re-activate Hugging Face or adult mode for V1 without an explicit approved task.
- Commit only after relevant checks pass: typecheck, build, proof where required, and `git diff --check`.

## Build Path From Here

Remaining stages:

1. Dashboard control-room rebuild.
2. Capability studio architecture.
3. Pack A proof for core media paths.
4. Pack B video, image-to-video, and long-form proof.
5. Music/song proof using GenX and `GENX_MUSIC_MODEL`.
6. Voice and avatar proof.
7. Scraper, brand, and asset reference pipeline.
8. External app gateway hardening.
9. Webhook and artifact handoff proof.
10. Agent and learning phase.
11. Fake external app simulation for safe end-to-end validation.
12. Marketing App connection first.

## Quick Commands

Use these from the repo root:

```bash
npm run build
npx tsc --noEmit
git diff --check
npm run proof
npm run proof -- --compact
```

Vitest note:

```bash
npm test
```

If monolithic Vitest hangs on Windows/local worker cleanup, use bounded batches of test files and isolate any hanging batch into single-file runs. Do not treat a monolithic worker-cleanup hang as a product failure if the same test files pass in bounded runs.

## Glossary

- Capability: a reusable AI job type, such as chat, image generation, TTS, STT, video, music, scraper, RAG, or artifact handoff.
- Provider: an execution backend approved by the runtime. Active V1 providers are GenX, Together, and Groq.
- Model family: a model or model group selected internally by the runtime for a capability.
- App connection: an external app credential and permission contract for calling AmarktAI Network.
- Artifact: a temporary or persisted output produced by a capability job, such as image, video, audio, transcript, document, or metadata.
- Webhook: a callback destination used to notify an external app when a job completes or fails.
- Asset reference: a signed or temporary URL/file reference supplied by an external app for logos, products, guides, PDFs, audio, video, or other job inputs.
- Studio: a dashboard control surface for running, proving, and inspecting a capability.
- Agent/learning: future intelligence layers for app-specific operation, performance learning, recommendations, retries, and improvement loops.
