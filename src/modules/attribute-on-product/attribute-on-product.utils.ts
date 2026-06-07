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

interface NormalizeAttributeOnProductRowsInput {
  readonly productAttributes: readonly ProductAttribute["select"][];
  readonly productId: string;
  readonly rows: AttributeOnProductRow[];
  readonly variantId?: string;
}

export function normalizeAttributeOnProductRows(input: NormalizeAttributeOnProductRowsInput): (typeof attributeOnProduct.$inferInsert)[] {
  const { productAttributes, productId, rows, variantId } = input;
  const productAttributeById = new Map(productAttributes.map((entry) => [entry.id, entry]));

  return rows.map((row, index) => {
    const definition = productAttributeById.get(row.attributeId);
    const type = definition?.type ?? "text";
    return {
      attributeId: row.attributeId,
      id: row.id ?? uuidv7(),
      productId,
      rank: row.rank ?? index,
      value: parseProductAttributeValueForType(type, row.value, definition?.allowedValues),
      variantId
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

  const normalized = normalizeAttributeOnProductRows({ productAttributes, productId, rows: [...rows] });

  await attributeOnProductAccessors.deleteByProductId(productId);
  await attributeOnProductAccessors.insertRows(normalized);
}

interface VariantAttributeReplaceGroup {
  readonly rows: readonly AttributeOnProductRow[];
  readonly variantId: string;
}

export async function replaceAllAttributesForProduct(
  productId: string,
  productLevelRows: readonly AttributeOnProductRow[],
  variantGroups: readonly VariantAttributeReplaceGroup[]
): Promise<void> {
  const variantRows = variantGroups.flatMap((group) => group.rows);
  const allRows = [...productLevelRows, ...variantRows];

  const productAttributes =
    allRows.length === EMPTY_LENGTH
      ? []
      : await productAttributeAccessors.getAdminProductAttributesQuery
          .execute()
          .then((all) => all.filter((entry) => allRows.some((row) => row.attributeId === entry.id)));

  const normalized = [
    ...normalizeAttributeOnProductRows({ productAttributes, productId, rows: [...productLevelRows] }),
    ...variantGroups.flatMap((group) =>
      normalizeAttributeOnProductRows({
        productAttributes,
        productId,
        rows: [...group.rows],
        variantId: group.variantId
      })
    )
  ];

  await attributeOnProductAccessors.deleteByProductId(productId);

  if (normalized.length > EMPTY_LENGTH) {
    await attributeOnProductAccessors.insertRows(normalized);
  }
}
