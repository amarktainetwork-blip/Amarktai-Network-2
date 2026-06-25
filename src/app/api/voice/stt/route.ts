/**
 * POST /api/voice/stt — Convenience voice STT endpoint
 *
 * Thin wrapper around /api/brain/stt for cleaner voice API surface.
 * Supports the active speech provider chain exposed by /api/brain/stt.
 *
 * See /api/brain/stt for full parameter documentation.
 */
export { POST } from '@/app/api/brain/stt/route';
