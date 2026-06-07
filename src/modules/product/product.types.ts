import type { z } from "zod/v4";

import type { Locale } from "~/src/constants/types";

import type { inventory } from "~/src/modules/inventory/inventory.schema";
import type { ProductAttributeType } from "~/src/modules/product-attribute/product-attribute.constants";
import type { ProductAttributeAllowedValue, ProductAttributeLocaleMap } from "~/src/modules/product-attribute/product-attribute.types";
import type { productCategory } from "~/src/modules/product-category/product-category.schema";
import type { productCollection } from "~/src/modules/product-collection/product-collection.schema";
import type { productVariant } from "~/src/modules/product-variant/product-variant.schema";
import type { product } from "~/src/modules/product/product.schema";
import type { productFormSchema, productZodSchemas } from "~/src/modules/product/product.zod";

export type ProductLocaleMap = ProductAttributeLocaleMap;

export type ProductTagsLocaleMap = Record<Locale, string[]>;

export interface ProductSpecification {
  readonly allowedValues: readonly ProductAttributeAllowedValue[] | null;
  readonly handle: string;
  readonly rank: number;
  readonly titles: ProductAttributeLocaleMap;
  readonly type: ProductAttributeType;
  readonly unit: string | null;
  readonly value: string;
}

export interface StorefrontProductOptionValue {
  readonly id: string;
  readonly label: string;
}

export interface StorefrontProductOption {
  readonly id: string;
  readonly title: string;
  readonly values: readonly StorefrontProductOptionValue[];
}

export type StorefrontProductVariant = typeof productVariant.$inferSelect & {
  readonly imageUrls: readonly string[];
  readonly inventory?: typeof inventory.$inferSelect | null;
  readonly optionValueIds: Readonly<Record<string, string>>;
  readonly specifications: readonly ProductSpecification[];
};

export type StorefrontProduct = Omit<Product["select"], "descriptions" | "subtitles" | "tags" | "titles"> & {
  readonly categories: readonly (typeof productCategory.$inferSelect)[];
  readonly category?: typeof productCategory.$inferSelect;
  readonly categoryId?: string;
  readonly collection?: typeof productCollection.$inferSelect;
  readonly collectionId?: string;
  readonly collections: readonly (typeof productCollection.$inferSelect)[];
  readonly description: string;
  readonly hasVariants: boolean;
  readonly imageUrls: readonly string[];
  readonly options: readonly StorefrontProductOption[];
  readonly sharedImageUrls: readonly string[];
  readonly sharedSpecifications: readonly ProductSpecification[];
  readonly specifications: readonly ProductSpecification[];
  readonly subtitle: string;
  readonly tags?: string[];
  readonly title: string;
  readonly variants: readonly StorefrontProductVariant[];
};

export interface Product {
  adminListItem: z.infer<(typeof productZodSchemas)["adminListItem"]>;
  deleteInput: z.infer<(typeof productZodSchemas)["deleteInput"]>;
  formValues: z.infer<ReturnType<typeof productFormSchema>>;
  insert: typeof product.$inferInsert;
  select: typeof product.$inferSelect;
  stats: z.infer<(typeof productZodSchemas)["stats"]>;
}

export type ProductStatus = (typeof product.$inferSelect)["status"];
