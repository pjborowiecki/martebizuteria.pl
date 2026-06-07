import { createServerFn } from "@tanstack/react-start";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { productImageAccessors } from "~/src/modules/product-image/product-image.accessors";
import { replaceProductImages, syncThumbnailsForProductIds } from "~/src/modules/product-image/product-image.persist.utils";
import { productImageZodSchemas } from "~/src/modules/product-image/product-image.zod";

const EMPTY_LENGTH = 0;

async function setProductImageRanks(updates: { id: string; rank: number }[]): Promise<void> {
  if (updates.length === EMPTY_LENGTH) {
    return;
  }

  await Promise.all(updates.map((entry) => productImageAccessors.updateRank(entry.id, entry.rank)));

  const productIds = await productImageAccessors.getProductIdsForImageIds(updates.map((entry) => entry.id));
  await syncThumbnailsForProductIds(productIds);
}

const reorderProductImagesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productImageZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin();

    const updates = orderedIds.map((id, rank) => ({ id, rank }));
    await setProductImageRanks(updates);

    return { ok: true };
  });

const replaceProductImagesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productImageZodSchemas.replaceForProductInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    await replaceProductImages(data.productId, data.images);

    return { ok: true, productId: data.productId };
  });

export const productImageMutations = {
  reorderProductImagesFn,
  replaceProductImagesFn
};
