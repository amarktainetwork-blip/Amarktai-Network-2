# Phase 3 — AI Routing Tab, AmarktAI Assistant Panel, Voice Verification UI

Generated: 2026-05-02  
Branch: `phase-3-routing-AmarktAI Assistant-voice-ui`

## Goal

Add the visible operator UX on top of the Phase 2 backend routing and streaming foundation without reintroducing duplicated or broken AmarktAI Assistant surfaces.

## Added

### 1. Visual AI Routing page

New page:

```text
/admin/dashboard/ai-engine/routing
```

This page calls:

```text
POST /api/admin/ai-routing
```

It lets the operator visually inspect route plans by:

- capability
- cost preference
- safety profile
- adult allow flag

It shows:

- selected provider/model
- cost tier
- streaming support
- blockers
- full candidate chain
- configured vs blocked providers

### 2. Voice verification endpoint

New route:

```text
GET /api/admin/voice/options
```

It reads runtime truth and only marks voices as verified when the relevant TTS capability and provider are actually available.

Voice options exposed:

- GenX Grok TTS / AmarktAI Assistant Neutral
- GenX Aura 2 / AmarktAI Assistant Warm
- GenX GenXLM Voice / AmarktAI Assistant Premium
- ElevenLabs Studio Voice
- Deepgram Aura Fast

The UI may show locked voices, but should only allow verified voices to be selected.

### 3. One clean AmarktAI Assistant assistant panel

New component:

```text
src/components/admin/AmarktAI AssistantAssistantPanel.tsx
```

It consumes:

```text
POST /api/admin/conversation/stream
```

It supports:

- streaming admin conversation
- capability selector: chat, coding, reasoning, creative, research
- cost selector: free-first, cheap, balanced, premium
- backend route metadata
- stop/abort

### 4. Layout wiring behind the existing flag

`src/app/admin/dashboard/layout.tsx` now renders AmarktAI Assistant only when:

```text
NEXT_PUBLIC_AmarktAI Assistant_ENABLED=true
```

There is still only one AmarktAI Assistant surface.

## What this does not do

- Does not enable AmarktAI Assistant by default.
- Does not add voice playback yet.
- Does not allow unverified voices to be used.
- Does not create duplicate chat widgets.
- Does not bypass adult mode gates.
- Does not add public website redesign.

## Manual verification after merge/deploy

### AI Routing page

Open:

```text
https://amarktai.com/admin/dashboard/ai-engine/routing
```

Verify:

- cheap mode prioritises Qwen/Groq/Together/HuggingFace candidates where configured
- balanced mode prioritises GenX where configured
- adult routes show blockers unless adult-safe profile + adult gate are ready
- voice routes show verified/locked voice options

### AmarktAI Assistant panel

Set:

```env
NEXT_PUBLIC_AmarktAI Assistant_ENABLED=true
```

Rebuild and redeploy, then verify:

- one AmarktAI Assistant button appears
- AmarktAI Assistant streams responses through `/api/admin/conversation/stream`
- route metadata appears
- stop button aborts streaming
- there are no duplicate assistant widgets

### Voice options

Call:

```bash
curl -sS https://amarktai.com/api/admin/voice/options --cookie 'YOUR_ADMIN_COOKIE_HERE' | jq
```

Expected:

- `verified: true` only for providers/models that runtime truth says are ready
- locked voices show exact blockers

## Next recommended PR

1. Add direct link/card from AI Engine main page to `/admin/dashboard/ai-engine/routing`.
2. Add verified TTS playback using the existing TTS route.
3. Add public website redesign as a separate UI-only PR.
4. After TTS playback passes live, enable voice selector inside AmarktAI Assistant.

## Verdict

AmarktAI Assistant is back only as a single gated streaming operator panel. Voice selection is visible through verification data, but not yet used for playback until TTS is proven live.
