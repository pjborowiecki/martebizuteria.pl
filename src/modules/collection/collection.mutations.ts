import { createServerFn } from "@tanstack/react-start";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { collectionAccessors } from "~/src/modules/collection/collection.accessors";
import { COLLECTION_ERROR_CODES } from "~/src/modules/collection/collection.constants";
import type { Collection } from "~/src/modules/collection/collection.types";
import { collectionZodSchemas } from "~/src/modules/collection/collection.zod";

const NO_RANK = -1;
const RANK_STEP = 1;

/** Maps the validated form payload onto a `collection` row. */
function toCollectionRow(input: Collection["createInput"], id: string, rank: number): Collection["insert"] {
  return {
    description: input.description,
    handle: input.handle,
    id,
    image: input.image === "" ? undefined : input.image,
    rank,
    status: input.status,
    title: input.title
  };
}

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

    // Append new collections to the end of the manual order.
    const [maxRank] = await collectionAccessors.getMaxRankQuery.execute();
    const nextRank = (maxRank?.value ?? NO_RANK) + RANK_STEP;

    const id = crypto.randomUUID();
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

    const { description, handle, id, image, status, title } = data;

    await collectionAccessors.updateCollection(id, {
      description,
      handle,
      image: image === "" ? undefined : image,
      status,
      title
    });

    return { handle, id };
  });

export const collectionMutations = {
  createCollectionFn,
  deleteCollectionsFn,
  reorderCollectionsFn,
  updateCollectionFn
};
