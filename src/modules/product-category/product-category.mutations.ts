import { createServerFn } from "@tanstack/react-start";
import { v7 as uuidv7 } from "uuid";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { categoryOnProductAccessors } from "~/src/modules/category-on-product/category-on-product.accessors";
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils";
import { categoryAccessors } from "~/src/modules/product-category/product-category.accessors";
import { CATEGORY_ERROR_CODES } from "~/src/modules/product-category/product-category.constants";
import {
  buildCategoryRankUpdates,
  normalizeCategoryParentIdForMutation,
  normalizeOptionalCategoryLocaleMapForSave,
  toCategoryRow,
  wouldCreateCategoryParentCycle
} from "~/src/modules/product-category/product-category.utils";
import { categoryZodSchemas } from "~/src/modules/product-category/product-category.zod";

const ZERO_COUNT = 0;

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

    const parentId = normalizeCategoryParentIdForMutation(data.parentId);
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

    const productCount = await categoryOnProductAccessors.countProductsForCategories(ids);
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

    const parentId = normalizeCategoryParentIdForMutation(data.parentId);
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

    const { descriptions, handle, id, image, shortDescriptions, status, subtitles, titles } = data;

    await categoryAccessors.updateCategory(id, {
      descriptions: normalizeOptionalCategoryLocaleMapForSave(descriptions),
      handle,
      image: image === "" ? undefined : image,
      parentId,
      shortDescriptions: normalizeOptionalCategoryLocaleMapForSave(shortDescriptions),
      status,
      subtitles: normalizeOptionalCategoryLocaleMapForSave(subtitles),
      titles: normalizeProductAttributeLocaleMapForSave(titles)
    });

    return { handle, id };
  });

export const categoryMutations = {
  createCategoryFn,
  deleteCategoriesFn,
  reorderCategoriesFn,
  updateCategoryFn
};
