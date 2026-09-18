export function parseIntParam(value: string | string[] | undefined): number | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    value = value[0];
  }
  if (!value || typeof value !== 'string') return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}
