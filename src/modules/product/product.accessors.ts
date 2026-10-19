import { type SQL, type SQLWrapper, and, asc, desc, eq, inArray, max, ne, sql } from "drizzle-orm"

import {
  type DrizzleBatchStatement,
  type RankUpdate,
  chunkRankUpdates,
  insertRowChunks,
  runDrizzleBatch,
} from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList, notInJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import { categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { resolvePrimaryCategoryId } from "~/src/modules/category-on-product/category-on-product.utils"
import { collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { inventory } from "~/src/modules/inventory/inventory.schema"
import { optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema"
import { isAnyVariantHeldByOpenCheckout } from "~/src/modules/payment/payment.accessors"
import { withPriceReductions } from "~/src/modules/price-history/price-history.accessors"
import { CATEGORY_STATUS } from "~/src/modules/product-category/product-category.constants"
import { productCategory } from "~/src/modules/product-category/product-category.schema"
import { storefrontCollectionByHandleWhere } from "~/src/modules/product-collection/product-collection.accessors"
import { productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema"
import { productOption } from "~/src/modules/product-option/product-option.schema"
import { productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { PRODUCT_ERROR_CODES, PRODUCT_LOW_STOCK_THRESHOLD, PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { product } from "~/src/modules/product/product.schema"
import { type ProductCatalogReplacePayload, type ProductOrganizationReplacePayload } from "~/src/modules/product/product.types"

const RELATED_PRODUCTS_LIMIT = 3

const handlePlaceholder = sql.placeholder("handle")

export const totalStockSubquery = () =>
  sql<number>`(
    select coalesce(sum("inventory"."quantity_available"), 0)
    from "product_variant"
    left join "inventory" on "inventory"."variant_id" = "product_variant"."id"
    where "product_variant"."product_id" = ${product.id}
  )`

export const publishedInStockWhere = (...extraConditions: (SQL | undefined)[]): SQL => {
  const conditions = [eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`(${totalStockSubquery()}) > ${0}`, ...extraConditions].filter(
    (condition): condition is SQL => condition !== undefined,
  )

  return and(...conditions)!
}

export const productVariantStatsSubquery = () =>
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

export const storefrontListVariantColumns = {
  compareAtPrice: true,
  id: true,
  price: true,
  productId: true,
  title: true,
} as const

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

export const getPublishedProductsWithInventoryByHandles = (handles: readonly string[]) =>
  db.query.product.findMany({
    where: and(inJsonList(product.handle, handles), eq(product.status, PRODUCT_STATUS.PUBLISHED)),
    with: {
      images: {
        orderBy: (images, { asc: ascOrder }) => [ascOrder(images.rank), ascOrder(images.createdAt)],
      },
      variants: {
        with: {
          inventory: true,
        },
      },
    },
  })

export const getMaxRankQuery = db
  .select({
    value: max(product.rank),
  })
  .from(product)
  .prepare()

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

export const getPublishedInStockProductHandlesQuery = db
  .select({
    handle: product.handle,
    updatedAt: product.updatedAt,
  })
  .from(product)
  .where(publishedInStockWhere())
  .orderBy(asc(product.rank), desc(product.createdAt))
  .prepare()

export const getLowStockPublishedProductCountQuery = db
  .select({
    count: sql<number>`count(*)`,
  })
  .from(product)
  .where(and(eq(product.status, PRODUCT_STATUS.PUBLISHED), sql`${totalStockSubquery()} between 1 and ${PRODUCT_LOW_STOCK_THRESHOLD}`))
  .prepare()

const getPublishedProductsAmong = async (productIds: SQLWrapper, params: ListPaginationParams) => {
  const rows = await db.query.product.findMany({
    limit: params.limit,
    offset: params.offset,
    orderBy: (products, { asc: ascOrder, desc: descOrder }) => [ascOrder(products.rank), descOrder(products.createdAt)],
    where: publishedInStockWhere(inArray(product.id, productIds)),
    with: {
      variants: {
        columns: storefrontListVariantColumns,
      },
    },
  })

  return withPriceReductions(rows)
}

export const getPublishedProductsByCategoryIds = (categoryIds: readonly string[], params: ListPaginationParams) => {
  const productIdsInCategories = db
    .select({
      id: categoryOnProduct.productId,
    })
    .from(categoryOnProduct)
    .where(inJsonList(categoryOnProduct.categoryId, categoryIds))

  return getPublishedProductsAmong(productIdsInCategories, params)
}

export const getPublishedProductsByCollectionHandle = (handle: string, params: ListPaginationParams) => {
  const productIdsInCollection = db
    .select({
      id: collectionOnProduct.productId,
    })
    .from(collectionOnProduct)
    .innerJoin(productCollection, eq(productCollection.id, collectionOnProduct.collectionId))
    .where(storefrontCollectionByHandleWhere(handle))

  return getPublishedProductsAmong(productIdsInCollection, params)
}

export const getPublishedRelatedProducts = (categoryId: string, excludeProductId: string) => {
  const otherProductIdsInCategory = db
    .select({
      id: categoryOnProduct.productId,
    })
    .from(categoryOnProduct)
    .where(and(eq(categoryOnProduct.categoryId, categoryId), ne(categoryOnProduct.productId, excludeProductId)))

  return getPublishedProductsAmong(otherProductIdsInCategory, {
    limit: RELATED_PRODUCTS_LIMIT,
    offset: 0,
  })
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

export const deleteProducts = async (ids: readonly string[]): Promise<void> => {
  if (ids.length === 0) {
    return
  }
  await db.delete(product).where(inJsonList(product.id, ids))
}

export const setProductRanks = async (updates: readonly RankUpdate[]): Promise<void> => {
  await runDrizzleBatch(
    chunkRankUpdates(product.id, updates).map(({ ids, rank }) => db.update(product).set({ rank }).where(inJsonList(product.id, ids))),
  )
}

export const findTakenSkus = async (skus: readonly string[], excludeProductId?: string): Promise<string[]> => {
  const normalizedSkus = [...new Set(skus.map((sku) => sku.trim()).filter((sku) => sku !== ""))]
  if (normalizedSkus.length === 0) {
    return []
  }

  const whereConditions = [inJsonList(productVariant.sku, normalizedSkus)]
  if (excludeProductId !== undefined) {
    whereConditions.push(ne(productVariant.productId, excludeProductId))
  }

  const rows = await db
    .select({
      sku: productVariant.sku,
    })
    .from(productVariant)
    .where(and(...whereConditions))
  return rows.map((row) => row.sku).filter((sku): sku is string => sku !== null && sku !== "")
}

export const assertVariantsNotHeldByOpenCheckouts = async (variantIds: readonly string[]): Promise<void> => {
  if (await isAnyVariantHeldByOpenCheckout(variantIds)) {
    throw new AppError(ERROR_CODES.CONFLICT, PRODUCT_ERROR_CODES.RESERVED_IN_CHECKOUT)
  }
}

export const prepareProductCatalogBatch = (productId: string, payload: ProductCatalogReplacePayload): DrizzleBatchStatement[] => {
  const { inventoryAdjustments, inventoryRows, optionOnVariantRows, optionRows, optionValueRows, variantRows } = payload
  const productVariants = eq(productVariant.productId, productId)
  const keptVariantIds = variantRows.map((row) => row.id)
  const droppedVariants = and(productVariants, notInJsonList(productVariant.id, keptVariantIds))

  return [
    db.delete(productOption).where(eq(productOption.productId, productId)),
    db.delete(productVariant).where(droppedVariants),
    db
      .update(productVariant)
      .set({ sku: sql`NULL` })
      .where(productVariants),
    ...insertRowChunks(productOption, optionRows).map((rows) => db.insert(productOption).values(rows)),
    ...insertRowChunks(productOptionValue, optionValueRows).map((rows) => db.insert(productOptionValue).values(rows)),
    ...insertRowChunks(productVariant, variantRows).map((rows) =>
      db
        .insert(productVariant)
        .values(rows)
        .onConflictDoUpdate({
          set: {
            compareAtPrice: sql`excluded.compare_at_price`,
            manageInventory: sql`excluded.manage_inventory`,
            price: sql`excluded.price`,
            sku: sql`excluded.sku`,
            title: sql`excluded.title`,
            updatedAt: sql`excluded.updated_at`,
          },
          target: productVariant.id,
        }),
    ),
    ...inventoryAdjustments.map(({ quantityChange, variantId }) =>
      db
        .update(inventory)
        .set({
          quantityAvailable: sql`${inventory.quantityAvailable} + ${quantityChange}`,
        })
        .where(eq(inventory.variantId, variantId)),
    ),
    ...insertRowChunks(inventory, inventoryRows).map((rows) =>
      db.insert(inventory).values(rows).onConflictDoNothing({ target: inventory.variantId }),
    ),
    ...insertRowChunks(optionOnVariant, optionOnVariantRows).map((rows) => db.insert(optionOnVariant).values(rows)),
  ]
}

export const prepareProductOrganizationBatch = (productId: string, payload: ProductOrganizationReplacePayload): DrizzleBatchStatement[] => {
  const { categoryRows, collectionRows } = payload
  const primaryCategoryId = resolvePrimaryCategoryId(
    categoryRows.map((row) => ({
      categoryId: row.categoryId,
      isPrimary: row.isPrimary ?? false,
    })),
  )

  return [
    db.delete(categoryOnProduct).where(eq(categoryOnProduct.productId, productId)),
    db.delete(collectionOnProduct).where(eq(collectionOnProduct.productId, productId)),
    ...insertRowChunks(categoryOnProduct, categoryRows).map((rows) => db.insert(categoryOnProduct).values(rows)),
    ...insertRowChunks(collectionOnProduct, collectionRows).map((rows) => db.insert(collectionOnProduct).values(rows)),
    db
      .update(product)
      .set({
        primaryCategoryId: primaryCategoryId ?? sql`null`,
      })
      .where(eq(product.id, productId)),
  ]
}
