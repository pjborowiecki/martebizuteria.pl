import { type SQL, and, asc, desc, eq, inArray, ne, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { buildAdminNumericFilterSql } from "~/src/modules/_core/utils/column-filters.server"
import { buildAdminDateTimeFilterSql } from "~/src/modules/_core/utils/datetime-column-filter.server"
import { type ListPaginationParams, sortRowsByIdOrder } from "~/src/modules/_core/utils/pagination"
import {
  buildAdminSearchOrCondition,
  containsAdminSearchTerm,
  localizedTextColumns,
  normalizeAdminSearchTerm,
} from "~/src/modules/_core/utils/search-conditions.server"
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import {
  getProductVariantSkuRowsQuery,
  getProductVariantStatsQuery,
  productVariantStatsSubquery,
} from "~/src/modules/product/product.accessors"
import {
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD,
  PRODUCT_STATUS,
  PRODUCT_TABLE_COLUMN_ID,
  PRODUCT_VARIANT_KIND,
  type ProductInventoryLevel,
  type ProductStatus,
  type ProductVariantKind,
} from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import { type AdminProductsListSort, type Product } from "~/src/modules/product/product.types"
import {
  adminProductsListSortRequiresVariantStats,
  buildSkuSummaryByProductId,
  buildVariantStatsByProductId,
} from "~/src/modules/product/product.utils"

export interface AdminProductsListParams extends ListPaginationParams {
  readonly categoryId?: string | undefined
  readonly collectionId?: string | undefined
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly inventoryLevel?: ProductInventoryLevel | undefined
  readonly minPrice?: NumericColumnFilterValue | undefined
  readonly search?: string | undefined
  readonly sort?: AdminProductsListSort | undefined
  readonly status?: ProductStatus | undefined
  readonly timeZone: string
  readonly totalStock?: NumericColumnFilterValue | undefined
  readonly variantKind?: ProductVariantKind | undefined
}

export type AdminProductsExportListParams = Omit<AdminProductsListParams, "limit" | "offset">

const buildAdminProductSearchCondition = (search: string | undefined): SQL | undefined => {
  const normalized = normalizeAdminSearchTerm(search)
  if (normalized === undefined) {
    return undefined
  }

  const textMatch = buildAdminSearchOrCondition(normalized, [
    product.handle,
    product.id,
    ...localizedTextColumns(product.titles),
    ...localizedTextColumns(product.subtitles),
    ...localizedTextColumns(product.descriptions),
  ])

  const skuMatch = inArray(
    product.id,
    db
      .select({
        id: productVariant.productId,
      })
      .from(productVariant)
      .where(containsAdminSearchTerm(productVariant.sku, normalized)),
  )

  return or(textMatch, skuMatch)
}

export const buildAdminVariantKindFilterSql = (variantKind: ProductVariantKind | undefined, variantCountColumn: SQL): SQL | undefined => {
  if (variantKind === undefined) {
    return undefined
  }

  if (variantKind === PRODUCT_VARIANT_KIND.MULTI) {
    return sql`coalesce(${variantCountColumn}, 0) > ${PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD}`
  }

  return sql`coalesce(${variantCountColumn}, 0) <= ${PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD}`
}

const adminProductsListNeedsVariantStatsJoin = (
  params: Pick<AdminProductsListParams, "inventoryLevel" | "sort" | "variantKind">,
): boolean =>
  params.inventoryLevel !== undefined || params.variantKind !== undefined || adminProductsListSortRequiresVariantStats(params.sort)

const buildAdminProductsOrderClauses = (
  sort: AdminProductsListSort | undefined,
  variantStats: ReturnType<typeof productVariantStatsSubquery> | undefined,
) => {
  if (sort === undefined) {
    return [desc(product.updatedAt)]
  }

  const direction = sort.desc ? desc : asc
  switch (sort.columnId) {
    case PRODUCT_TABLE_COLUMN_ID.title: {
      return [direction(product.handle)]
    }
    case PRODUCT_TABLE_COLUMN_ID.recordId: {
      return [direction(product.id)]
    }
    case PRODUCT_TABLE_COLUMN_ID.status: {
      return [direction(product.status)]
    }
    case PRODUCT_TABLE_COLUMN_ID.minPrice: {
      return [direction(sql`coalesce(${variantStats!.minPrice}, 0)`)]
    }
    case PRODUCT_TABLE_COLUMN_ID.stock: {
      return [direction(sql`coalesce(${variantStats!.totalStock}, 0)`)]
    }
    case PRODUCT_TABLE_COLUMN_ID.variantKind: {
      return [direction(sql`coalesce(${variantStats!.variantCount}, 0)`)]
    }
    case PRODUCT_TABLE_COLUMN_ID.createdAt: {
      return [direction(product.createdAt)]
    }
    case PRODUCT_TABLE_COLUMN_ID.editedAt: {
      return [direction(product.updatedAt)]
    }
    default: {
      return [desc(product.updatedAt)]
    }
  }
}

const loadAdminProductRowsByIds = async (ids: readonly string[]) => {
  if (ids.length === 0) {
    return []
  }

  const rows = await db.query.product.findMany({
    where: inJsonList(product.id, ids),
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
        with: {
          productAttribute: {
            columns: {
              titles: true,
            },
          },
        },
      },
      categories: {
        with: {
          productCategory: {
            columns: {
              titles: true,
            },
          },
        },
      },
      collections: {
        with: {
          productCollection: {
            columns: {
              titles: true,
            },
          },
        },
      },
    },
  })

  return sortRowsByIdOrder(rows, ids)
}

const buildInventoryLevelStockCondition = (level: ProductInventoryLevel, totalStock: SQL<number>): SQL => {
  const stock = totalStock
  if (level === PRODUCT_INVENTORY_LEVEL.OUT) {
    return and(eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`${stock} <= 0`)!
  }

  if (level === PRODUCT_INVENTORY_LEVEL.LOW) {
    return and(eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`${stock} > 0`, sql`${stock} <= ${PRODUCT_LOW_STOCK_THRESHOLD}`)!
  }

  return or(ne(product.status, PRODUCT_STATUS.PUBLISHED), sql`${stock} > ${PRODUCT_LOW_STOCK_THRESHOLD}`)!
}

type AdminProductsFilterParams = Pick<
  AdminProductsListParams,
  "categoryId" | "collectionId" | "createdAt" | "search" | "status" | "timeZone"
>

const buildAdminProductsWhere = (params: AdminProductsFilterParams): SQL | undefined => {
  const conditions: SQL[] = []
  const searchCondition = buildAdminProductSearchCondition(params.search)
  if (searchCondition !== undefined) {
    conditions.push(searchCondition)
  }

  if (params.status !== undefined) {
    conditions.push(eq(product.status, params.status))
  }

  if (params.createdAt !== undefined) {
    conditions.push(buildAdminDateTimeFilterSql(product.createdAt, params.createdAt, params.timeZone))
  }

  if (params.categoryId !== undefined) {
    const productIdsInCategory = db
      .select({
        id: categoryOnProduct.productId,
      })
      .from(categoryOnProduct)
      .where(eq(categoryOnProduct.categoryId, params.categoryId))
    conditions.push(inArray(product.id, productIdsInCategory))
  }

  if (params.collectionId !== undefined) {
    const productIdsInCollection = db
      .select({
        id: collectionOnProduct.productId,
      })
      .from(collectionOnProduct)
      .where(eq(collectionOnProduct.collectionId, params.collectionId))
    conditions.push(inArray(product.id, productIdsInCollection))
  }

  return and(...conditions)
}

const selectAdminProductIds = (options: {
  readonly combinedWhere: SQL | undefined
  readonly needsVariantStatsJoin: boolean
  readonly orderClauses: ReturnType<typeof buildAdminProductsOrderClauses>
  readonly slice: Pick<ListPaginationParams, "limit" | "offset"> | undefined
  readonly variantStats: ReturnType<typeof productVariantStatsSubquery>
}) => {
  const base = options.needsVariantStatsJoin
    ? db
        .select({
          id: product.id,
        })
        .from(product)
        .leftJoin(options.variantStats, eq(options.variantStats.productId, product.id))
    : db
        .select({
          id: product.id,
        })
        .from(product)
  const ordered = base.where(options.combinedWhere).orderBy(...options.orderClauses)
  if (options.slice === undefined) {
    return ordered
  }

  return ordered.limit(options.slice.limit).offset(options.slice.offset)
}

const queryAdminProducts = async (
  params: AdminProductsExportListParams,
  slice?: Pick<ListPaginationParams, "limit" | "offset">,
): Promise<{
  readonly rows: Awaited<ReturnType<typeof loadAdminProductRowsByIds>>
  readonly total: number
}> => {
  const variantStats = productVariantStatsSubquery()
  const needsVariantStatsJoin =
    adminProductsListNeedsVariantStatsJoin(params) || params.minPrice !== undefined || params.totalStock !== undefined
  const whereClause = buildAdminProductsWhere(params)

  let combinedWhere = whereClause
  if (needsVariantStatsJoin) {
    const joinedStock = sql<number>`coalesce(${variantStats.totalStock}, 0)`
    const stockCondition =
      params.inventoryLevel === undefined ? undefined : buildInventoryLevelStockCondition(params.inventoryLevel, joinedStock)
    const minPriceCondition =
      params.minPrice === undefined ? undefined : buildAdminNumericFilterSql(sql`coalesce(${variantStats.minPrice}, 0)`, params.minPrice)
    const totalStockCondition = params.totalStock === undefined ? undefined : buildAdminNumericFilterSql(joinedStock, params.totalStock)
    const variantKindCondition = buildAdminVariantKindFilterSql(params.variantKind, sql`coalesce(${variantStats.variantCount}, 0)`)
    const joinConditions = [whereClause, stockCondition, minPriceCondition, totalStockCondition, variantKindCondition].filter(
      (condition): condition is SQL => condition !== undefined,
    )
    combinedWhere = joinConditions.length === 0 ? undefined : and(...joinConditions)
  }

  const orderClauses = buildAdminProductsOrderClauses(params.sort, needsVariantStatsJoin ? variantStats : undefined)
  const countQuery = needsVariantStatsJoin
    ? db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(product)
        .leftJoin(variantStats, eq(variantStats.productId, product.id))
    : db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(product)
  const [[countRow], idRows] = await Promise.all([
    countQuery.where(combinedWhere),
    selectAdminProductIds({
      combinedWhere,
      needsVariantStatsJoin,
      orderClauses,
      slice,
      variantStats,
    }),
  ])

  const ids = idRows.map((row) => row.id)
  const rows = await loadAdminProductRowsByIds(ids)

  return {
    rows,
    total: countRow?.count ?? 0,
  }
}

export const getAdminProductsPage = (params: AdminProductsListParams) =>
  queryAdminProducts(params, {
    limit: params.limit,
    offset: params.offset,
  })

export const getAdminProductsFilteredList = async (params: AdminProductsExportListParams) => {
  const { rows } = await queryAdminProducts(params)

  return rows
}

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
  timeZone: string,
): Pick<
  AdminProductsExportListParams,
  | "categoryId"
  | "collectionId"
  | "createdAt"
  | "inventoryLevel"
  | "minPrice"
  | "search"
  | "sort"
  | "status"
  | "timeZone"
  | "totalStock"
  | "variantKind"
> => ({
  categoryId: input.categoryId,
  collectionId: input.collectionId,
  createdAt: input.createdAt,
  inventoryLevel: input.inventoryLevel,
  minPrice: input.minPrice,
  search: normalizeAdminSearchTerm(input.search),
  sort: input.sort,
  status: input.status,
  timeZone,
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
