/**
 * Compatibility entry point for app-facing capability execution.
 *
 * Canonical detection, policy, routing, provider execution, fallback,
 * performance learning, and artifact persistence live in orchestrator.ts.
 */
import { executeCapabilityOrchestration } from '@/lib/orchestrator'
import type {
  CapabilityRequest,
  CapabilityResponse,
} from '@/lib/capability-contracts'

export {
  CAPABILITY_ROUTER_CAPABILITIES,
  type CapabilityExecutionState,
  type CapabilityRequest,
  type CapabilityResponse,
  type CapabilityRouterCapability,
  type ProviderAttempt,
} from '@/lib/capability-contracts'

export async function executeCapability(
  request: CapabilityRequest,
): Promise<CapabilityResponse> {
  return executeCapabilityOrchestration(request)
}
