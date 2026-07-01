/**
 * Canonical capability definitions — SINGLE SOURCE OF TRUTH.
 *
 * Every capability the platform supports is declared here exactly once.
 * All routing, validation, worker dispatch, and dashboard display
 * import from this module. No other file may duplicate these definitions.
 */
import { z } from 'zod';
export declare const CAPABILITY_CATEGORIES: readonly ["text", "image", "audio", "video", "code", "multimodal", "system_ops"];
export type CapabilityCategory = (typeof CAPABILITY_CATEGORIES)[number];
export declare const CAPABILITY_KEYS: readonly ["chat", "reasoning", "code", "image_generation", "image_edit", "tts", "stt", "video_generation", "music_generation", "avatar_generation", "embeddings", "reranking", "research", "multimodal", "tool_use", "structured_output"];
export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];
export declare const CAPABILITY_CATEGORY_MAP: Record<CapabilityKey, CapabilityCategory>;
export declare const CAPABILITY_PREFIX_MAP: Record<CapabilityKey, string>;
export declare const CapabilityDefinitionSchema: z.ZodObject<{
    key: z.ZodEnum<{
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
    label: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    category: z.ZodEnum<{
        image: "image";
        audio: "audio";
        video: "video";
        code: "code";
        text: "text";
        multimodal: "multimodal";
        system_ops: "system_ops";
    }>;
    enabled: z.ZodDefault<z.ZodBoolean>;
    requiredFlags: z.ZodDefault<z.ZodArray<z.ZodString>>;
    allowedProviders: z.ZodDefault<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export type CapabilityDefinition = z.infer<typeof CapabilityDefinitionSchema>;
export declare const CAPABILITY_CATALOG: CapabilityDefinition[];
export declare function isValidCapability(key: string): key is CapabilityKey;
export declare function getCapabilityCategory(key: CapabilityKey): CapabilityCategory;
export declare function getCapabilityPrefix(key: CapabilityKey): string;
//# sourceMappingURL=capabilities.d.ts.map