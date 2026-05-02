export type CapabilityGroup =
  | 'multimodal'
  | 'computer_vision'
  | 'natural_language_processing'
  | 'audio'
  | 'tabular'
  | 'time_series'
  | 'reinforcement_learning'
  | 'robotics'
  | 'graph_ml'
  | 'system_ops'

export interface AiCapabilityDefinition {
  id: string
  label: string
  group: CapabilityGroup
  description: string
  defaultProviders: string[]
  specialistRouteRequired: boolean
  appPermissionRequired: boolean
  safetyNotes?: string
}

export const AI_CAPABILITY_TAXONOMY: readonly AiCapabilityDefinition[] = [
  // Multimodal
  cap('audio_text_to_text', 'Audio-Text-to-Text', 'multimodal', 'Transcribe or reason over audio plus text input.', ['genx', 'gemini', 'qwen', 'huggingface', 'deepgram'], true, true),
  cap('image_text_to_text', 'Image-Text-to-Text', 'multimodal', 'Answer or reason over image plus text.', ['genx', 'gemini', 'qwen', 'huggingface', 'zhipu'], false, true),
  cap('image_text_to_image', 'Image-Text-to-Image', 'multimodal', 'Edit/generate image from image plus text.', ['genx', 'qwen', 'huggingface', 'replicate', 'minimax'], true, true),
  cap('image_text_to_video', 'Image-Text-to-Video', 'multimodal', 'Generate video from image plus prompt.', ['genx', 'qwen', 'minimax', 'replicate'], true, true),
  cap('visual_question_answering', 'Visual Question Answering', 'multimodal', 'Answer questions about images.', ['genx', 'gemini', 'qwen', 'huggingface', 'zhipu'], false, true),
  cap('document_question_answering', 'Document Question Answering', 'multimodal', 'Answer questions from documents and scans.', ['genx', 'gemini', 'huggingface', 'qwen'], false, true),
  cap('video_text_to_text', 'Video-Text-to-Text', 'multimodal', 'Analyze or summarize video with text prompt.', ['genx', 'gemini', 'qwen', 'huggingface'], true, true),
  cap('visual_document_retrieval', 'Visual Document Retrieval', 'multimodal', 'Search/retrieve visual document regions or pages.', ['huggingface', 'gemini', 'genx'], true, true),
  cap('any_to_any', 'Any-to-Any', 'multimodal', 'General multimodal conversion/reasoning.', ['genx', 'gemini', 'qwen', 'minimax', 'huggingface'], true, true),

  // Computer Vision
  cap('depth_estimation', 'Depth Estimation', 'computer_vision', 'Estimate depth maps from images.', ['huggingface'], true, true),
  cap('image_classification', 'Image Classification', 'computer_vision', 'Classify images.', ['huggingface', 'gemini', 'qwen'], false, true),
  cap('object_detection', 'Object Detection', 'computer_vision', 'Detect objects and boxes.', ['huggingface', 'gemini', 'qwen'], true, true),
  cap('image_segmentation', 'Image Segmentation', 'computer_vision', 'Segment regions or objects.', ['huggingface', 'replicate'], true, true),
  cap('text_to_image', 'Text-to-Image', 'computer_vision', 'Generate images from text.', ['genx', 'qwen', 'huggingface', 'together', 'replicate', 'minimax'], true, true),
  cap('image_to_text', 'Image-to-Text', 'computer_vision', 'Caption/extract text from images.', ['genx', 'gemini', 'qwen', 'huggingface'], false, true),
  cap('image_to_image', 'Image-to-Image', 'computer_vision', 'Transform or edit images.', ['genx', 'qwen', 'huggingface', 'replicate'], true, true),
  cap('image_to_video', 'Image-to-Video', 'computer_vision', 'Generate video from image.', ['genx', 'qwen', 'minimax', 'replicate'], true, true),
  cap('unconditional_image_generation', 'Unconditional Image Generation', 'computer_vision', 'Generate images without prompt conditioning.', ['huggingface', 'replicate'], true, true),
  cap('video_classification', 'Video Classification', 'computer_vision', 'Classify videos.', ['huggingface', 'gemini'], true, true),
  cap('text_to_video', 'Text-to-Video', 'computer_vision', 'Generate videos from text.', ['genx', 'qwen', 'minimax', 'replicate'], true, true),
  cap('zero_shot_image_classification', 'Zero-Shot Image Classification', 'computer_vision', 'Classify images against arbitrary labels.', ['huggingface', 'gemini'], false, true),
  cap('mask_generation', 'Mask Generation', 'computer_vision', 'Generate masks for images.', ['huggingface', 'replicate'], true, true),
  cap('zero_shot_object_detection', 'Zero-Shot Object Detection', 'computer_vision', 'Detect objects from text labels.', ['huggingface'], true, true),
  cap('text_to_3d', 'Text-to-3D', 'computer_vision', 'Generate 3D assets from text.', ['huggingface', 'replicate'], true, true),
  cap('image_to_3d', 'Image-to-3D', 'computer_vision', 'Generate 3D assets from images.', ['huggingface', 'replicate'], true, true),
  cap('image_feature_extraction', 'Image Feature Extraction', 'computer_vision', 'Extract image embeddings/features.', ['huggingface', 'gemini'], false, true),
  cap('keypoint_detection', 'Keypoint Detection', 'computer_vision', 'Detect body/object keypoints.', ['huggingface'], true, true),
  cap('video_to_video', 'Video-to-Video', 'computer_vision', 'Transform video into another video.', ['genx', 'replicate', 'minimax'], true, true),

  // NLP
  cap('text_classification', 'Text Classification', 'natural_language_processing', 'Classify text.', ['genx', 'qwen', 'deepseek', 'gemini', 'huggingface'], false, true),
  cap('token_classification', 'Token Classification', 'natural_language_processing', 'NER/token labeling.', ['huggingface'], false, true),
  cap('table_question_answering', 'Table Question Answering', 'natural_language_processing', 'Answer questions over tables.', ['genx', 'gemini', 'huggingface', 'qwen'], false, true),
  cap('question_answering', 'Question Answering', 'natural_language_processing', 'Answer questions from context.', ['genx', 'qwen', 'deepseek', 'gemini', 'huggingface'], false, true),
  cap('zero_shot_classification', 'Zero-Shot Classification', 'natural_language_processing', 'Classify without training examples.', ['huggingface', 'gemini', 'qwen'], false, true),
  cap('translation', 'Translation', 'natural_language_processing', 'Translate text.', ['genx', 'qwen', 'gemini', 'huggingface'], false, true),
  cap('summarization', 'Summarization', 'natural_language_processing', 'Summarize text/documents.', ['genx', 'qwen', 'deepseek', 'gemini', 'moonshot', 'huggingface'], false, true),
  cap('feature_extraction', 'Feature Extraction', 'natural_language_processing', 'Create embeddings/features.', ['huggingface', 'gemini', 'genx'], false, true),
  cap('text_generation', 'Text Generation', 'natural_language_processing', 'Generate text/chat/code.', ['genx', 'qwen', 'deepseek', 'gemini', 'minimax', 'groq', 'together', 'huggingface', 'moonshot', 'zhipu'], false, true),
  cap('fill_mask', 'Fill-Mask', 'natural_language_processing', 'Masked language modeling.', ['huggingface'], false, true),
  cap('sentence_similarity', 'Sentence Similarity', 'natural_language_processing', 'Compare sentence meaning.', ['huggingface', 'gemini'], false, true),
  cap('text_ranking', 'Text Ranking', 'natural_language_processing', 'Rerank documents/search results.', ['huggingface', 'jina', 'cohere'], true, true),

  // Audio
  cap('text_to_speech', 'Text-to-Speech', 'audio', 'Generate speech from text.', ['genx', 'minimax', 'gemini', 'qwen', 'huggingface', 'elevenlabs', 'deepgram', 'groq'], true, true),
  cap('text_to_audio', 'Text-to-Audio', 'audio', 'Generate sound/music/audio from text.', ['genx', 'minimax', 'replicate', 'huggingface'], true, true),
  cap('automatic_speech_recognition', 'Automatic Speech Recognition', 'audio', 'Speech-to-text transcription.', ['genx', 'deepgram', 'huggingface', 'gemini', 'qwen'], true, true),
  cap('audio_to_audio', 'Audio-to-Audio', 'audio', 'Transform or enhance audio.', ['huggingface', 'replicate', 'minimax'], true, true),
  cap('audio_classification', 'Audio Classification', 'audio', 'Classify audio.', ['huggingface'], true, true),
  cap('voice_activity_detection', 'Voice Activity Detection', 'audio', 'Detect speech segments.', ['huggingface', 'deepgram'], true, true),

  // Data/Other
  cap('tabular_classification', 'Tabular Classification', 'tabular', 'Classify tabular rows.', ['huggingface'], true, true),
  cap('tabular_regression', 'Tabular Regression', 'tabular', 'Regression over tables.', ['huggingface'], true, true),
  cap('time_series_forecasting', 'Time Series Forecasting', 'time_series', 'Forecast series.', ['huggingface'], true, true),
  cap('reinforcement_learning', 'Reinforcement Learning', 'reinforcement_learning', 'RL models/environments.', ['huggingface'], true, true),
  cap('robotics', 'Robotics', 'robotics', 'Robotics models/control policies.', ['huggingface'], true, true, 'Requires strict hardware/safety gating before execution.'),
  cap('graph_machine_learning', 'Graph Machine Learning', 'graph_ml', 'Graph ML models.', ['huggingface'], true, true),

  // System ops
  cap('repo_coding_agent', 'Repo Coding Agent', 'system_ops', 'Add/select repo, command, create PR.', ['genx', 'qwen', 'deepseek', 'moonshot', 'zhipu', 'minimax'], false, true),
  cap('website_crawl_intelligence', 'Website Crawl Intelligence', 'system_ops', 'Scrape app website and build app intelligence profile.', ['firecrawl', 'genx', 'gemini', 'moonshot'], false, true),
]

function cap(
  id: string,
  label: string,
  group: CapabilityGroup,
  description: string,
  defaultProviders: string[],
  specialistRouteRequired: boolean,
  appPermissionRequired: boolean,
  safetyNotes?: string,
): AiCapabilityDefinition {
  return { id, label, group, description, defaultProviders, specialistRouteRequired, appPermissionRequired, safetyNotes }
}

export function getCapabilityTaxonomyByGroup() {
  return AI_CAPABILITY_TAXONOMY.reduce<Record<string, AiCapabilityDefinition[]>>((acc, capability) => {
    acc[capability.group] ??= []
    acc[capability.group].push(capability)
    return acc
  }, {})
}

export function getCapabilityDefinition(id: string) {
  return AI_CAPABILITY_TAXONOMY.find((capability) => capability.id === id)
}
