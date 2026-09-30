import { type Product } from "~/src/modules/product/product.types"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

export const storefrontVariant = (
  overrides: Partial<Product["storefrontVariant"]> & { readonly quantityAvailable?: number } = {},
): Product["storefrontVariant"] => {
  const { quantityAvailable = 5, ...rest } = overrides
  const id = rest.id ?? "variant-1"

  return {
    barcode: null,
    compareAtPrice: null,
    createdAt: EPOCH,
    id,
    imageUrls: [],
    inventory: {
      createdAt: EPOCH,
      id: `inventory-${id}`,
      quantityAvailable,
      quantityReserved: 0,
      updatedAt: EPOCH,
      variantId: id,
      version: 1,
    },
    manageInventory: true,
    metadata: null,
    optionValueIds: {},
    price: 120_000,
    productId: "product-1",
    sku: null,
    specifications: [],
    title: "Default",
    updatedAt: EPOCH,
    ...rest,
  }
}

export const storefrontProduct = (overrides: Partial<Product["storefront"]> = {}): Product["storefront"] => ({
  categories: [],
  collections: [],
  createdAt: EPOCH,
  description: "A hand made silver ring.",
  handle: "silver-ring",
  hasVariants: false,
  id: "product-1",
  imageUrls: [],
  metadata: null,
  options: [],
  primaryCategoryId: null,
  rank: 0,
  sharedImageUrls: [],
  sharedSpecifications: [],
  specifications: [],
  status: "published",
  subtitle: "",
  thumbnail: null,
  title: "Silver ring",
  updatedAt: EPOCH,
  variants: [storefrontVariant()],
  ...overrides,
})
