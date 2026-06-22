# AmarktAI V1 Completion Tracker

Date: 2026-06-22

This is the single checklist we keep updating.

## 1. Current Source Of Truth

- Branch: `integration/cline-source-of-truth`
- Current HEAD: `d568e6d23d5d3f7ce50a84ddd3a22eae05a2584d`
- Latest VPS proof commit observed in current source truth: `d568e6d proof: refresh VPS media truth diagnostics`
- Current VPS proof counts from `V1_25_CAPABILITY_PROOF.md:28-32`:
  - `LIVE_PROVEN: 14`
  - `SOURCE_WIRED: 10`
  - `PROVIDER_AVAILABLE: 0`
  - `BLOCKED: 3`
  - `NOT_WIRED: 0`
- Latest known test/build truth from current source baseline:
  - VPS tests passed previously in source truth lineage
  - VPS build passed previously in source truth lineage
  - Current Windows/local verification is only a source/no-env sanity check unless explicitly stated otherwise
- Platform/worker status expectation:
  - `amarktai-platform.service` and `amarktai-worker.service` must run the same commit and env on VPS
  - Redis/BullMQ worker, local storage, and Qdrant must remain healthy for async jobs, artifacts, and RAG

## 2. Definition Of App-Ready

AmarktAI V1 is app-ready only when all of the following are true:

- apps can request capabilities without provider/model choice
- provider routing is clean and proven
- core creative workflows work end to end
- artifacts persist and preview/download works
- dashboard shows truth, not overclaims
- adult mode is gated and audited
- connected apps can execute signed requests
- monitoring/self-learning/agent basics are live
- website/dashboard are launch-ready enough for users/investors

## 3. Provider Strategy

### Active launch providers

- GenX
- Hugging Face
- Together
- Groq
- Xiaomi MiMo only if runtime-proven; otherwise catalog/future only

### Removed providers

- Qwen / DashScope / Wan

### Provider roles

| Provider | Primary role | Fallback role | Catalog-only / future role | Blocked items | Capabilities it should own |
|---|---|---|---|---|---|
| GenX | premium multimodal runtime, video, avatar image, async media jobs | image/video/text fallback where proven | non-proven i2v candidates until contract exists | image edit proof still incomplete; some i2v models lack provider-safe contracts | chat, reasoning, coding, image generation, text-to-video, avatar image, music path candidates, TTS/STT where proven |
| Hugging Face | embeddings and broad catalog truth; image/image-edit/task-model fallback where endpoint/config allows | text/image/ocr/stt/tts/rerank specialist fallback | adult-gated catalog candidate source, broader task catalog source | specialist endpoint requirements for rerank, image edit, video, i2v, music, TTS, STT | embeddings, rerank with endpoint, image/task families, text/task families, OCR/vision, adult-gated candidate registry |
| Together | live text/image fallback; text-to-image proven | text fallback, future rerank/video fallback if endpoint proof exists | video/i2v catalog-visible until `/videos` and rerank endpoints are proven | `/videos` endpoint gate; rerank dedicated endpoint requirement | chat/coding fallback, text-to-image, future video/i2v/rerank only after proof |
| Groq | primary low-latency chat/reasoning/coding and TTS | STT/TTS fallback | none | no image/video/music ownership | chat, reasoning, coding, TTS, STT |
| Xiaomi MiMo | text/chat/code candidate when runtime truth is clear | future voice/audio fallback only after backend runtime proof | catalog/future for TTS/STT/agents while runtime flag is off | `MIMO_RUNTIME_API_ENABLED` off; no proven tool/agent execution | chat, reasoning, coding only when routed truthfully; future TTS/STT if live-proven |

## 4. Capability Tracker

Status terms used here:
- `LIVE_PROVEN`
- `SOURCE_WIRED`
- `BLOCKED`
- `covered_by_remaining_provider`
- `needs_replacement_model`
- `source_wired_but_unproven`
- `blocked_by_provider_endpoint`
- `not_launch_ready`

| Capability/workflow | Required for launch | Current status | Provider/model pool | Product quality status | Proof status | Blocker | Next action |
|---|---|---|---|---|---|---|---|
| chat | yes | covered_by_remaining_provider | GenX, Groq, Together, HF, MiMo(text only) | technical core only | live-proven | none for core route | keep capability-only routing clean |
| reasoning | yes | covered_by_remaining_provider | GenX, Groq, Together, MiMo(text only), HF task-text fallback | technical core only | live-proven | none for core route | keep provider reset truthful |
| coding | yes | covered_by_remaining_provider | GenX, Groq, Together, MiMo(text only), HF task-text fallback | technical core only | live-proven | none for core route | keep routing/model pools clean |
| research/RAG | yes | covered_by_remaining_provider | Groq/GenX/HF text + HF embeddings + local tools | technical proof only, not product quality | live-proven | none for core proof path | preserve live RAG path |
| embeddings | yes | covered_by_remaining_provider | Hugging Face, GenX | technical core only | live-proven via HF | no blocker for existing HF path | keep HF embeddings as canonical active proof path |
| summarization | yes | source_wired_but_unproven | GenX, Groq, Together, HF, MiMo(text only) | product contract incomplete | source-wired | no dedicated connected-app contract | add proper contract later |
| translation | yes | source_wired_but_unproven | GenX, HF, Together, MiMo(text only) | product contract incomplete | source-wired | no dedicated connected-app contract | add proper contract later |
| image generation | yes | covered_by_remaining_provider | GenX, Together, HF | quality not fully audited | live-proven via Together | none for current technical proof | maintain truthful provider pool |
| image editing | yes | source_wired_but_unproven | GenX, HF, Together | no active proven replacement after Qwen removal | source-wired | Qwen account blocker removed; no live replacement proven | prove HF specialist or GenX/Together route, or mark exact blocker |
| image-to-video | yes | not_launch_ready | GenX candidate pool, Together gated video pool, HF specialist candidate pool | not proven | source-wired | Qwen account blocker removed; no active provider-safe proven replacement | define/provider-safe GenX or Together/HF replacement and prove it |
| text-to-video short | yes | covered_by_remaining_provider | GenX, Together future video pool, HF future specialist pool | technical proof only | live-proven via GenX | none for current technical proof | preserve GenX short-video proof path |
| long-form video | yes | source_wired_but_unproven | local assembly + GenX clip source + future Together/HF options | technical assembly proof only, not ad-quality proof | live technical assembly only | provider-native coherent long-form generation not proven | keep honest technical-only classification |
| music/song generation | yes | source_wired_but_unproven | GenX, HF specialist candidate | quality and provider proof incomplete | source-wired | no live provider music proof | define/prove real provider path |
| audio-bed generation | no | covered_by_remaining_provider | local assembly | technical assembly only | live technical assembly | not provider-native generation | keep honest technical-only claim |
| TTS | yes | covered_by_remaining_provider | Groq, GenX, HF specialist, Together, MiMo future | technical proof only | live-proven via Groq | MiMo/HF specialist routes not proven | keep Groq primary |
| STT | yes | covered_by_remaining_provider | GenX, Groq, HF specialist, Together, MiMo future | technical proof only | live-proven via GenX | MiMo/HF specialist routes not proven | keep GenX/Groq/HF pool clean |
| captions/subtitles | yes | covered_by_remaining_provider | local assembly + STT-derived | technical assembly only | live technical assembly | not equivalent to polished product captions | preserve truthful wording |
| avatar image | yes | covered_by_remaining_provider | GenX, HF, Together | technical proof only | live-proven via GenX | none for current proof | keep GenX path stable |
| avatar video/talking avatar | yes | blocked_by_provider_endpoint | no approved lip-sync provider boundary | not launch-ready | blocked | Rhubarb/lip-sync adapter missing | install/configure lip-sync boundary |
| adult image | yes | blocked | HF/Together/GenX under adult policy only | not launch-ready | blocked | provider approval and app adult approval missing | build adult-gated launch layer later |
| adult video | no | blocked | HF/Together future only | not launch-ready | blocked | provider endpoint + adult approval + policy | defer to adult phase |
| adult chat/text | yes | source_wired_but_unproven | HF/MiMo text task families under adult policy only | not launch-ready | source/policy only | policy and proof incomplete | defer to adult phase |
| connected app execution | yes | source_wired_but_unproven | capability-only central runtime | product integration incomplete | source-wired | signed real app proof still required | connected apps phase later |
| app agents | yes | source_wired_but_unproven | GenX/Groq/Together/HF/MiMo text paths | product/ops maturity incomplete | source-wired | live agent proof not complete | agents phase later |
| self-learning/memory | yes | source_wired_but_unproven | local/DB/Qdrant/runtime mix | not fully proven end-to-end | source-wired | policy + persistence + proof gaps | monitoring/self-learning phase later |
| provider fallback | yes | source_wired_but_unproven | GenX, Groq, Together, HF, MiMo(text only) | technical only | source-wired | controlled failure proof missing | add explicit fallback proof later |
| route outcome logging | yes | source_wired_but_unproven | central runtime tracing | operator UX incomplete | source-wired | DB-backed trace inspection proof missing | keep source wired |
| worker retry/polling | yes | source_wired_but_unproven | Redis/BullMQ/control plane | ops not fully proven | source-wired | needs queued async provider job proof | ops phase later |
| VPS/app monitoring | yes | source_wired_but_unproven | admin truth/settings/health surfaces | operator-facing polish incomplete | source-wired | unified truth/monitoring flow incomplete | ops phase later |
| dashboard truth | yes | source_wired_but_unproven | admin truth/settings/capabilities pages | not yet final operator UX | source-wired | duplicated truth layers | dashboard truth redesign phase later |
| Studio UX | yes | source_wired_but_unproven | Studio + artifacts + jobs | functional but not polished | source-wired | fragmentation and workflow quality gaps | dashboard/studio phase later |
| website | yes | not_launch_ready | public marketing pages | not in scope here | not proven | launch polish not done | website phase later |

## 5. Launch Blockers

### Hard technical blockers

- image editing has no remaining live-proven active provider after Qwen removal
- image-to-video has no remaining live-proven active provider-safe route after Qwen removal
- talking avatar lacks approved Rhubarb/lip-sync runtime boundary
- worker retry/polling still needs full async proof chain
- connected apps still need signed end-to-end proof

### Provider/account blockers

- Qwen/DashScope/Wan is removed from active runtime due to arrearage/account blockage
- Hugging Face specialist capabilities still require endpoint configuration
- Together video/i2v remains blocked until `/videos` proof and runtime flag enablement
- MiMo runtime API remains unproven for TTS/STT/agents

### Product-quality blockers

- long-form video proof is technical assembly only, not coherent advert quality
- music/song quality and generation path are not live-proven
- adult capabilities are not product-quality launch ready

### UI/dashboard blockers

- dashboard truth still has duplicated/mixed readiness layers
- Studio is usable but not final investor/user launch polish

### App-integration blockers

- capability-only signed app execution is not fully proven end to end
- app agents and self-learning are not yet live enough for launch claims

### Policy/adult blockers

- adult provider/model approval is incomplete
- adult auditing/safety/proof is incomplete

## 6. Step-by-Step Completion Checklist

### Phase 1 Provider reset

- [ ] Remove Qwen completely
- [ ] Lock provider roles
- [ ] Stop bad/default model routing
- [ ] Add provider/model pool tests

### Phase 2 Capability/model pools

- [ ] Define primary/fallback models per capability
- [ ] Add quality/cost/speed routing rules
- [ ] Add blacklist for bad models
- [ ] Add launch-required capability matrix

### Phase 3 Core runtime

- [ ] Chat/reasoning/coding stable
- [ ] Research/RAG stable
- [ ] Embeddings/rerank strategy fixed
- [ ] Fallback and route logging live-proven

### Phase 4 Image/media

- [ ] Image generation quality fixed
- [ ] Image edit live-proven
- [ ] Image-to-video live-proven
- [ ] Video model selection fixed

### Phase 5 Music/song

- [ ] Real song generation provider path
- [ ] 20s/60s/2min duration handling
- [ ] Genre/vocal/instrument controls
- [ ] Lyrics/instrumental modes
- [ ] Persist/preview/download

### Phase 6 Video/reels/long-form

- [ ] Brand/product research
- [ ] Script generation
- [ ] Shot planning
- [ ] Voice selection
- [ ] Captions
- [ ] Assembly
- [ ] Quality gate
- [ ] 20-30s reel works end-to-end
- [ ] Long-form truthfully supported

### Phase 7 Avatar/voice

- [ ] Avatar library
- [ ] Voice selection
- [ ] Talking avatar/lip-sync
- [ ] Preview/download

### Phase 8 Adult/HF layer

- [ ] Adult model registry
- [ ] HF adult endpoints
- [ ] App permissions
- [ ] Safety/audit logging
- [ ] Adult image/video/chat proof

### Phase 9 Apps/agents

- [ ] Connected app signed execution
- [ ] Marketing app first workflow
- [ ] App agents
- [ ] Self-learning/memory
- [ ] App monitoring

### Phase 10 Ops

- [ ] VPS monitoring
- [ ] Worker/job monitoring
- [ ] Cost/budget tracking
- [ ] Error recovery
- [ ] Admin alerts

### Phase 11 Dashboard/Studio

- [ ] Truthful readiness labels
- [ ] Studio usable flow
- [ ] Provider settings cleanup
- [ ] Artifact library polish
- [ ] No misleading green states

### Phase 12 Website/launch

- [ ] Website redesign
- [ ] Dashboard polish
- [ ] Final VPS proof
- [ ] First apps can start onboarding
