import { createServerFn } from "@tanstack/react-start";
import { v7 as uuidv7 } from "uuid";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { categoryAccessors } from "~/src/modules/category/category.accessors";
import { CATEGORY_ERROR_CODES } from "~/src/modules/category/category.constants";
import type { Category } from "~/src/modules/category/category.types";
import { normalizeCategoryParentId, wouldCreateCategoryParentCycle } from "~/src/modules/category/category.utils";
import { categoryZodSchemas } from "~/src/modules/category/category.zod";

const ZERO_COUNT = 0;

/** Assigns 0-based ranks per parent group, preserving each group's order in `orderedIds`. */
function buildCategoryRankUpdates(
  orderedIds: readonly string[],
  categoriesById: ReadonlyMap<string, Pick<Category["select"], "id" | "parentId">>
): { id: string; rank: number }[] {
  const groups = new Map<string | undefined, string[]>();

  for (const id of orderedIds) {
    const row = categoriesById.get(id);
    if (row !== undefined) {
      const parentKey = normalizeCategoryParentId(row.parentId);
      const group = groups.get(parentKey);
      if (group === undefined) {
        groups.set(parentKey, [id]);
      } else {
        group.push(id);
      }
    }
  }

  const updates: { id: string; rank: number }[] = [];
  for (const ids of groups.values()) {
    ids.forEach((id, index) => {
      updates.push({ id, rank: index });
    });
  }

  return updates;
}

function toCategoryRow(input: Category["createInput"], id: string, rank: number): Category["insert"] {
  return {
    description: input.description,
    handle: input.handle,
    id,
    image: input.image === "" ? undefined : input.image,
    parentId: input.parentId === "" ? undefined : input.parentId,
    rank,
    shortDescription: input.shortDescription === "" ? undefined : input.shortDescription,
    status: input.status,
    subtitle: input.subtitle === "" ? undefined : input.subtitle,
    title: input.title
  };
}

function normalizeParentId(parentId: string | undefined): string | undefined {
  return parentId === undefined || parentId === "" ? undefined : parentId;
}

const createCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const existing = await categoryAccessors.getCategoryByHandleQuery.execute({
      handle: data.handle
    });
    if (existing !== undefined) {
      throw new Error(CATEGORY_ERROR_CODES.DUPLICATE_HANDLE);
    }

    const parentId = normalizeParentId(data.parentId);
    if (parentId !== undefined) {
      const rows = await categoryAccessors.getCategoriesByIds([parentId]);
      if (rows.length === ZERO_COUNT) {
        throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT);
      }
    }

    const nextRank = await categoryAccessors.getNextRankForParent(parentId);
    const id = uuidv7();
    await categoryAccessors.insertCategory(toCategoryRow(data, id, nextRank));

    return { handle: data.handle, id };
  });

const reorderCategoriesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin();

    const categories = await categoryAccessors.getAdminCategoriesQuery.execute();
    const categoriesById = new Map(categories.map((row) => [row.id, row]));
    const updates = buildCategoryRankUpdates(orderedIds, categoriesById);
    await categoryAccessors.setCategoryRanks(updates);

    return { ok: true };
  });

const deleteCategoriesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin();

    const childCount = await categoryAccessors.countChildCategories(ids);
    if (childCount > ZERO_COUNT) {
      throw new Error(CATEGORY_ERROR_CODES.HAS_CHILDREN);
    }

    const productCount = await categoryAccessors.countProductsForCategories(ids);
    if (productCount > ZERO_COUNT) {
      throw new Error(CATEGORY_ERROR_CODES.HAS_PRODUCTS);
    }

    await categoryAccessors.deleteCategories(ids);

    return { deleted: ids.length, ok: true };
  });

const updateCategoryFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categoryZodSchemas.updateInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const existing = await categoryAccessors.getCategoryByHandleQuery.execute({
      handle: data.handle
    });
    if (existing !== undefined && existing.id !== data.id) {
      throw new Error(CATEGORY_ERROR_CODES.DUPLICATE_HANDLE);
    }

    const parentId = normalizeParentId(data.parentId);
    if (parentId === data.id) {
      throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT);
    }

    if (parentId !== undefined) {
      const categories = await categoryAccessors.getAdminCategoriesQuery.execute();
      const categoriesById = new Map(categories.map((row) => [row.id, row]));

      if (!categoriesById.has(parentId)) {
        throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT);
      }

      if (wouldCreateCategoryParentCycle(data.id, parentId, categoriesById)) {
        throw new Error(CATEGORY_ERROR_CODES.INVALID_PARENT);
      }
    }

    const { description, handle, id, image, shortDescription, status, subtitle, title } = data;

    await categoryAccessors.updateCategory(id, {
      description,
      handle,
      image: image === "" ? undefined : image,
      parentId,
      shortDescription: shortDescription === "" ? undefined : shortDescription,
      status,
      subtitle: subtitle === "" ? undefined : subtitle,
      title
    });

    return { handle, id };
  });

export const categoryMutations = {
  createCategoryFn,
  deleteCategoriesFn,
  reorderCategoriesFn,
  updateCategoryFn
};
