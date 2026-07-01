/**
 * Artifact types and validation — SINGLE SOURCE OF TRUTH.
 *
 * All artifact type definitions, MIME validation, and storage contracts
 * are declared here. The worker, artifact package, and API all import
 * from this module.
 */
import { z } from 'zod';
export declare const ARTIFACT_TYPES: readonly ["image", "audio", "music", "video", "code", "document", "report", "transcript"];
export type ArtifactType = (typeof ARTIFACT_TYPES)[number];
export declare const ARTIFACT_STATUSES: readonly ["pending", "processing", "completed", "failed", "expired"];
export type ArtifactStatus = (typeof ARTIFACT_STATUSES)[number];
export declare const CreateArtifactSchema: z.ZodObject<{
    appSlug: z.ZodString;
    type: z.ZodEnum<{
        image: "image";
        audio: "audio";
        music: "music";
        video: "video";
        code: "code";
        document: "document";
        report: "report";
        transcript: "transcript";
    }>;
    subType: z.ZodDefault<z.ZodString>;
    title: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
    provider: z.ZodDefault<z.ZodString>;
    model: z.ZodDefault<z.ZodString>;
    traceId: z.ZodDefault<z.ZodString>;
    mimeType: z.ZodDefault<z.ZodString>;
    metadata: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CreateArtifactInput = z.infer<typeof CreateArtifactSchema>;
export interface ArtifactRecord {
    id: string;
    appSlug: string;
    type: string;
    subType: string;
    title: string;
    description: string;
    provider: string;
    model: string;
    traceId: string;
    storageDriver: string;
    storagePath: string;
    storageUrl: string;
    mimeType: string;
    fileSizeBytes: number;
    previewable: boolean;
    downloadable: boolean;
    status: string;
    errorMessage: string;
    costUsdCents: number;
    metadata: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const ARTIFACT_MIME_MAP: Record<ArtifactType, string[]>;
export declare function isValidMimeForType(type: ArtifactType, mimeType: string): boolean;
export declare function getArtifactTypeFromMime(mimeType: string): ArtifactType;
//# sourceMappingURL=artifacts.d.ts.map