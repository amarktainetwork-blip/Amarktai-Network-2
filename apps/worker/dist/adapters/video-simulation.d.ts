/**
 * Video simulation adapter — local mock for video.* capabilities.
 *
 * Handles: video_generation, avatar_generation
 *
 * Behavior:
 *   1. Simulate sequence state transitions with progress updates
 *   2. Generate a minimal mock video buffer (MP4 stub)
 *   3. Log updates to the dashboard interface via DB status updates
 *   4. Return status: 'completed'
 */
import type { ProviderAdapter, ProviderExecutionContext, ProviderExecutionResult } from './provider-adapter.js';
export declare class VideoSimulationAdapter implements ProviderAdapter {
    name: string;
    supportedPrefixes: string[];
    execute(context: ProviderExecutionContext): Promise<ProviderExecutionResult>;
    private updateJobStatus;
}
//# sourceMappingURL=video-simulation.d.ts.map