/**
 * Provider adapter registry — routes capabilities to the correct adapter.
 *
 * For Phase 2, all adapters are local simulation drivers.
 * When real providers are integrated, new adapters are added here
 * without changing the worker or API code.
 */
import { type CapabilityKey } from '@amarktai/core';
import type { ProviderAdapter } from './provider-adapter.js';
export declare function getAdapterForCapability(capability: CapabilityKey): ProviderAdapter;
export type { ProviderAdapter, ProviderExecutionContext, ProviderExecutionResult } from './provider-adapter.js';
//# sourceMappingURL=index.d.ts.map