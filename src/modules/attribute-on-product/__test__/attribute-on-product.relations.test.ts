import { type One, createTableRelationsHelpers, getTableName } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { attributeOnProduct, attributeOnProductRelations } from "~/src/modules/attribute-on-product/attribute-on-product.schema"

const relations = attributeOnProductRelations.config(createTableRelationsHelpers(attributeOnProduct))

const describeRelation = (relation: One) => ({
  fields: relation.config?.fields.map((field) => field.name) ?? [],
  references: relation.config?.references.map((reference) => reference.name) ?? [],
  target: getTableName(relation.referencedTable),
})

describe("attributeOnProductRelations", () => {
  it("declares exactly the product, attribute and variant sides", () => {
    expect(Object.keys(relations).toSorted()).toStrictEqual(["product", "productAttribute", "variant"])
  })

  it("joins the row to the product it belongs to", () => {
    expect(describeRelation(relations.product)).toStrictEqual({ fields: ["product_id"], references: ["id"], target: "product" })
  })

  it("joins the row to its attribute definition", () => {
    expect(describeRelation(relations.productAttribute)).toStrictEqual({
      fields: ["attribute_id"],
      references: ["id"],
      target: "product_attribute",
    })
  })

  it("joins the row to the variant it narrows, when it has one", () => {
    expect(describeRelation(relations.variant)).toStrictEqual({ fields: ["variant_id"], references: ["id"], target: "product_variant" })
  })

  it("names the table it hangs off", () => {
    expect(getTableName(attributeOnProductRelations.table)).toBe("attribute_on_product")
  })
})
