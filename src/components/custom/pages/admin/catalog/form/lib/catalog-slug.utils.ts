/** Live slug field — keeps a trailing hyphen while the user is still typing. */
export function normalizeSlugInput(value: string): string {
  return value
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^a-z0-9-]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replace(/^-+/u, "");
}

/** Final slug normalization (auto-sync from title, blur, submit). */
export function slugify(value: string): string {
  return normalizeSlugInput(value.trim()).replace(/-+$/u, "");
}
