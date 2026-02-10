export function normalizeGameCode(input: string) {
  return input.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
