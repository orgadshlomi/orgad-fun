export function parseStartParam(text: string): string | null {
  const match = text.match(/^\/start(?:\s+(\S+))?$/)
  if (!match || !match[1]) return null
  return match[1]
}
