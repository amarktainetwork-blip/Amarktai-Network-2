/**
 * Text simulation adapter — local mock for text.* capabilities.
 *
 * Handles: chat, reasoning, code, embeddings, reranking, research,
 *          multimodal, tool_use, structured_output
 *
 * Behavior:
 *   1. Sleep 1 second (simulating latency)
 *   2. Generate a markdown text asset
 *   3. Return status: 'completed'
 */
import type { ProviderAdapter, ProviderExecutionContext, ProviderExecutionResult } from './provider-adapter.js';
export declare class TextSimulationAdapter implements ProviderAdapter {
    name: string;
    supportedPrefixes: string[];
    execute(context: ProviderExecutionContext): Promise<ProviderExecutionResult>;
    private generateMockOutput;
}
//# sourceMappingURL=text-simulation.d.ts.map