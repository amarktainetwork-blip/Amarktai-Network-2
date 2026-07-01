/**
 * Job lifecycle types and validation — SINGLE SOURCE OF TRUTH.
 *
 * All job status transitions, request schemas, and response contracts
 * are declared here. The API gateway, worker, and database all import
 * from this module.
 */
import { z } from 'zod';
export declare const JOB_STATUSES: readonly ["queued", "processing", "completed", "failed", "cancelled"];
export type JobStatus = (typeof JOB_STATUSES)[number];
export declare const CreateJobRequestSchema: z.ZodObject<{
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
    callbackUrl: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;
export interface CreateJobResponse {
    jobId: string;
    status: JobStatus;
    capability: string;
    createdAt: string;
}
export interface JobStatusResponse {
    jobId: string;
    status: JobStatus;
    capability: string;
    provider: string | null;
    model: string | null;
    artifactId: string | null;
    progress: number;
    error: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
}
/**
 * Fields that external apps are NEVER allowed to pass.
 * The API gateway must reject any request containing these fields
 * with a 400 Bad Request immediately.
 */
export declare const BLOCKED_OVERRIDE_FIELDS: readonly ["providerOverride", "modelOverride", "provider", "model", "providerKey", "modelId"];
export declare function hasBlockedOverrides(input: Record<string, unknown>): string | null;
//# sourceMappingURL=jobs.d.ts.map