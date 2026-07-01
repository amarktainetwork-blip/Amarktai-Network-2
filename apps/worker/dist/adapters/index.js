/**
 * Provider adapter registry — routes capabilities to the correct adapter.
 *
 * For Phase 2, all adapters are local simulation drivers.
 * When real providers are integrated, new adapters are added here
 * without changing the worker or API code.
 */
import { getCapabilityPrefix } from '@amarktai/core';
import { TextSimulationAdapter } from './text-simulation.js';
import { ImageSimulationAdapter } from './image-simulation.js';
import { VoiceSimulationAdapter } from './voice-simulation.js';
import { VideoSimulationAdapter } from './video-simulation.js';
// ── Adapter Registry ──────────────────────────────────────────────────────────
const adapters = [
    new TextSimulationAdapter(),
    new ImageSimulationAdapter(),
    new VoiceSimulationAdapter(),
    new VideoSimulationAdapter(),
];
// ── Lookup ────────────────────────────────────────────────────────────────────
export function getAdapterForCapability(capability) {
    const prefix = getCapabilityPrefix(capability);
    const adapter = adapters.find((a) => a.supportedPrefixes.includes(prefix));
    if (!adapter) {
        throw new Error(`No provider adapter registered for capability '${capability}' (prefix: '${prefix}')`);
    }
    return adapter;
}
//# sourceMappingURL=index.js.map