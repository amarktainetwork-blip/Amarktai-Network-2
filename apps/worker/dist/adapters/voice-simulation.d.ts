/**
 * Voice simulation adapter — local mock for voice.* capabilities.
 *
 * Handles: tts, stt, music_generation
 *
 * Behavior:
 *   1. Simulate sequence state transitions (queued → processing → completed)
 *   2. Generate a minimal mock audio buffer
 *   3. Log updates to the dashboard interface via DB status updates
 *   4. Return status: 'completed'
 */
import type { ProviderAdapter, ProviderExecutionContext, ProviderExecutionResult } from './provider-adapter.js';
export declare class VoiceSimulationAdapter implements ProviderAdapter {
    name: string;
    supportedPrefixes: string[];
    execute(context: ProviderExecutionContext): Promise<ProviderExecutionResult>;
    private updateJobStatus;
}
//# sourceMappingURL=voice-simulation.d.ts.map