// Browser-side SHA-256 fingerprinting for manuscript files.
// crypto.subtle.digest is implemented natively (not on the JS main thread),
// so a single 25MB buffer does not lock the UI the way a pure-JS hash loop would.
export async function sha256HexFromFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function hashSnippet(hash: string): string {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}
