export const compactString = (value: string | undefined): string | undefined => {
  if (!value) {
    return undefined
  }
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

export const firstNonEmpty = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    const compacted = compactString(value)
    if (compacted) {
      return compacted
    }
  }
  return undefined
}

export const joinParts = (first?: string, second?: string): string | undefined => {
  const left = compactString(first)
  const right = compactString(second)
  if (left && right) {
    return `${left} ${right}`
  }
  return left ?? right
}

export const toProviderId = (provider: string, rawId: string) =>
  rawId.startsWith(`${provider}:`) ? rawId : `${provider}:${rawId}`
