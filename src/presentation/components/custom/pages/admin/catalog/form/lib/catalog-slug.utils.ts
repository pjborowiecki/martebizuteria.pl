/** Live slug field — keeps a trailing hyphen while the user is still typing. */
export const normalizeSlugInput = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replaceAll(/[\u0300-\u036F]/gu, "")
    .replaceAll(/[^a-z0-9-]+/gu, "-")
    .replaceAll(/-+/gu, "-")
    .replace(/^-+/u, "")

export const slugify = (value: string): string => normalizeSlugInput(value.trim()).replace(/-+$/u, "")
