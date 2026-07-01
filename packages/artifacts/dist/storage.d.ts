/**
 * Filesystem storage driver for artifact files.
 *
 * Manages physical file I/O on the local VPS storage directory.
 * All paths are resolved relative to the configured storage root.
 * Includes path-traversal protection and MIME type detection.
 */
import { type ArtifactType } from '@amarktai/core';
export interface StoragePutResult {
    storagePath: string;
    storageUrl: string;
    mimeType: string;
    fileSizeBytes: number;
}
export interface StorageFileInfo {
    exists: boolean;
    sizeBytes: number;
    mimeType: string;
}
export declare class ArtifactStorageDriver {
    private get basePath();
    ensureDirectories(): Promise<void>;
    put(key: string, data: Buffer, explicitMimeType?: string): Promise<StoragePutResult>;
    get(key: string): Promise<Buffer | null>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    getInfo(key: string): Promise<StorageFileInfo>;
    buildStorageKey(appSlug: string, type: ArtifactType, filename: string): string;
}
export declare function getArtifactStorage(): ArtifactStorageDriver;
//# sourceMappingURL=storage.d.ts.map