import { describe, expect, it } from "vite-plus/test"

import { type ProductAuditSnapshot, buildProductAuditChange } from "~/src/modules/product/product-audit.utils"

const snapshot = (overrides: Partial<ProductAuditSnapshot> = {}): ProductAuditSnapshot => ({
  status: "published",
  totalStock: 5,
  variants: [{ price: 12_000, quantity: 5, sku: "SR-1" }],
  ...overrides,
})

describe("buildProductAuditChange", () => {
  it("records nothing for a product that had no previous snapshot", () => {
    expect(buildProductAuditChange(undefined, snapshot())).toStrictEqual({})
  })

  it("records nothing when nothing moved", () => {
    expect(buildProductAuditChange(snapshot(), snapshot())).toStrictEqual({})
  })

  it("records a status change", () => {
    const change = buildProductAuditChange(snapshot({ status: "draft" }), snapshot())

    expect(change).toStrictEqual({ metadata: { changed: ["status"], new: { status: "published" }, old: { status: "draft" } } })
  })

  it("notes a variant change alongside the scalar fields", () => {
    const change = buildProductAuditChange(
      snapshot({ totalStock: 5, variants: [{ price: 12_000, quantity: 5, sku: "SR-1" }] }),
      snapshot({ totalStock: 3, variants: [{ price: 12_000, quantity: 3, sku: "SR-1" }] }),
    )

    expect(change.metadata).toMatchObject({ changed: ["totalStock", "variants"] })
  })

  it("detects a price change even when the stock total is unchanged", () => {
    const change = buildProductAuditChange(snapshot(), snapshot({ variants: [{ price: 13_000, quantity: 5, sku: "SR-1" }] }))

    expect(change.metadata).toMatchObject({ changed: ["variants"] })
  })

  it("detects a renamed SKU", () => {
    const change = buildProductAuditChange(snapshot(), snapshot({ variants: [{ price: 12_000, quantity: 5, sku: "SR-2" }] }))

    expect(change.metadata).toMatchObject({ changed: ["variants"] })
  })

  it("detects an added variant", () => {
    const change = buildProductAuditChange(
      snapshot(),
      snapshot({
        variants: [
          { price: 12_000, quantity: 5, sku: "SR-1" },
          { price: 13_000, quantity: 2, sku: "SR-2" },
        ],
      }),
    )

    expect(change.metadata).toMatchObject({ changed: ["variants"] })
  })

  it("carries both variant lists in the metadata for a variant-only change", () => {
    const before = snapshot()
    const after = snapshot({ variants: [{ price: 13_000, quantity: 5, sku: "SR-1" }] })

    expect(buildProductAuditChange(before, after).metadata).toStrictEqual({
      changed: ["variants"],
      new: { variants: after.variants },
      old: { variants: before.variants },
    })
  })
})
