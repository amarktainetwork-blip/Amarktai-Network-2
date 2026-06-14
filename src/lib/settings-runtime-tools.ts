export function settingsRuntimeTools<T extends { id: string }>(tools: T[]): T[] {
  return tools.filter((tool) => tool.id !== 'storage')
}
