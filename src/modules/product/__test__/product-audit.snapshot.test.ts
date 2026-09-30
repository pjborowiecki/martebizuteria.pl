import { describe, expect, it } from "vite-plus/test"

import { extractProductAuditSnapshot } from "~/src/modules/product/product-audit.utils"
import { type AdminProductDetail } from "~/src/modules/product/product.utils"

const AT = new Date("2026-01-01T00:00:00.000Z")

const stamps = { createdAt: AT, updatedAt: AT } as const

type ProductVariant = AdminProductDetail["variants"][number]

const variant = (
  overrides: Readonly<{
    id: string
    price?: number
    quantityAvailable?: number
    sku?: string | null
  }>,
): ProductVariant => ({
  attributes: [],
  barcode: null,
  compareAtPrice: null,
  id: overrides.id,
  images: [],
  inventory:
    overrides.quantityAvailable === undefined
      ? null
      : {
          id: `inv-${overrides.id}`,
          quantityAvailable: overrides.quantityAvailable,
          quantityReserved: 0,
          variantId: overrides.id,
          version: 1,
          ...stamps,
        },
  manageInventory: true,
  metadata: null,
  optionOnVariants: [],
  price: overrides.price ?? 12_000,
  productId: "prod-1",
  sku: overrides.sku === undefined ? null : overrides.sku,
  title: overrides.id,
  ...stamps,
})

const detail = (overrides: Partial<AdminProductDetail> = {}): AdminProductDetail => ({
  attributes: [],
  categories: [],
  collections: [],
  descriptions: null,
  handle: "gold-chain",
  id: "prod-1",
  images: [],
  metadata: null,
  options: [],
  primaryCategoryId: null,
  rank: 0,
  status: "draft",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Gold chain", "pl-PL": "Zloty lancuszek" },
  variants: [],
  ...stamps,
  ...overrides,
})

describe("extractProductAuditSnapshot", () => {
  it("records the publication status of the product", () => {
    expect(extractProductAuditSnapshot(detail({ status: "published" })).status).toBe("published")
  })

  it("snapshots a product without variants as empty and stockless", () => {
    expect(extractProductAuditSnapshot(detail())).toStrictEqual({ status: "draft", totalStock: 0, variants: [] })
  })

  it("keeps the price, stock and sku of each variant", () => {
    const snapshot = extractProductAuditSnapshot(
      detail({ variants: [variant({ id: "var-1", price: 12_500, quantityAvailable: 4, sku: "GC-1" })] }),
    )

    expect(snapshot.variants).toStrictEqual([{ price: 12_500, quantity: 4, sku: "GC-1" }])
  })

  it("adds the available stock of every variant together", () => {
    const snapshot = extractProductAuditSnapshot(
      detail({
        variants: [
          variant({ id: "var-1", quantityAvailable: 4, sku: "GC-1" }),
          variant({ id: "var-2", quantityAvailable: 6, sku: "GC-2" }),
        ],
      }),
    )

    expect(snapshot.totalStock).toBe(10)
  })

  it("counts a variant with no inventory row as out of stock", () => {
    const snapshot = extractProductAuditSnapshot(detail({ variants: [variant({ id: "var-1", sku: "GC-1" })] }))

    expect(snapshot.totalStock).toBe(0)
    expect(snapshot.variants[0]?.quantity).toBe(0)
  })

  it("records a variant without a sku under an empty sku", () => {
    const snapshot = extractProductAuditSnapshot(detail({ variants: [variant({ id: "var-1", quantityAvailable: 2 })] }))

    expect(snapshot.variants[0]?.sku).toBe("")
  })

  it("orders the variants by sku so a reordered list is not a change", () => {
    const first = extractProductAuditSnapshot(
      detail({
        variants: [
          variant({ id: "var-2", quantityAvailable: 1, sku: "GC-2" }),
          variant({ id: "var-1", quantityAvailable: 1, sku: "GC-1" }),
        ],
      }),
    )
    const second = extractProductAuditSnapshot(
      detail({
        variants: [
          variant({ id: "var-1", quantityAvailable: 1, sku: "GC-1" }),
          variant({ id: "var-2", quantityAvailable: 1, sku: "GC-2" }),
        ],
      }),
    )

    expect(first).toStrictEqual(second)
    expect(first.variants.map((entry) => entry.sku)).toStrictEqual(["GC-1", "GC-2"])
  })
})
