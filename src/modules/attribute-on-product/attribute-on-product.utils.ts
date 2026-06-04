import { v7 as uuidv7 } from "uuid";
import type { z } from "zod/v4";

import { attributeOnProductAccessors } from "~/src/modules/attribute-on-product/attribute-on-product.accessors";
import type { attributeOnProduct } from "~/src/modules/attribute-on-product/attribute-on-product.schema";
import type { attributeOnProductZodSchemas } from "~/src/modules/attribute-on-product/attribute-on-product.zod";
import { productAttributeAccessors } from "~/src/modules/product-attribute/product-attribute.accessors";
import type { ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types";
import { parseProductAttributeValueForType } from "~/src/modules/product-attribute/product-attribute.utils";

const EMPTY_LENGTH = 0;

type AttributeOnProductRow = z.infer<(typeof attributeOnProductZodSchemas)["row"]>;

export function normalizeAttributeOnProductRows(
  productId: string,
  rows: AttributeOnProductRow[],
  productAttributes: readonly ProductAttribute["select"][]
): (typeof attributeOnProduct.$inferInsert)[] {
  const productAttributeById = new Map(productAttributes.map((entry) => [entry.id, entry]));

  return rows.map((row, index) => {
    const definition = productAttributeById.get(row.attributeId);
    const type = definition?.type ?? "text";
    return {
      attributeId: row.attributeId,
      id: row.id ?? uuidv7(),
      productId,
      rank: row.rank ?? index,
      value: parseProductAttributeValueForType(type, row.value, definition?.allowedValues)
    };
  });
}

export async function replaceAttributesForProduct(productId: string, rows: readonly AttributeOnProductRow[]): Promise<void> {
  const productAttributes =
    rows.length === EMPTY_LENGTH
      ? []
      : await productAttributeAccessors.getAdminProductAttributesQuery
          .execute()
          .then((all) => all.filter((entry) => rows.some((row) => row.attributeId === entry.id)));

  const normalized = normalizeAttributeOnProductRows(productId, [...rows], productAttributes);

  await attributeOnProductAccessors.deleteByProductId(productId);
  await attributeOnProductAccessors.insertRows(normalized);
}
