import { createServerFn } from "@tanstack/react-start";
import { v7 as uuidv7 } from "uuid";
import { z } from "zod/v4";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { tryCatch } from "~/src/lib/_utils/try-catch";
import { scheduleProductCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server";

import { replaceAllAttributesForProduct, replaceAttributesForProduct } from "~/src/modules/attribute-on-product/attribute-on-product.utils";
import {
  recordCatalogProductCreatedAudit,
  recordCatalogProductDeletedAudit,
  recordCatalogProductUpdatedAudit
} from "~/src/modules/audit-log/audit-log.events.server";
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils";
import { replaceProductImages } from "~/src/modules/product-image/product-image.persist.utils";
import { buildProductAuditChange, extractProductAuditSnapshot } from "~/src/modules/product/product-audit.utils";
import { collectSkusFromCatalogInput } from "~/src/modules/product/product-sku.validation.utils";
import { productAccessors } from "~/src/modules/product/product.accessors";
import { PRODUCT_ERROR_CODES, PRODUCT_MIN_LENGTH } from "~/src/modules/product/product.constants";
import { rethrowProductMutationError } from "~/src/modules/product/product.mutation-errors";
import type { Product } from "~/src/modules/product/product.types";
import {
  normalizeOptionalProductLocaleMapForSave,
  normalizeProductTagsLocaleMapForSave,
  prepareCatalogReplacePayload,
  prepareOrganizationReplacePayload,
  toProductDbStatus
} from "~/src/modules/product/product.utils";
import { productZodSchemas } from "~/src/modules/product/product.zod";

const ZERO_VARIANTS = 0;
const NO_RANK = -1;
const RANK_STEP = 1;

function toProductRow(data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>, id: string, rank: number): Product["insert"] {
  return {
    descriptions: normalizeOptionalProductLocaleMapForSave(data.descriptions),
    handle: data.handle,
    id,
    rank,
    status: toProductDbStatus(data.status),
    subtitles: normalizeOptionalProductLocaleMapForSave(data.subtitles),
    tags: normalizeProductTagsLocaleMapForSave(data.tags),
    titles: normalizeProductAttributeLocaleMapForSave(data.titles)
  };
}

async function assertCatalogSkusAvailable(
  catalogInput: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>,
  productId?: string
): Promise<void> {
  const takenSkus = await productAccessors.findTakenSkus(collectSkusFromCatalogInput(catalogInput), productId);
  if (takenSkus.length > ZERO_VARIANTS) {
    throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_SKU);
  }
}

/** Deletes failed create leftovers (product row without variants) so the same slug can be retried. */
async function deleteOrphanProductByHandle(handle: string): Promise<boolean> {
  const existing = await productAccessors.getProductByHandleQuery.execute({ handle });
  if (existing === undefined) {
    return false;
  }

  if (existing.variants.length > ZERO_VARIANTS) {
    return false;
  }

  await productAccessors.deleteProducts([existing.id]);
  return true;
}

async function persistProductCatalog(productId: string, data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>): Promise<void> {
  const organizationPayload = prepareOrganizationReplacePayload(productId, data);
  if (organizationPayload !== undefined) {
    await productAccessors.replaceProductOrganization(productId, organizationPayload);
  }

  await productAccessors.replaceProductCatalog(productId, prepareCatalogReplacePayload(productId, data));
}

async function insertProductWithCatalog(data: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>, id: string): Promise<void> {
  const [maxRank] = await productAccessors.getMaxRankQuery.execute();
  const nextRank = (maxRank?.value ?? NO_RANK) + RANK_STEP;

  try {
    await productAccessors.insertProduct(toProductRow(data, id, nextRank));
    await assertCatalogSkusAvailable(data, id);
    await persistProductCatalog(id, data);
  } catch (error) {
    await tryCatch(productAccessors.deleteProducts([id]));
    throw error;
  }
}

async function persistCreatedProductDetails(
  productId: string,
  data: z.infer<(typeof productZodSchemas)["createCompleteInput"]>
): Promise<void> {
  await replaceProductImages(productId, data.images);
  await replaceAttributesForProduct(productId, data.attributeValues);
}

async function updateProductWithCatalog(
  id: string,
  catalogInput: z.infer<(typeof productZodSchemas)["catalogUpsertInput"]>
): Promise<void> {
  await productAccessors.updateProductRow(id, {
    descriptions: normalizeOptionalProductLocaleMapForSave(catalogInput.descriptions),
    handle: catalogInput.handle,
    status: toProductDbStatus(catalogInput.status),
    subtitles: normalizeOptionalProductLocaleMapForSave(catalogInput.subtitles),
    tags: normalizeProductTagsLocaleMapForSave(catalogInput.tags),
    titles: normalizeProductAttributeLocaleMapForSave(catalogInput.titles)
  });
  await persistProductCatalog(id, catalogInput);
}

async function updateProductRecord(
  data: z.infer<(typeof productZodSchemas)["updateCompleteInput"]>
): Promise<{ handle: string; id: string }> {
  const { attributeValues, id, images, variantAttributeValues, ...catalogInput } = data;

  const existing = await productAccessors.getProductByHandleQuery.execute({ handle: catalogInput.handle });
  if (existing !== undefined && existing.id !== id) {
    throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_HANDLE);
  }

  const beforeProduct = await productAccessors.getAdminProductDetailByIdQuery.execute({ id });
  const beforeSnapshot = beforeProduct === undefined ? undefined : extractProductAuditSnapshot(beforeProduct);

  await assertCatalogSkusAvailable(catalogInput, id);
  await updateProductWithCatalog(id, catalogInput);
  await replaceProductImages(id, images);
  await replaceAllAttributesForProduct(
    id,
    attributeValues,
    variantAttributeValues.map((group) => ({ rows: group.values, variantId: group.variantId }))
  );

  const afterProduct = await productAccessors.getAdminProductDetailByIdQuery.execute({ id });
  const auditChange = afterProduct === undefined ? {} : buildProductAuditChange(beforeSnapshot, extractProductAuditSnapshot(afterProduct));

  scheduleProductCatalogInvalidation();
  recordCatalogProductUpdatedAudit(catalogInput.handle, {
    detail: auditChange.detail,
    metadata: auditChange.metadata,
    resourceId: id
  });

  return { handle: catalogInput.handle, id };
}

async function createProductAttempt(
  data: z.infer<(typeof productZodSchemas)["createCompleteInput"]>,
  allowRetry: boolean
): Promise<{ handle: string; id: string }> {
  const id = uuidv7();

  try {
    await insertProductWithCatalog(data, id);
    await persistCreatedProductDetails(id, data);
    return { handle: data.handle, id };
  } catch (error) {
    await tryCatch(productAccessors.deleteProducts([id]));

    if (allowRetry && (await deleteOrphanProductByHandle(data.handle))) {
      return createProductAttempt(data, false);
    }

    rethrowProductMutationError(error);
  }
}

async function createProductRecord(
  data: z.infer<(typeof productZodSchemas)["createCompleteInput"]>
): Promise<{ handle: string; id: string }> {
  await deleteOrphanProductByHandle(data.handle);
  return createProductAttempt(data, true);
}

const createProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    await deleteOrphanProductByHandle(data.handle);

    const id = uuidv7();

    const [, error] = await tryCatch(insertProductWithCatalog(data, id));
    if (error !== undefined) {
      rethrowProductMutationError(error);
    }

    scheduleProductCatalogInvalidation();
    recordCatalogProductCreatedAudit(data.handle, { resourceId: id });

    return { handle: data.handle, id };
  });

const createProductCompleteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productZodSchemas.createCompleteInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const result = await createProductRecord(data);
    scheduleProductCatalogInvalidation();
    recordCatalogProductCreatedAudit(result.handle, { resourceId: result.id });
    return result;
  });

const updateProductFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productZodSchemas.update.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const { id, ...catalogInput } = data;

    const existing = await productAccessors.getProductByHandleQuery.execute({ handle: catalogInput.handle });
    if (existing !== undefined && existing.id !== id) {
      throw new Error(PRODUCT_ERROR_CODES.DUPLICATE_HANDLE);
    }

    const beforeProduct = await productAccessors.getAdminProductDetailByIdQuery.execute({ id });
    const beforeSnapshot = beforeProduct === undefined ? undefined : extractProductAuditSnapshot(beforeProduct);

    const [, error] = await tryCatch(updateProductWithCatalog(id, catalogInput));
    if (error !== undefined) {
      rethrowProductMutationError(error);
    }

    const afterProduct = await productAccessors.getAdminProductDetailByIdQuery.execute({ id });
    const auditChange =
      afterProduct === undefined ? {} : buildProductAuditChange(beforeSnapshot, extractProductAuditSnapshot(afterProduct));

    scheduleProductCatalogInvalidation();
    recordCatalogProductUpdatedAudit(catalogInput.handle, {
      detail: auditChange.detail,
      metadata: auditChange.metadata,
      resourceId: id
    });

    return { handle: catalogInput.handle, id };
  });

const updateProductCompleteFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productZodSchemas.updateCompleteInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const [result, error] = await tryCatch(updateProductRecord(data));
    if (error !== undefined) {
      rethrowProductMutationError(error);
    }

    return result!;
  });

const deleteProductsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    await assertAdmin();

    await productAccessors.deleteProducts(ids);

    scheduleProductCatalogInvalidation();
    recordCatalogProductDeletedAudit(ids.join(", "));

    return { deleted: ids.length, ok: true };
  });

const validateProductSkusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        productId: z.string().trim().min(PRODUCT_MIN_LENGTH).optional(),
        skus: z.array(z.string().trim())
      })
      .parse(data)
  )
  .handler(async ({ data }) => {
    await assertAdmin();

    const takenSkus = await productAccessors.findTakenSkus(data.skus, data.productId);
    return { takenSkus };
  });

const reorderProductsFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin();

    const updates = orderedIds.map((id, index) => ({ id, rank: index }));
    await productAccessors.setProductRanks(updates);

    scheduleProductCatalogInvalidation();

    return { ok: true };
  });

export const productMutations = {
  createProductCompleteFn,
  createProductFn,
  deleteProductsFn,
  reorderProductsFn,
  updateProductCompleteFn,
  updateProductFn,
  validateProductSkusFn
};
