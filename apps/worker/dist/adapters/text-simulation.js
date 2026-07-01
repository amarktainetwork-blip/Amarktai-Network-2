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
import { saveArtifact } from '@amarktai/artifacts';
export class TextSimulationAdapter {
    name = 'local-sim-text';
    supportedPrefixes = ['text'];
    async execute(context) {
        // Simulate processing latency
        await sleep(1000);
        // Generate mock output
        const output = this.generateMockOutput(context);
        // Save as text artifact
        const artifact = await saveArtifact({
            input: {
                appSlug: context.appSlug,
                type: 'document',
                subType: context.capability,
                title: `${context.capability} output for ${context.appSlug}`,
                description: `Simulated ${context.capability} response`,
                provider: this.name,
                model: 'local-sim-v1',
                traceId: context.traceId,
                mimeType: 'text/markdown',
                metadata: { simulated: true, capability: context.capability },
            },
            data: Buffer.from(output, 'utf-8'),
            explicitMimeType: 'text/markdown',
        });
        return {
            success: true,
            provider: this.name,
            model: 'local-sim-v1',
            artifactId: artifact.id,
            output,
            metadata: { simulated: true, artifactId: artifact.id },
        };
    }
    generateMockOutput(context) {
        const { capability, prompt, appSlug } = context;
        return [
            `# ${capability} Response`,
            '',
            `**App:** ${appSlug}`,
            `**Capability:** ${capability}`,
            `**Generated:** ${new Date().toISOString()}`,
            '',
            '---',
            '',
            '## Input Prompt',
            '',
            `> ${prompt.slice(0, 500)}`,
            '',
            '## Simulated Output',
            '',
            `This is a local simulation response for the \`${capability}\` capability. `,
            `In production, this would be routed to a real AI provider by the AmarktAI Network engine.`,
            '',
            '### Metadata',
            '',
            `- Trace ID: \`${context.traceId}\``,
            `- Timestamp: ${new Date().toISOString()}`,
            '',
        ].join('\n');
    }
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=text-simulation.js.map