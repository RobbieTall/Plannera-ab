export const launchExampleAddresses = [
  "45 Broken Head Road, Byron Bay NSW 2481",
  "52 Belgrave St, Kempsey NSW 2440",
] as const;

export function buildWorkspaceSeedQuery(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return null;
  return new URLSearchParams({ prompt: trimmed, initialAddress: trimmed }).toString();
}
