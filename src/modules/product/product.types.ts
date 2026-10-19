import { type z } from "zod/v4"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type DateColumnFilterValue, type NumericColumnFilterValue } from "~/src/modules/_core/utils/column-filters"
import { type categoryOnProduct } from "~/src/modules/category-on-product/category-on-product.schema"
import { type collectionOnProduct } from "~/src/modules/collection-on-product/collection-on-product.schema"
import { type inventory } from "~/src/modules/inventory/inventory.schema"
import { type optionOnVariant } from "~/src/modules/option-on-variant/option-on-variant.schema"
import { type PriceReduction } from "~/src/modules/price-history/price-history.types"
import { type ProductAttributeType } from "~/src/modules/product-attribute/product-attribute.constants"
import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { type productCategory } from "~/src/modules/product-category/product-category.schema"
import { type productCollection } from "~/src/modules/product-collection/product-collection.schema"
import { type productOptionValue } from "~/src/modules/product-option-value/product-option-value.schema"
import { type productOption } from "~/src/modules/product-option/product-option.schema"
import { type productVariant } from "~/src/modules/product-variant/product-variant.schema"
import { type ProductInventoryLevel, type ProductStatus, type ProductVariantKind } from "~/src/modules/product/product.constants"
import { type product } from "~/src/modules/product/product.schema"
import { type productZodSchemas } from "~/src/modules/product/product.zod"

type LocaleMap = ProductAttribute["localeMap"]

type TagsLocaleMap = Record<SupportedLocale, string[]>

interface Specification {
  readonly allowedValues: readonly ProductAttribute["allowedValue"][] | null
  readonly handle: string
  readonly rank: number
  readonly titles: ProductAttribute["localeMap"]
  readonly type: ProductAttributeType
  readonly unit: string | null
  readonly value: string
}

interface StorefrontOptionValue {
  readonly id: string
  readonly label: string
}

interface StorefrontOption {
  readonly id: string
  readonly title: string
  readonly values: readonly StorefrontOptionValue[]
}

type StorefrontVariant = typeof productVariant.$inferSelect & {
  readonly imageUrls: readonly string[]
  readonly inventory?: typeof inventory.$inferSelect | null
  readonly optionValueIds: Readonly<Record<string, string>>
  readonly priceReduction?: PriceReduction | undefined
  readonly specifications: readonly Specification[]
}

type Storefront = Omit<typeof product.$inferSelect, "descriptions" | "subtitles" | "tags" | "titles"> & {
  readonly categories: readonly (typeof productCategory.$inferSelect)[]
  readonly category?: typeof productCategory.$inferSelect | undefined
  readonly categoryId?: string | undefined
  readonly collection?: typeof productCollection.$inferSelect | undefined
  readonly collectionId?: string | undefined
  readonly collections: readonly (typeof productCollection.$inferSelect)[]
  readonly description: string
  readonly hasVariants: boolean
  readonly imageUrls: readonly string[]
  readonly options: readonly StorefrontOption[]
  readonly sharedImageUrls: readonly string[]
  readonly sharedSpecifications: readonly Specification[]
  readonly specifications: readonly Specification[]
  readonly subtitle: string
  readonly tags?: string[] | undefined
  readonly title: string
  readonly variants: readonly StorefrontVariant[]
}

export interface AdminProductsListSort {
  readonly columnId: string
  readonly desc: boolean
}

export interface AdminProductsListColumnFilters {
  readonly createdAt?: DateColumnFilterValue
  readonly minPrice?: NumericColumnFilterValue
  readonly totalStock?: NumericColumnFilterValue
}

interface AdminProductsPageInput {
  readonly categoryId?: string | undefined
  readonly collectionId?: string | undefined
  readonly createdAt?: DateColumnFilterValue | undefined
  readonly inventoryLevel?: ProductInventoryLevel | undefined
  readonly minPrice?: NumericColumnFilterValue | undefined
  readonly page?: number | undefined
  readonly pageSize?: number | undefined
  readonly search?: string | undefined
  readonly sort?: AdminProductsListSort | undefined
  readonly status?: ProductStatus | undefined
  readonly totalStock?: NumericColumnFilterValue | undefined
  readonly variantKind?: ProductVariantKind | undefined
}

export interface Product {
  adminListItem: z.infer<(typeof productZodSchemas)["adminListItem"]>
  adminProductsExportInput: Omit<AdminProductsPageInput, "page" | "pageSize">
  adminProductsPageInput: AdminProductsPageInput
  deleteInput: z.infer<(typeof productZodSchemas)["deleteInput"]>
  formValues: z.infer<(typeof productZodSchemas)["form"]>
  insert: typeof product.$inferInsert
  localeMap: LocaleMap
  select: typeof product.$inferSelect
  specification: Specification
  stats: z.infer<(typeof productZodSchemas)["stats"]>
  storefront: Storefront
  storefrontOption: StorefrontOption
  storefrontOptionValue: StorefrontOptionValue
  storefrontVariant: StorefrontVariant
  tagsLocaleMap: TagsLocaleMap
}

export interface ProductVariantPersistRow {
  readonly compareAtPrice: number | undefined
  readonly id: string
  readonly loadedQuantity: number | undefined
  readonly manageInventory: boolean
  readonly optionValues: Readonly<Record<string, string>>
  readonly price: number
  readonly quantity: number
  readonly sku: string | undefined
  readonly title: string
}

export interface InventoryAdjustment {
  readonly quantityChange: number
  readonly variantId: string
}

export interface ProductCatalogReplacePayload {
  readonly inventoryAdjustments: readonly InventoryAdjustment[]
  readonly inventoryRows: (typeof inventory.$inferInsert)[]
  readonly optionOnVariantRows: (typeof optionOnVariant.$inferInsert)[]
  readonly optionRows: (typeof productOption.$inferInsert)[]
  readonly optionValueRows: (typeof productOptionValue.$inferInsert)[]
  readonly variantRows: (typeof productVariant.$inferInsert)[]
}

export interface ProductOrganizationReplacePayload {
  readonly categoryRows: (typeof categoryOnProduct.$inferInsert)[]
  readonly collectionRows: (typeof collectionOnProduct.$inferInsert)[]
}

export type ProductSkuFormFieldPath = "simpleVariant.sku" | `variants.${number}.sku`

export interface ProductFormSkuEntry {
  readonly formPath: ProductSkuFormFieldPath
  readonly sku: string
}

export interface ProductAuditVariantSnapshot {
  readonly price: number
  readonly quantity: number
  readonly sku: string
}

export interface ProductAuditSnapshot {
  readonly status: string
  readonly totalStock: number
  readonly variants: readonly ProductAuditVariantSnapshot[]
}
