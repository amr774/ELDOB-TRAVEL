/** Validate browser-loaded image URLs without downloading them through the API. */
export function normalizeImageLink(value: string): string | undefined {
  const input = value.trim();
  if (!input || input.length > 4096) return undefined;
  try {
    const url = new URL(input);
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username ||
      url.password
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
