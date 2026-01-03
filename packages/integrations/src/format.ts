type CoordinateParam = string | { lat: number; lng: number };

export const compactString = (
  value: string | undefined
): string | undefined => {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

export const firstNonEmpty = (
  ...values: Array<string | undefined>
): string | undefined => {
  for (const value of values) {
    const compacted = compactString(value);
    if (compacted) {
      return compacted;
    }
  }
  return undefined;
};

export const joinParts = (
  first?: string,
  second?: string
): string | undefined => {
  const left = compactString(first);
  const right = compactString(second);
  if (left && right) {
    return `${left} ${right}`;
  }
  return left ?? right;
};

export const formatCoordinateParam = (
  value: CoordinateParam | undefined
): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === "string") {
    return compactString(value);
  }
  return `${value.lat},${value.lng}`;
};

export const metadataOrUndefined = (
  metadata: Record<string, string>
): Record<string, string> | undefined =>
  Object.keys(metadata).length > 0 ? metadata : undefined;
