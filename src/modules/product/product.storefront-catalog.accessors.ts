import { type SQL, and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { type ListPaginationParams, sortRowsByIdOrder } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { product } from "~/src/modules/product/product.schema"
import {
  productVariantStatsSubquery,
  publishedInStockWhere,
  storefrontListVariantColumns,
} from "~/src/modules/product/product.stock.server"
import { STOREFRONT_PRODUCTS_SORT, type StorefrontProductsSort } from "~/src/modules/product/product.storefront-catalog"
import {
  buildStorefrontProductSearchCondition,
  storefrontSearchMatches,
} from "~/src/modules/storefront-search/storefront-search.accessors.server"
import { buildStorefrontSearchExpression } from "~/src/modules/storefront-search/storefront-search.utils"

export interface StorefrontPublishedProductsParams extends ListPaginationParams {
  readonly categoryIds?: readonly string[] | undefined
  readonly collectionId?: string | undefined
  readonly maxPriceCents?: number | undefined
  readonly minPriceCents?: number | undefined
  readonly searchTerm?: string | undefined
  readonly sort?: StorefrontProductsSort | undefined
}

const storefrontProductsNeedsVariantStatsJoin = (
  params: Pick<StorefrontPublishedProductsParams, "maxPriceCents" | "minPriceCents" | "sort">,
): boolean =>
  params.minPriceCents !== undefined ||
  params.maxPriceCents !== undefined ||
  params.sort === STOREFRONT_PRODUCTS_SORT.PRICE_ASC ||
  params.sort === STOREFRONT_PRODUCTS_SORT.PRICE_DESC

const buildStorefrontProductsScopeConditions = (params: Pick<StorefrontPublishedProductsParams, "categoryIds" | "collectionId">): SQL[] => {
  const conditions: SQL[] = []
  if (params.categoryIds !== undefined && params.categoryIds.length > 0) {
    const productIdsInCategories = db
      .select({
        id: categoryOnProduct.productId,
      })
      .from(categoryOnProduct)
      .where(inJsonList(categoryOnProduct.categoryId, params.categoryIds))
    conditions.push(inArray(product.id, productIdsInCategories))
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

  return conditions
}

const buildStorefrontProductsOrderClauses = (
  sort: StorefrontProductsSort | undefined,
  variantStats: ReturnType<typeof productVariantStatsSubquery> | undefined,
  searchMatches: ReturnType<typeof storefrontSearchMatches> | undefined,
) => {
  if (searchMatches !== undefined && (sort === undefined || sort === STOREFRONT_PRODUCTS_SORT.RANK)) {
    return [asc(sql`coalesce(${searchMatches.score}, ${0})`), asc(product.rank), desc(product.createdAt)]
  }

  if (sort === STOREFRONT_PRODUCTS_SORT.PRICE_ASC) {
    return [asc(sql`coalesce(${variantStats!.minPrice}, ${0})`), asc(product.rank), desc(product.createdAt)]
  }

  if (sort === STOREFRONT_PRODUCTS_SORT.PRICE_DESC) {
    return [desc(sql`coalesce(${variantStats!.minPrice}, ${0})`), asc(product.rank), desc(product.createdAt)]
  }

  if (sort === STOREFRONT_PRODUCTS_SORT.NEWEST) {
    return [desc(product.createdAt), asc(product.rank)]
  }

  return [asc(product.rank), desc(product.createdAt)]
}

interface StorefrontVariantJoinContext {
  readonly needsVariantJoin: boolean
  readonly stockWhere: SQL
  readonly variantStats: ReturnType<typeof productVariantStatsSubquery>
}

const buildStorefrontProductsCombinedWhere = (
  joinContext: StorefrontVariantJoinContext,
  priceParams: Pick<StorefrontPublishedProductsParams, "maxPriceCents" | "minPriceCents">,
): SQL => {
  if (!joinContext.needsVariantJoin) {
    return joinContext.stockWhere
  }

  const joinConditions: SQL[] = [joinContext.stockWhere]
  const minPriceSql = sql`coalesce(${joinContext.variantStats.minPrice}, ${0})`
  if (priceParams.minPriceCents !== undefined) {
    joinConditions.push(sql`${minPriceSql} >= ${priceParams.minPriceCents}`)
  }

  if (priceParams.maxPriceCents !== undefined) {
    joinConditions.push(sql`${minPriceSql} <= ${priceParams.maxPriceCents}`)
  }

  return and(...joinConditions)!
}

const buildStorefrontProductsSearch = (searchTerm: string) => {
  const expression = buildStorefrontSearchExpression(searchTerm)

  return {
    condition: buildStorefrontProductSearchCondition(searchTerm),
    matches: expression === undefined ? undefined : storefrontSearchMatches("product", expression),
  }
}

const buildStorefrontProductIdsQuery = (
  joinContext: StorefrontVariantJoinContext,
  searchMatches: ReturnType<typeof storefrontSearchMatches> | undefined,
) => {
  const base = db.select({ productId: product.id }).from(product).$dynamic()
  const withVariants = joinContext.needsVariantJoin
    ? base.leftJoin(joinContext.variantStats, eq(joinContext.variantStats.productId, product.id))
    : base

  return searchMatches === undefined ? withVariants : withVariants.leftJoin(searchMatches, eq(searchMatches.entityId, product.id))
}

export const getStorefrontPublishedProductsPage = async (params: StorefrontPublishedProductsParams) => {
  const variantStats = productVariantStatsSubquery()
  const needsVariantJoin = storefrontProductsNeedsVariantStatsJoin(params)
  const scopeConditions = buildStorefrontProductsScopeConditions(params)
  const searchTerm = normalizeAdminSearchTerm(params.searchTerm)
  const search = searchTerm === undefined ? undefined : buildStorefrontProductsSearch(searchTerm)
  const stockWhere = publishedInStockWhere(...scopeConditions, search?.condition)
  const combinedWhere = buildStorefrontProductsCombinedWhere(
    {
      needsVariantJoin,
      stockWhere,
      variantStats,
    },
    {
      maxPriceCents: params.maxPriceCents,
      minPriceCents: params.minPriceCents,
    },
  )

  const orderClauses = buildStorefrontProductsOrderClauses(params.sort, needsVariantJoin ? variantStats : undefined, search?.matches)
  const countQuery = needsVariantJoin
    ? db
        .select({
          count: sql<number>`count(distinct ${product.id})`,
        })
        .from(product)
        .leftJoin(variantStats, eq(variantStats.productId, product.id))
    : db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(product)
  const idsBase = buildStorefrontProductIdsQuery({ needsVariantJoin, stockWhere, variantStats }, search?.matches)
  const idsQuery = needsVariantJoin
    ? idsBase
        .where(combinedWhere)
        .groupBy(product.id)
        .orderBy(...orderClauses)
        .limit(params.limit)
        .offset(params.offset)
    : idsBase
        .where(combinedWhere)
        .orderBy(...orderClauses)
        .limit(params.limit)
        .offset(params.offset)
  const [[countRow], productIdRows] = await Promise.all([countQuery.where(combinedWhere), idsQuery])
  const productIds = productIdRows.map((row) => row.productId)
  if (productIds.length === 0) {
    return {
      items: [],
      total: countRow?.count ?? 0,
    }
  }

  const items = sortRowsByIdOrder(
    await db.query.product.findMany({
      where: inJsonList(product.id, productIds),
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

export const getPublishedProductCountsByRootCategory = () =>
  db.all<{
    categoryId: string
    count: number
  }>(sql`
    with recursive category_tree(root_id, id) as (
      select ${productCategory.id}, ${productCategory.id}
      from ${productCategory}
      where ${productCategory.parentId} is null and ${productCategory.status} = ${CATEGORY_STATUS.ACTIVE}
      union all
      select category_tree.root_id, ${productCategory.id}
      from ${productCategory}
      inner join category_tree on ${productCategory.parentId} = category_tree.id
    )
    select category_tree.root_id as "categoryId", count(distinct ${product.id}) as "count"
    from category_tree
    inner join ${categoryOnProduct} on ${categoryOnProduct.categoryId} = category_tree.id
    inner join ${product} on ${product.id} = ${categoryOnProduct.productId}
    where ${publishedInStockWhere()}
    group by category_tree.root_id
  `)
