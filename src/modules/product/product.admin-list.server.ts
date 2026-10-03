import { asc, desc } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import {
  type AdminProductsExportListParams,
  getProductVariantSkuRowsQuery,
  getProductVariantStatsQuery,
} from "~/src/modules/product/product.accessors"
import { product } from "~/src/modules/product/product.schema"
import { type Product } from "~/src/modules/product/product.types"
import { buildSkuSummaryByProductId, buildVariantStatsByProductId } from "~/src/modules/product/product.utils"

export const loadAdminListAggregates = async (
  products: readonly {
    id: string
  }[],
) => {
  if (products.length === 0) {
    return {
      skuSummaryByProductId: buildSkuSummaryByProductId([]),
      statsByProductId: buildVariantStatsByProductId([]),
    }
  }

  const productIds = JSON.stringify(products.map((row) => row.id))
  const [variantStats, skuRows] = await Promise.all([
    getProductVariantStatsQuery.execute({
      productIds,
    }),
    getProductVariantSkuRowsQuery.execute({
      productIds,
    }),
  ])

  return {
    skuSummaryByProductId: buildSkuSummaryByProductId(skuRows),
    statsByProductId: buildVariantStatsByProductId(variantStats),
  }
}

export const buildAdminProductsFilterParams = (
  input: Product["adminProductsPageInput"] | Product["adminProductsExportInput"],
): Pick<
  AdminProductsExportListParams,
  "categoryId" | "collectionId" | "createdAt" | "inventoryLevel" | "minPrice" | "search" | "sort" | "status" | "totalStock" | "variantKind"
> => ({
  categoryId: input.categoryId,
  collectionId: input.collectionId,
  createdAt: input.createdAt,
  inventoryLevel: input.inventoryLevel,
  minPrice: input.minPrice,
  search: normalizeAdminSearchTerm(input.search),
  sort: input.sort,
  status: input.status,
  totalStock: input.totalStock,
  variantKind: input.variantKind,
})

export const getAdminProductsCatalogList = async () => {
  const products = await db.select().from(product).orderBy(asc(product.rank), desc(product.createdAt))
  if (products.length === 0) {
    return []
  }

  const [attributeRows, categoryRows, collectionRows] = await Promise.all([
    db.query.attributeOnProduct.findMany({
      orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
      with: {
        productAttribute: {
          columns: {
            titles: true,
          },
        },
      },
    }),
    db.query.categoryOnProduct.findMany({
      with: {
        productCategory: {
          columns: {
            titles: true,
          },
        },
      },
    }),
    db.query.collectionOnProduct.findMany({
      with: {
        productCollection: {
          columns: {
            titles: true,
          },
        },
      },
    }),
  ])

  const attributesByProductId = Object.groupBy(attributeRows, (row) => row.productId)
  const categoriesByProductId = Object.groupBy(categoryRows, (row) => row.productId)
  const collectionsByProductId = Object.groupBy(collectionRows, (row) => row.productId)
  const catalogList = []
  for (const row of products) {
    catalogList.push({
      ...row,
      attributes: attributesByProductId[row.id] ?? [],
      categories: categoriesByProductId[row.id] ?? [],
      collections: collectionsByProductId[row.id] ?? [],
    })
  }

  return catalogList
}
