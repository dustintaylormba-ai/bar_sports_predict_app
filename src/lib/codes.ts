export function normalizeGameCode(input: unknown) {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}
