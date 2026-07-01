/**
 * Queue configuration and job payload types — SINGLE SOURCE OF TRUTH.
 *
 * All BullMQ queue names, job payload schemas, and worker event types
 * are declared here. Both the API (producer) and worker (consumer)
 * import from this module.
 */
import { z } from 'zod';
export declare const QUEUE_NAMES: {
    readonly JOBS: "amarktai:jobs";
    readonly RETRY: "amarktai:retry";
};
export declare const JobPayloadSchema: z.ZodObject<{
    jobId: z.ZodString;
    appSlug: z.ZodString;
    capability: z.ZodEnum<{
        code: "code";
        multimodal: "multimodal";
        chat: "chat";
        reasoning: "reasoning";
        image_generation: "image_generation";
        image_edit: "image_edit";
        tts: "tts";
        stt: "stt";
        video_generation: "video_generation";
        music_generation: "music_generation";
        avatar_generation: "avatar_generation";
        embeddings: "embeddings";
        reranking: "reranking";
        research: "research";
        tool_use: "tool_use";
        structured_output: "structured_output";
    }>;
    prompt: z.ZodString;
    input: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    traceId: z.ZodDefault<z.ZodString>;
    callbackUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type JobPayload = z.infer<typeof JobPayloadSchema>;
export declare const WORKER_EVENTS: {
    readonly JOB_STARTED: "job:started";
    readonly JOB_PROGRESS: "job:progress";
    readonly JOB_COMPLETED: "job:completed";
    readonly JOB_FAILED: "job:failed";
};
export declare const DEFAULT_JOB_OPTIONS: {
    attempts: number;
    backoff: {
        type: "exponential";
        delay: number;
    };
    removeOnComplete: {
        count: number;
    };
    removeOnFail: {
        count: number;
    };
};
export declare const WORKER_CONCURRENCY = 5;
//# sourceMappingURL=queue.d.ts.map