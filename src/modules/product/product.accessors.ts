import { type SQL, and, asc, desc, eq, inArray, max, ne, notInArray, or, sql } from "drizzle-orm"

import { type DrizzleBatchStatement, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema"
import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema"
import { productOption } from "~/src/modules/product-option/product-option.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { buildAdminProductSearchCondition } from "~/src/modules/product/product.admin-list-search.server"
import { type AdminProductsListSort, adminProductsListSortRequiresVariantStats } from "~/src/modules/product/product.admin-list-sort"
import { buildAdminVariantKindFilterSql } from "~/src/modules/product/product.admin-list-variant-filters.server"
import {
  PRODUCT_INVENTORY_LEVEL,
  PRODUCT_LOW_STOCK_THRESHOLD,
  PRODUCT_STATUS,
  PRODUCT_STOREFRONT_LIST_LIMIT,
  PRODUCT_TABLE_COLUMN_ID,
  type ProductInventoryLevel,
  type ProductStatus,
  type ProductVariantKind,
} from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import { type ProductCatalogReplacePayload, type ProductOrganizationReplacePayload } from "~/src/modules/product/product.utils"

import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/lib/admin-column-filters"
import { buildAdminDateFilterSql, buildAdminNumericFilterSql } from "~/src/lib/admin-column-filters.server"
import { type ListPaginationParams } from "~/src/lib/list-pagination"

const RELATED_PRODUCTS_LIMIT = 3

const handlePlaceholder = sql.placeholder("handle")

const storefrontListVariantColumns = {
  id: true,
  price: true,
  productId: true,
  title: true,
} as const

const publishedProductHasAvailableStockCondition = (): SQL => sql`(${totalStockSubquery()}) > ${0}`

const publishedInStockWhere = (...extraConditions: (SQL | undefined)[]): SQL => {
  const conditions = [
    eq(product.status, PRODUCT_STATUS.PUBLISHED),
    publishedProductHasAvailableStockCondition(),
    ...extraConditions,
  ].filter((condition): condition is SQL => condition !== undefined)
  return and(...conditions)!
}

const sortProductsByIdOrder = <
  TProduct extends {
    id: string
  },
>(
  items: readonly TProduct[],
  orderedIds: readonly string[],
): TProduct[] => {
  const orderById = new Map(orderedIds.map((id, index) => [id, index]))
  return [...items].toSorted((left, right) => (orderById.get(left.id) ?? 0) - (orderById.get(right.id) ?? 0))
}

export interface AdminProductsListParams extends ListPaginationParams {
  readonly categoryId?: string | undefined
  readonly collectionId?: string | undefined
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly inventoryLevel?: ProductInventoryLevel | undefined
  readonly minPrice?: NumericColumnFilterValue | undefined
  readonly search?: string | undefined
  readonly sort?: AdminProductsListSort | undefined
  readonly status?: ProductStatus | undefined
  readonly totalStock?: NumericColumnFilterValue | undefined
  readonly variantKind?: ProductVariantKind | undefined
}

export type AdminProductsExportListParams = Omit<AdminProductsListParams, "limit" | "offset">

export const getProductVariantStatsQuery = db
  .select({
    minPrice: sql<number | null>`min(${productVariant.price})`,
    productId: productVariant.productId,
    totalStock: sql<number>`coalesce(sum(${inventory.quantityAvailable}), 0)`,
    variantCount: sql<number>`count(${productVariant.id})`,
  })
  .from(productVariant)
  .leftJoin(inventory, eq(inventory.variantId, productVariant.id))
  .where(sql`${productVariant.productId} in (select value from json_each(${sql.placeholder("productIds")}))`)
  .groupBy(productVariant.productId)
  .prepare()

export const getProductVariantSkuRowsQuery = db
  .select({
    productId: productVariant.productId,
    sku: productVariant.sku,
  })
  .from(productVariant)
  .where(sql`${productVariant.productId} in (select value from json_each(${sql.placeholder("productIds")}))`)
  .prepare()

export const getProductStatusCountsQuery = db
  .select({
    active: sql<number>`sum(case when ${product.status} = ${PRODUCT_STATUS.PUBLISHED} then 1 else 0 end)`,
    archived: sql<number>`sum(case when ${product.status} = ${PRODUCT_STATUS.ARCHIVED} then 1 else 0 end)`,
    draft: sql<number>`sum(case when ${product.status} = ${PRODUCT_STATUS.DRAFT} then 1 else 0 end)`,
    total: sql<number>`count(*)`,
  })
  .from(product)
  .prepare()

// NOTE: intentionally NOT a prepared statement — variable-length `IN` on D1/SQLite.
export const getProductsWithInventoryByHandles = (handles: readonly string[]) =>
  db.query.product.findMany({
    where: inArray(product.handle, [...handles]),
    with: {
      variants: {
        with: {
          inventory: true,
        },
      },
    },
  })

export const getPublishedProductsInStock = () =>
  db.query.product.findMany({
    limit: PRODUCT_STOREFRONT_LIST_LIMIT,
    orderBy: (products, { asc: ascOrder, desc: descOrder }) => [ascOrder(products.rank), descOrder(products.createdAt)],
    where: publishedInStockWhere(),
    with: {
      variants: {
        columns: storefrontListVariantColumns,
      },
    },
  })

export const getMaxRankQuery = db
  .select({
    value: max(product.rank),
  })
  .from(product)
  .prepare()

/** Admin / checkout: any status by handle. */
export const getProductByHandleQuery = db.query.product
  .findFirst({
    where: eq(product.handle, handlePlaceholder),
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
      },
      categories: {
        with: {
          productCategory: true,
        },
      },
      collections: {
        with: {
          productCollection: true,
        },
      },
      images: {
        orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
      },
      options: {
        orderBy: (options, { asc: ascOrder }) => [ascOrder(options.createdAt)],
        with: {
          values: {
            orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
          },
        },
      },
      variants: {
        with: {
          attributes: {
            orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
          },
          images: {
            orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
          },
          inventory: true,
          optionOnVariants: {
            with: {
              option: true,
              value: true,
            },
          },
        },
      },
    },
  })
  .prepare()

export const getAdminProductDetailByIdQuery = db.query.product
  .findFirst({
    where: eq(product.id, sql.placeholder("id")),
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
      },
      categories: {
        with: {
          productCategory: true,
        },
      },
      collections: {
        with: {
          productCollection: true,
        },
      },
      images: {
        orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
      },
      options: {
        orderBy: (options, { asc: ascOrder }) => [ascOrder(options.createdAt)],
        with: {
          values: {
            orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
          },
        },
      },
      variants: {
        with: {
          attributes: {
            orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
            with: {
              productAttribute: true,
            },
          },
          images: {
            orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
          },
          inventory: true,
          optionOnVariants: {
            with: {
              option: true,
              value: true,
            },
          },
        },
      },
    },
  })
  .prepare()

/** Storefront PDP: published products only. */
export const getPublishedProductByHandleQuery = db.query.product
  .findFirst({
    where: and(eq(product.handle, handlePlaceholder), eq(product.status, PRODUCT_STATUS.PUBLISHED)),
    with: {
      attributes: {
        orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank)],
        with: {
          productAttribute: true,
        },
      },
      categories: {
        with: {
          productCategory: true,
        },
      },
      collections: {
        with: {
          productCollection: true,
        },
      },
      images: {
        orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
      },
      options: {
        orderBy: (options, { asc: ascOrder }) => [ascOrder(options.createdAt)],
        with: {
          values: {
            orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank), ascOrder(values.createdAt)],
          },
        },
      },
      variants: {
        with: {
          attributes: {
            orderBy: (values, { asc: ascOrder }) => [ascOrder(values.rank)],
            with: {
              productAttribute: true,
            },
          },
          images: {
            orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
          },
          inventory: true,
          optionOnVariants: {
            with: {
              option: true,
              value: true,
            },
          },
        },
      },
    },
  })
  .prepare()

// Raw table/column names, not Drizzle column refs.
// Drizzle refs inside this correlated subquery resolve against the outer `product` alias and produce invalid SQL.
const totalStockSubquery = () =>
  sql<number>`(
    select coalesce(sum("inventory"."quantity_available"), 0)
    from "product_variant"
    left join "inventory" on "inventory"."variant_id" = "product_variant"."id"
    where "product_variant"."product_id" = ${product.id}
  )`

export const getLowStockPublishedProductCountQuery = db
  .select({
    count: sql<number>`count(*)`,
  })
  .from(product)
  .where(and(eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`${totalStockSubquery()} between 1 and ${PRODUCT_LOW_STOCK_THRESHOLD}`))
  .prepare()

const productVariantStatsSubquery = () =>
  db
    .select({
      minPrice: sql<number | null>`min(${productVariant.price})`.as("min_price"),
      productId: productVariant.productId,
      totalStock: sql<number>`coalesce(sum(${inventory.quantityAvailable}), 0)`.as("total_stock"),
      variantCount: sql<number>`count(${productVariant.id})`.as("variant_count"),
    })
    .from(productVariant)
    .leftJoin(inventory, eq(inventory.variantId, productVariant.id))
    .groupBy(productVariant.productId)
    .as("product_variant_stats")

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
    where: inArray(product.id, ids),
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
  return sortProductsByIdOrder(rows, ids)
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
  "categoryId" | "collectionId" | "createdAt" | "inventoryLevel" | "search" | "status"
>

const buildAdminProductsWhere = (
  params: AdminProductsFilterParams,
  options?: {
    readonly skipInventory?: boolean
  },
): SQL | undefined => {
  const conditions: SQL[] = []
  const searchCondition = buildAdminProductSearchCondition(params.search)
  if (searchCondition !== undefined) {
    conditions.push(searchCondition)
  }
  if (params.status !== undefined) {
    conditions.push(eq(product.status, params.status))
  }
  if (params.createdAt !== undefined) {
    conditions.push(buildAdminDateFilterSql(sql`${product.createdAt}`, params.createdAt))
  }
  if (params.inventoryLevel !== undefined && options?.skipInventory !== true) {
    conditions.push(buildInventoryLevelStockCondition(params.inventoryLevel, sql<number>`(${totalStockSubquery()})`))
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
  const whereClause = buildAdminProductsWhere(params, {
    skipInventory: needsVariantStatsJoin,
  })
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

type PublishedProductListRow = Awaited<ReturnType<typeof getPublishedProductsInStock>>[number]

export const getPublishedProductsByCategoryIds = async (categoryIds: readonly string[], params: ListPaginationParams) => {
  if (categoryIds.length === 0) {
    return {
      items: [] as PublishedProductListRow[],
      total: 0,
    }
  }
  const whereClause = publishedInStockWhere(inArray(categoryOnProduct.categoryId, [...categoryIds]))
  const [countRow] = await db
    .select({
      count: sql<number>`count(distinct ${product.id})`,
    })
    .from(product)
    .innerJoin(categoryOnProduct, eq(categoryOnProduct.productId, product.id))
    .where(whereClause)
  const productIdRows = await db
    .select({
      productId: product.id,
    })
    .from(product)
    .innerJoin(categoryOnProduct, eq(categoryOnProduct.productId, product.id))
    .where(whereClause)
    .groupBy(product.id)
    .orderBy(asc(product.rank), desc(product.createdAt))
    .limit(params.limit)
    .offset(params.offset)
  const productIds = productIdRows.map((row) => row.productId)
  if (productIds.length === 0) {
    return {
      items: [] as PublishedProductListRow[],
      total: countRow?.count ?? 0,
    }
  }
  const items = sortProductsByIdOrder(
    await db.query.product.findMany({
      where: inArray(product.id, productIds),
      with: {
        variants: {
          columns: storefrontListVariantColumns,
        },
      },
    }),
    productIds,
  )
  return {
    items,
    total: countRow?.count ?? 0,
  }
}

export const getPublishedProductsByCollectionId = async (collectionId: string, params: ListPaginationParams) => {
  const whereClause = publishedInStockWhere(eq(collectionOnProduct.collectionId, collectionId))
  const [countRow] = await db
    .select({
      count: sql<number>`count(distinct ${product.id})`,
    })
    .from(product)
    .innerJoin(collectionOnProduct, eq(collectionOnProduct.productId, product.id))
    .where(whereClause)
  const productIdRows = await db
    .select({
      productId: product.id,
    })
    .from(product)
    .innerJoin(collectionOnProduct, eq(collectionOnProduct.productId, product.id))
    .where(whereClause)
    .groupBy(product.id)
    .orderBy(asc(product.rank), desc(product.createdAt))
    .limit(params.limit)
    .offset(params.offset)
  const productIds = productIdRows.map((row) => row.productId)
  if (productIds.length === 0) {
    return {
      items: [] as PublishedProductListRow[],
      total: countRow?.count ?? 0,
    }
  }
  const items = sortProductsByIdOrder(
    await db.query.product.findMany({
      where: inArray(product.id, productIds),
      with: {
        variants: {
          columns: storefrontListVariantColumns,
        },
      },
    }),
    productIds,
  )
  return {
    items,
    total: countRow?.count ?? 0,
  }
}

export const getPublishedRelatedProducts = (categoryId: string, excludeProductId: string) => {
  const productIdsInCategory = db
    .select({
      id: categoryOnProduct.productId,
    })
    .from(categoryOnProduct)
    .where(eq(categoryOnProduct.categoryId, categoryId))
  return db.query.product.findMany({
    limit: RELATED_PRODUCTS_LIMIT,
    orderBy: (products, { asc: ascOrder, desc: descOrder }) => [ascOrder(products.rank), descOrder(products.createdAt)],
    where: publishedInStockWhere(ne(product.id, excludeProductId), inArray(product.id, productIdsInCategory)),
    with: {
      variants: {
        columns: storefrontListVariantColumns,
      },
    },
  })
}

export const deleteProducts = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(product).where(inArray(product.id, [...ids]))
}

export const setProductRanks = async (
  updates: readonly {
    id: string
    rank: number
  }[],
): Promise<void> => {
  if (updates.length === 0) {
    return
  }
  const ids = updates.map((entry) => entry.id)
  const cases = updates.map((entry) => sql`when ${product.id} = ${entry.id} then ${entry.rank}`)
  const rankExpression = sql`(case ${sql.join(cases, sql.raw(" "))} end)`
  await db
    .update(product)
    .set({
      rank: rankExpression,
    })
    .where(inArray(product.id, ids))
}

export const findTakenSkus = async (skus: readonly string[], excludeProductId?: string): Promise<string[]> => {
  const normalizedSkus = [...new Set(skus.map((sku) => sku.trim()).filter((sku) => sku !== ""))]
  if (normalizedSkus.length === 0) {
    return []
  }
  let excludeVariantIds: string[] = []
  if (excludeProductId !== undefined) {
    const variantIdRows = await db
      .select({
        id: productVariant.id,
      })
      .from(productVariant)
      .where(eq(productVariant.productId, excludeProductId))
    excludeVariantIds = variantIdRows.map((row) => row.id)
  }
  const whereConditions: SQL[] = [inArray(productVariant.sku, normalizedSkus)]
  if (excludeVariantIds.length > 0) {
    whereConditions.push(notInArray(productVariant.id, excludeVariantIds))
  }
  const rows = await db
    .select({
      sku: productVariant.sku,
    })
    .from(productVariant)
    .where(and(...whereConditions))
  return rows.map((row) => row.sku).filter((sku): sku is string => sku !== null && sku !== "")
}

export const replaceProductCatalog = async (productId: string, payload: ProductCatalogReplacePayload): Promise<void> => {
  const { inventoryRows, optionOnVariantRows, optionRows, optionValueRows, variantRows } = payload

  // D1 has no interactive transactions (`BEGIN` fails); batch keeps writes atomic.
  const statements: DrizzleBatchStatement[] = [
    db.delete(productOption).where(eq(productOption.productId, productId)),
    db.delete(productVariant).where(eq(productVariant.productId, productId)),
  ]
  if (optionRows.length > 0) {
    statements.push(db.insert(productOption).values(optionRows))
  }
  if (optionValueRows.length > 0) {
    statements.push(db.insert(productOptionValue).values(optionValueRows))
  }
  if (variantRows.length > 0) {
    statements.push(db.insert(productVariant).values(variantRows))
  }
  if (inventoryRows.length > 0) {
    statements.push(db.insert(inventory).values(inventoryRows))
  }
  if (optionOnVariantRows.length > 0) {
    statements.push(db.insert(optionOnVariant).values(optionOnVariantRows))
  }
  await runDrizzleBatch(statements)
}

export const replaceProductOrganization = async (productId: string, payload: ProductOrganizationReplacePayload): Promise<void> => {
  const { categoryRows, collectionRows } = payload
  const primaryCategoryId = resolvePrimaryCategoryId(
    categoryRows.map((row) => ({
      categoryId: row.categoryId,
      isPrimary: row.isPrimary ?? false,
    })),
  )
  const statements: DrizzleBatchStatement[] = [
    db.delete(categoryOnProduct).where(eq(categoryOnProduct.productId, productId)),
    db.delete(collectionOnProduct).where(eq(collectionOnProduct.productId, productId)),
  ]
  if (categoryRows.length > 0) {
    statements.push(db.insert(categoryOnProduct).values(categoryRows))
  }
  if (collectionRows.length > 0) {
    statements.push(db.insert(collectionOnProduct).values(collectionRows))
  }
  statements.push(
    db
      .update(product)
      .set({
        primaryCategoryId: primaryCategoryId ?? sql`null`,
      })
      .where(eq(product.id, productId)),
  )
  await runDrizzleBatch(statements)
}
