import { createServerFn } from "@tanstack/react-start";
import { v7 as uuidv7 } from "uuid";

import { assertAdmin } from "~/src/integrations/better-auth/auth.assertions";

import { scheduleProductAttributeCatalogInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server";

import { attributeOnProductAccessors } from "~/src/modules/attribute-on-product/attribute-on-product.accessors";
import {
  recordCatalogAttributeCreatedAudit,
  recordCatalogAttributeDeletedAudit,
  recordCatalogAttributeUpdatedAudit,
  resolveAuthAuditActor
} from "~/src/modules/audit-log/audit-log.events.server";
import { resolveRequestAuditIp } from "~/src/modules/audit-log/audit-log.record.server";
import { productAttributeAccessors } from "~/src/modules/product-attribute/product-attribute.accessors";
import {
  PRODUCT_ATTRIBUTE_ERROR_CODES,
  productAttributeTypeUsesAllowedValues
} from "~/src/modules/product-attribute/product-attribute.constants";
import type { ProductAttributeAllowedValue } from "~/src/modules/product-attribute/product-attribute.types";
import { normalizeProductAttributeLocaleMapForSave } from "~/src/modules/product-attribute/product-attribute.utils";
import { productAttributeZodSchemas } from "~/src/modules/product-attribute/product-attribute.zod";

const ZERO_COUNT = 0;

function normalizeAllowedValuesForSave(allowedValues: ProductAttributeAllowedValue[]): ProductAttributeAllowedValue[] {
  return allowedValues.map((entry) => ({
    labels: normalizeProductAttributeLocaleMapForSave(entry.labels),
    value: entry.value
  }));
}

const createProductAttributeFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productAttributeZodSchemas.createInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const existing = await productAttributeAccessors.getProductAttributeByHandleQuery.execute({ handle: data.handle });
    if (existing !== undefined) {
      throw new Error(PRODUCT_ATTRIBUTE_ERROR_CODES.DUPLICATE_HANDLE);
    }

    const id = uuidv7();
    const rank = await productAttributeAccessors.getNextProductAttributeRank();
    await productAttributeAccessors.insertProductAttribute({
      allowedValues: productAttributeTypeUsesAllowedValues(data.type) ? normalizeAllowedValuesForSave(data.allowedValues) : undefined,
      handle: data.handle,
      id,
      rank,
      titles: normalizeProductAttributeLocaleMapForSave(data.titles),
      type: data.type,
      unit: data.unit === "" ? undefined : data.unit
    });

    scheduleProductAttributeCatalogInvalidation();
    recordCatalogAttributeCreatedAudit(data.handle, { resourceId: id });

    return { handle: data.handle, id };
  });

const updateProductAttributeFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productAttributeZodSchemas.updateInput.parse(data))
  .handler(async ({ data }) => {
    await assertAdmin();

    const existing = await productAttributeAccessors.getProductAttributeByHandleQuery.execute({ handle: data.handle });
    if (existing !== undefined && existing.id !== data.id) {
      throw new Error(PRODUCT_ATTRIBUTE_ERROR_CODES.DUPLICATE_HANDLE);
    }

    await productAttributeAccessors.updateProductAttribute(data.id, {
      allowedValues: productAttributeTypeUsesAllowedValues(data.type) ? normalizeAllowedValuesForSave(data.allowedValues) : undefined,
      handle: data.handle,
      titles: normalizeProductAttributeLocaleMapForSave(data.titles),
      type: data.type,
      unit: data.unit === "" ? undefined : data.unit
    });

    scheduleProductAttributeCatalogInvalidation();
    recordCatalogAttributeUpdatedAudit(data.handle, { resourceId: data.id });

    return { handle: data.handle, id: data.id };
  });

const deleteProductAttributesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productAttributeZodSchemas.deleteInput.parse(data))
  .handler(async ({ data: ids }) => {
    const adminUser = await assertAdmin();
    const auditActor = resolveAuthAuditActor(adminUser);
    const auditIp = resolveRequestAuditIp();

    const usageCount = await attributeOnProductAccessors.countForAttributeIds(ids);
    if (usageCount > ZERO_COUNT) {
      throw new Error(PRODUCT_ATTRIBUTE_ERROR_CODES.IN_USE);
    }

    const attributes = await productAttributeAccessors.getProductAttributesByIds(ids);

    await productAttributeAccessors.deleteProductAttributes(ids);

    scheduleProductAttributeCatalogInvalidation();
    for (const attribute of attributes) {
      recordCatalogAttributeDeletedAudit(attribute.handle, {
        actor: auditActor,
        ip: auditIp,
        metadata: { handle: attribute.handle },
        resourceId: attribute.id
      });
    }

    return { deleted: ids.length, ok: true };
  });

const reorderProductAttributesFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => productAttributeZodSchemas.reorderInput.parse(data))
  .handler(async ({ data: orderedIds }) => {
    await assertAdmin();

    const updates = orderedIds.map((id, rank) => ({ id, rank }));
    await productAttributeAccessors.setProductAttributeRanks(updates);

    scheduleProductAttributeCatalogInvalidation();

    return { ok: true };
  });

export const productAttributeMutations = {
  createProductAttributeFn,
  deleteProductAttributesFn,
  reorderProductAttributesFn,
  updateProductAttributeFn
};
