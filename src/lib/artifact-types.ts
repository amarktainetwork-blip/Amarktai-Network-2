export const ARTIFACT_TYPES = [
  'image',
  'audio',
  'music',
  'video',
  'code',
  'document',
  'report',
  'transcript',
  'repo_diff',
  'pull_request',
  'app_build',
  'research',
] as const

export type ArtifactType = (typeof ARTIFACT_TYPES)[number]

export const ARTIFACT_LABELS: Record<ArtifactType, string> = {
  image: 'Image',
  audio: 'Audio',
  music: 'Song',
  video: 'Video',
  code: 'Code',
  document: 'Document',
  report: 'Report',
  transcript: 'Transcript',
  repo_diff: 'Repository diff',
  pull_request: 'Pull request',
  app_build: 'App build',
  research: 'Research',
}
