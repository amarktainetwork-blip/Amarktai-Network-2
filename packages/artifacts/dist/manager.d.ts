/**
 * Artifact manager — orchestrates artifact creation, storage, and DB persistence.
 *
 * Bridges the storage driver (filesystem) and the database (Prisma Artifact table).
 * Worker processors call this to save generated outputs and register them as artifacts.
 */
import { type CreateArtifactInput } from '@amarktai/core';
export interface SaveArtifactOptions {
    input: CreateArtifactInput;
    data: Buffer;
    explicitMimeType?: string;
}
export interface SavedArtifact {
    id: string;
    storagePath: string;
    storageUrl: string;
    mimeType: string;
    fileSizeBytes: number;
}
export declare function saveArtifact(opts: SaveArtifactOptions): Promise<SavedArtifact>;
export declare function getArtifactFile(artifactId: string): Promise<{
    buffer: Buffer;
    mimeType: string;
    filename: string;
} | null>;
//# sourceMappingURL=manager.d.ts.map