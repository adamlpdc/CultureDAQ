/** Normalize asset titles for fuzzy provider matching. */
export function normalizeTitle(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/&/g, "and")
    .replace(/['']/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function extractYear(name: string): number | null {
  const match = name.match(/\((19|20)\d{2}\)/);
  return match ? parseInt(match[0].replace(/\D/g, ""), 10) : null;
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.92;

  const aTokens = new Set(na.split(" ").filter(Boolean));
  const bTokens = new Set(nb.split(" ").filter(Boolean));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let overlap = 0;
  for (const t of aTokens) {
    if (bTokens.has(t)) overlap++;
  }
  const union = new Set([...aTokens, ...bTokens]).size;
  return overlap / union;
}
