# Delete Log

## Deleted in this pass

### `src/lib/dashboard-truth.ts`

- Proof gathered:
  - Direct repo search found the only live consumer was `src/app/api/admin/truth/route.ts`.
  - That route was rewritten to read runtime truth and model catalog sources directly.
  - Follow-up repo search found no remaining in-repo code importers.
- Reason for deletion:
  - Legacy compatibility projection duplicated runtime truth.
  - It falsely implied dashboard truth ownership instead of delegation.

## Behavior changes made instead of deleting more files

- Public/app-facing Brain routes now reject provider/model forcing with `400`.
- `/api/admin/truth` is retained only as a legacy compatibility aggregator.
- `/api/admin/agents` and `src/lib/agent-registry.ts` were relabeled as operator catalog surfaces, not runtime truth.
