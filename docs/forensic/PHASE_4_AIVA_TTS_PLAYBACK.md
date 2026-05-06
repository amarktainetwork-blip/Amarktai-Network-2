# Phase 4 — AmarktAI Assistant TTS Playback

Generated: 2026-05-02  
Branch: `phase-4-AmarktAI Assistant-tts-playback`

## Goal

Add verified voice playback to AmarktAI Assistant without enabling fake or unverified voices.

## Added

### 1. Verified admin voice preview endpoint

New route:

```text
POST /api/admin/voice/preview
```

This endpoint:

- requires admin session
- accepts `text`, `voiceId`, and optional `emotionAware`
- checks runtime truth before executing
- refuses unverified voice/provider/model combinations
- calls the existing production TTS route at `/api/brain/tts`
- returns audio only when TTS actually executes

Supported voice IDs:

```text
genx:grok-tts:neutral
genx:aura-2:warm
genx:genxlm-voice-v1:premium
elevenlabs:default:studio
deepgram:aura-2:fast
```

### 2. AmarktAI Assistant voice selector and playback

Updated:

```text
src/components/admin/AmarktAI AssistantAssistantPanel.tsx
```

AmarktAI Assistant now:

- loads `/api/admin/voice/options`
- lists verified and locked voices
- disables locked voices
- plays assistant messages only when a verified voice is selected
- uses `/api/admin/voice/preview`
- supports stop/abort for both text streaming and audio playback

## Safety / truth rules

Voice playback remains locked unless runtime truth says TTS is available and the provider/model is configured.

The UI can show locked voices, but it cannot play them.

## Manual verification after merge/deploy

### Check available voices

```bash
curl -sS https://amarktai.com/api/admin/voice/options \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

Expected:

- verified voices only when runtime truth says TTS is available
- exact blockers for locked voices

### Preview voice

```bash
curl -sS -X POST https://amarktai.com/api/admin/voice/preview \
  -H 'Content-Type: application/json' \
  --cookie 'YOUR_ADMIN_COOKIE_HERE' \
  -d '{"text":"Hello, this is AmarktAI Assistant voice verification.","voiceId":"genx:grok-tts:neutral"}' \
  --output /tmp/AmarktAI Assistant-preview.mp3
```

Expected:

- audio file returned only when the selected voice is verified
- JSON blocker returned if TTS is not verified

### AmarktAI Assistant UI

Enable only after deploy verification:

```env
NEXT_PUBLIC_AmarktAI Assistant_ENABLED=true
```

Then:

1. Open dashboard.
2. Open AmarktAI Assistant.
3. Confirm one assistant surface only.
4. Select a verified voice.
5. Ask a short question.
6. Press `Play voice` on AmarktAI Assistant's answer.
7. Confirm audio plays.
8. Confirm locked voices cannot be selected.

## Not included

- Does not auto-speak every answer.
- Does not enable unverified voices.
- Does not add voice input/microphone STT yet.
- Does not redesign the public website.
- Does not bypass provider/runtime truth.

## Next recommended PR

1. Add STT/microphone input only after `/api/brain/stt` is verified live.
2. Add a visible AI Engine card/link to the Routing page if not already exposed in UI navigation.
3. Then start the public website + dashboard visual redesign as a UI-only PR.

## Verdict

AmarktAI Assistant now has verified voice playback without weakening runtime truth. Voice remains gated until provider tests and runtime capability checks pass.
