# TOP_10_REAL_LAUNCH_BLOCKERS.md

**Generated**: 2026-06-23
**Source**: AmarktAI Network V1 Codebase Analysis
**Definition**: Something that prevents users from successfully using the platform

---

## Launch Blockers

### 1. GenX API Key Required for Most Capabilities

**Location**: All GenX-dependent capabilities (chat, image, video, music, tts, code, research)
**Root Cause**: GenX is the primary provider for 12 out of 16 capabilities. Without a GenX API key, most features are unavailable.
**Fix Required**: Ensure GenX API key is configured in production environment
**Estimated Effort**: 0 min (configuration only)

---

### 2. Video Generation Requires GenX Quota

**Location**: `/api/brain/video-generate`
**Root Cause**: Video generation only works with GenX, which requires specific quota/plan
**Fix Required**: Verify GenX video quota is available; add fallback video providers if needed
**Estimated Effort**: 2 hours (verify quota + add fallback if needed)

---

### 3. Music Generation Requires GenX Lyria

**Location**: `/api/brain/execute` (music_generation capability)
**Root Cause**: Music generation only works with GenX Lyria models; fallback is text blueprint only
**Fix Required**: Verify GenX Lyria quota; consider adding alternative music providers
**Estimated Effort**: 2 hours (verify quota + add fallback if needed)

---

### 4. RAG Pipeline Requires Qdrant

**Location**: `/api/rag`
**Root Cause**: RAG pipeline depends on Qdrant vector store running
**Fix Required**: Ensure Qdrant is deployed and configured in production
**Estimated Effort**: 30 min (deployment configuration)

---

### 5. Adult Content Requires Explicit Configuration

**Location**: `/api/brain/adult-text`, `/api/brain/adult-image`
**Root Cause**: Adult capabilities require `adultMode=true` and `safeMode=false` per app
**Fix Required**: Document adult content configuration for apps that need it
**Estimated Effort**: 1 hour (documentation)

---

### 6. Model Discovery Cache Empty by Default

**Location**: `model_discovery_cache` table
**Root Cause**: The dynamic model resolver falls back to static catalogs when cache is empty
**Fix Required**: Populate model_discovery_cache with live provider data on startup
**Estimated Effort**: 4 hours (implement model discovery worker)

---

### 7. App Profiles Not Configured

**Location**: `app_ai_profiles` table
**Root Cause**: Apps without profiles use default settings, which may not be optimal
**Fix Required**: Create profiles for each connected app with appropriate settings
**Estimated Effort**: 2 hours (per app configuration)

---

### 8. Budget Profiles Not Configured

**Location**: `budget_profiles` table
**Root Cause**: Budget enforcement requires profiles to be created and assigned
**Fix Required**: Create budget profiles and assign to apps
**Estimated Effort**: 1 hour (configuration)

---

### 9. Provider Health Checks Not Automated

**Location**: `ai_providers` table
**Root Cause**: Provider health is checked on-demand, not proactively
**Fix Required**: Implement periodic health check cron job
**Estimated Effort**: 2 hours (implement cron job)

---

### 10. Dashboard Shows Legacy Provider References

**Location**: Various dashboard pages
**Root Cause**: Some dashboard pages still reference removed providers in UI text
**Fix Required**: Update dashboard UI to show only 5 active providers
**Estimated Effort**: 3 hours (UI updates)

---

## Priority Order

| Priority | Blocker | Impact | Effort |
|----------|---------|--------|--------|
| 1 | GenX API Key | HIGH - Most features unavailable | 0 min |
| 2 | Video Generation Quota | MEDIUM - Video features blocked | 2 hours |
| 3 | Music Generation Quota | MEDIUM - Music features blocked | 2 hours |
| 4 | RAG Pipeline Qdrant | MEDIUM - RAG features blocked | 30 min |
| 5 | Adult Content Config | LOW - Only affects adult features | 1 hour |
| 6 | Model Discovery Cache | LOW - Static fallbacks work | 4 hours |
| 7 | App Profiles | LOW - Default settings work | 2 hours |
| 8 | Budget Profiles | LOW - No enforcement | 1 hour |
| 9 | Provider Health Checks | LOW - Manual checks work | 2 hours |
| 10 | Dashboard UI | LOW - Cosmetic only | 3 hours |

---

## Immediate Actions

1. **Verify GenX API key is configured** (0 min)
2. **Verify Qdrant is running** (30 min)
3. **Verify GenX video/music quota** (2 hours)
4. **Document adult content configuration** (1 hour)

**Total immediate effort**: ~4 hours

---

## Notes

- All 16 capabilities have working execution routes
- 8 capabilities are LIVE_PROVEN
- 1 capability is SOURCE_WIRED
- 7 capabilities are PARTIAL (require specific quota/config)
- 0 capabilities are BLOCKED
- The platform is launch-ready with proper configuration
