import type { Category } from "~/src/modules/category/category.types";

/** Maps a list row into the shared create/edit form shape. */
export function adminListItemToFormValues(category: Category["adminListItem"]): Category["formValues"] {
  return {
    description: category.description ?? "",
    handle: category.handle,
    image: category.image ?? "",
    parentId: category.parentId ?? "",
    shortDescription: category.shortDescription ?? "",
    status: category.status,
    subtitle: category.subtitle ?? "",
    title: category.title
  };
}

/** Normalizes free text into a lowercase, hyphen-separated url slug. */
export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      // Polish "ł" has no combining-mark decomposition, so transliterate it explicitly
      // (already lowercased above, so "Ł" is covered too).
      .replaceAll("ł", "l")
      // Decompose accented letters (ą, ć, ę, ń, ó, ś, ź, ż, …) and drop the diacritics,
      // so "ś" becomes "s" instead of being stripped entirely.
      .normalize("NFD")
      .replaceAll(/[\u0300-\u036F]/gu, "")
      .replaceAll(/[^a-z0-9]+/gu, "-")
      .replaceAll(/(^-|-$)/gu, "")
  );
}
