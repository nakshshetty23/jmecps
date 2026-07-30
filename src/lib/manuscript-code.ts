// Human-facing manuscript code (e.g. "JMECPS-2026-A1B2"), derived on the fly
// from the existing id/created_at rather than stored — there's no counter
// table backing a real sequential number yet, and this only needs to be a
// stable, unique-looking display label.
export function getManuscriptCode(id: string, createdAt: Date): string {
  const shortCode = id.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `JMECPS-${createdAt.getFullYear()}-${shortCode}`;
}
