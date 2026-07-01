/**
 * Job processor — BullMQ worker that processes capability jobs.
 *
 * Flow:
 *   1. Receive job payload from Redis queue
 *   2. Update job status to 'processing' in PostgreSQL
 *   3. Route to the correct provider adapter based on capability prefix
 *   4. Save artifact and update job with result
 *   5. Mark job as 'completed' or 'failed'
 */
import type { Job } from 'bullmq';
import type { JobPayload } from '@amarktai/core';
export declare function processJob(job: Job<JobPayload>): Promise<void>;
//# sourceMappingURL=job-processor.d.ts.map