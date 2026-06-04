import { createServerFn } from "@tanstack/react-start";
import { v7 as uuidv7 } from "uuid";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { collectionOnProductAccessors } from "~/src/modules/collection-on-product/collection-on-product.accessors";
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils";
import { collectionAccessors } from "~/src/modules/product-collection/product-collection.accessors";
import { COLLECTION_ERROR_CODES } from "~/src/modules/product-collection/product-collection.constants";
import { normalizeOptionalCollectionLocaleMapForSave, toCollectionRow } from "~/src/modules/product-collection/product-collection.utils";
import { collectionZodSchemas } from "~/src/modules/product-collection/product-collection.zod";

const NO_RANK = -1;
const RANK_STEP = 1;
const ZERO_COUNT = 0;

const createCollectionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => collectionZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const existing = await collectionAccessors.getCollectionByHandleQuery.execute({
      handle: data.handle
    });
    if (existing !== undefined) {
      throw new Error(COLLECTION_ERROR_CODES.DUPLICATE_HANDLE);
    }

    const [maxRank] = await collectionAccessors.getMaxRankQuery.execute();
    const nextRank = (maxRank?.value ?? NO_RANK) + RANK_STEP;

    const id = uuidv7();
    await collectionAccessors.insertCollection(toCollectionRow(data, id, nextRank));

    return { handle: data.handle, id };
  });

const reorderCollectionsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => collectionZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin();

    const updates = orderedIds.map((id, index) => ({ id, rank: index }));
    await collectionAccessors.setCollectionRanks(updates);

    return { ok: true };
  });

const deleteCollectionsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => collectionZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin();

    const productCount = await collectionOnProductAccessors.countProductsForCollections(ids);
    if (productCount > ZERO_COUNT) {
      throw new Error(COLLECTION_ERROR_CODES.HAS_PRODUCTS);
    }

    await collectionAccessors.deleteCollections(ids);

    return { deleted: ids.length, ok: true };
  });

const updateCollectionFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => collectionZodSchemas.updateInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const existing = await collectionAccessors.getCollectionByHandleQuery.execute({
      handle: data.handle
    });
    if (existing !== undefined && existing.id !== data.id) {
      throw new Error(COLLECTION_ERROR_CODES.DUPLICATE_HANDLE);
    }

    const { descriptions, handle, id, image, status, titles } = data;

    await collectionAccessors.updateCollection(id, {
      descriptions: normalizeOptionalCollectionLocaleMapForSave(descriptions),
      handle,
      image: image === "" ? undefined : image,
      status,
      titles: normalizeProductAttributeLocaleMapForSave(titles)
    });

    return { handle, id };
  });

export const collectionMutations = {
  createCollectionFn,
  deleteCollectionsFn,
  reorderCollectionsFn,
  updateCollectionFn
};
