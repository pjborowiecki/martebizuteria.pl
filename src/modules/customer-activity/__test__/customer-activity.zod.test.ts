import { describe, expect, it } from "vite-plus/test"

import {
  CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH,
  CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH,
  CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH,
} from "~/src/modules/customer-activity/customer-activity.constants"
import { customerActivityZodSchemas } from "~/src/modules/customer-activity/customer-activity.zod"

const { recordInput } = customerActivityZodSchemas

describe("cart_item_added payload", () => {
  it("accepts a minimal payload without a variant title", () => {
    const parsed = recordInput.parse({ kind: "cart_item_added", productTitle: "Ring", quantity: 1, variantId: "var_1" })

    expect(parsed).toStrictEqual({ kind: "cart_item_added", productTitle: "Ring", quantity: 1, variantId: "var_1" })
  })

  it("keeps a supplied variant title", () => {
    const parsed = recordInput.parse({
      kind: "cart_item_added",
      productTitle: "Ring",
      quantity: 2,
      variantId: "var_1",
      variantTitle: "Silver / 52",
    })

    expect(parsed).toMatchObject({ variantTitle: "Silver / 52" })
  })

  it("rejects a non positive quantity", () => {
    expect(recordInput.safeParse({ kind: "cart_item_added", productTitle: "Ring", quantity: 0, variantId: "var_1" }).success).toBe(false)
    expect(recordInput.safeParse({ kind: "cart_item_added", productTitle: "Ring", quantity: -1, variantId: "var_1" }).success).toBe(false)
  })

  it("rejects a fractional quantity", () => {
    expect(recordInput.safeParse({ kind: "cart_item_added", productTitle: "Ring", quantity: 1.5, variantId: "var_1" }).success).toBe(false)
  })

  it("rejects a product title longer than the column allows", () => {
    const productTitle = "x".repeat(CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH + 1)

    expect(recordInput.safeParse({ kind: "cart_item_added", productTitle, quantity: 1, variantId: "var_1" }).success).toBe(false)
  })

  it("accepts a product title exactly at the limit", () => {
    const productTitle = "x".repeat(CUSTOMER_ACTIVITY_PRODUCT_TITLE_MAX_LENGTH)

    expect(recordInput.safeParse({ kind: "cart_item_added", productTitle, quantity: 1, variantId: "var_1" }).success).toBe(true)
  })

  it("rejects an over long variant id", () => {
    const variantId = "v".repeat(CUSTOMER_ACTIVITY_VARIANT_ID_MAX_LENGTH + 1)

    expect(recordInput.safeParse({ kind: "cart_item_added", productTitle: "Ring", quantity: 1, variantId }).success).toBe(false)
  })

  it("rejects an over long variant title", () => {
    const variantTitle = "v".repeat(CUSTOMER_ACTIVITY_VARIANT_TITLE_MAX_LENGTH + 1)

    expect(
      recordInput.safeParse({ kind: "cart_item_added", productTitle: "Ring", quantity: 1, variantId: "var_1", variantTitle }).success,
    ).toBe(false)
  })
})

describe("cart_abandoned payload", () => {
  it("accepts zero counts", () => {
    expect(recordInput.parse({ itemCount: 0, kind: "cart_abandoned", lineCount: 0 })).toStrictEqual({
      itemCount: 0,
      kind: "cart_abandoned",
      lineCount: 0,
    })
  })

  it("rejects negative counts", () => {
    expect(recordInput.safeParse({ itemCount: -1, kind: "cart_abandoned", lineCount: 1 }).success).toBe(false)
    expect(recordInput.safeParse({ itemCount: 1, kind: "cart_abandoned", lineCount: -1 }).success).toBe(false)
  })

  it("requires both counts", () => {
    expect(recordInput.safeParse({ itemCount: 1, kind: "cart_abandoned" }).success).toBe(false)
  })
})

describe("page_viewed payload", () => {
  it("accepts a path", () => {
    expect(recordInput.parse({ kind: "page_viewed", path: "/products/ring" })).toStrictEqual({
      kind: "page_viewed",
      path: "/products/ring",
    })
  })

  it("rejects a path longer than the column allows", () => {
    const path = `/${"p".repeat(CUSTOMER_ACTIVITY_PAGE_PATH_MAX_LENGTH)}`

    expect(recordInput.safeParse({ kind: "page_viewed", path }).success).toBe(false)
  })
})

describe("record input discrimination", () => {
  it("rejects an unknown kind", () => {
    expect(recordInput.safeParse({ kind: "wishlist_added", path: "/" }).success).toBe(false)
  })

  it("rejects a payload whose fields belong to another kind", () => {
    expect(recordInput.safeParse({ kind: "page_viewed", productTitle: "Ring", quantity: 1, variantId: "var_1" }).success).toBe(false)
  })
})
