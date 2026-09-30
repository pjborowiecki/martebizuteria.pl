import { sql } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { buildAdminVariantKindFilterSql } from "~/src/modules/product/product.admin-list-variant-filters.server"
import { PRODUCT_VARIANT_KIND } from "~/src/modules/product/product.constants"

const dialect = new SQLiteSyncDialect()

const variantCountColumn = sql`variant_count`

describe("buildAdminVariantKindFilterSql", () => {
  it("applies no filter when no variant kind was requested", () => {
    expect(buildAdminVariantKindFilterSql(undefined, variantCountColumn)).toBeUndefined()
  })

  it("keeps only products above the multi variant threshold for the multi kind", () => {
    const fragment = buildAdminVariantKindFilterSql(PRODUCT_VARIANT_KIND.MULTI, variantCountColumn)

    expect(fragment).toBeDefined()
    expect(fragment === undefined ? undefined : dialect.sqlToQuery(fragment)).toStrictEqual({
      params: [1],
      sql: "coalesce(variant_count, 0) > ?",
      typings: ["none"],
    })
  })

  it("keeps only products at or below the threshold for the single kind", () => {
    const fragment = buildAdminVariantKindFilterSql(PRODUCT_VARIANT_KIND.SINGLE, variantCountColumn)

    expect(fragment).toBeDefined()
    expect(fragment === undefined ? undefined : dialect.sqlToQuery(fragment)).toStrictEqual({
      params: [1],
      sql: "coalesce(variant_count, 0) <= ?",
      typings: ["none"],
    })
  })

  it("counts a product with no variant rows at all as single", () => {
    const fragment = buildAdminVariantKindFilterSql(PRODUCT_VARIANT_KIND.SINGLE, variantCountColumn)

    expect(fragment === undefined ? "" : dialect.sqlToQuery(fragment).sql).toContain("coalesce")
  })

  it("embeds whatever column expression the caller supplies", () => {
    const fragment = buildAdminVariantKindFilterSql(PRODUCT_VARIANT_KIND.MULTI, sql`stats.count`)

    expect(fragment === undefined ? "" : dialect.sqlToQuery(fragment).sql).toBe("coalesce(stats.count, 0) > ?")
  })
})
