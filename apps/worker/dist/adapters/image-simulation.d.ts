/**
 * Image simulation adapter — local mock for image.* capabilities.
 *
 * Handles: image_generation, image_edit
 *
 * Behavior:
 *   1. Generate a minimal valid PNG mock image
 *   2. Write image asset with width/height metadata
 *   3. Return status: 'completed'
 */
import type { ProviderAdapter, ProviderExecutionContext, ProviderExecutionResult } from './provider-adapter.js';
export declare class ImageSimulationAdapter implements ProviderAdapter {
    name: string;
    supportedPrefixes: string[];
    execute(context: ProviderExecutionContext): Promise<ProviderExecutionResult>;
}
//# sourceMappingURL=image-simulation.d.ts.map