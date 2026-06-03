import type { Category } from "~/src/modules/category/category.types";

export function normalizeCategoryParentId(parentId: string | null | undefined): string | undefined {
  if (parentId === null || parentId === "") {
    return undefined;
  }

  return parentId;
}

/** True when assigning `newParentId` would make `categoryId` an ancestor of its own parent (cycle). */
export function wouldCreateCategoryParentCycle(
  categoryId: string,
  newParentId: string,
  categoriesById: ReadonlyMap<string, Pick<Category["select"], "id" | "parentId">>
): boolean {
  let current: string | undefined = newParentId;

  while (current !== undefined) {
    if (current === categoryId) {
      return true;
    }
    current = normalizeCategoryParentId(categoriesById.get(current)?.parentId);
  }

  return false;
}
