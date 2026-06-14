export function serializeArtifactReuse(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function archiveConfirmationBody(): string {
  return JSON.stringify({ confirmed: true })
}
