import { describe, expect, it } from "vite-plus/test"

import { describeAuditLogChanges } from "~/src/modules/audit-log/audit-log.changes.utils"

const variant = (sku: string, price: number, quantity: number) => ({ price, quantity, sku })

const variantsMetadata = (before: readonly object[], after: readonly object[]) => ({
  changed: ["variants"],
  new: { variants: after },
  old: { variants: before },
})

describe("describeAuditLogChanges for plain fields", () => {
  it("keeps the old and new value of every field the entry changed, in order", () => {
    expect(
      describeAuditLogChanges({
        changed: ["status", "totalStock"],
        new: { status: "published", totalStock: 0 },
        old: { status: "draft", totalStock: 99 },
      }),
    ).toStrictEqual([
      { field: "status", from: "draft", to: "published" },
      { field: "totalStock", from: 99, to: 0 },
    ])
  })

  it("leaves a value the entry did not have, or stored as null, empty", () => {
    expect(
      describeAuditLogChanges({ changed: ["orderStatus", "refundedAmount"], new: { orderStatus: null, refundedAmount: 500 }, old: {} }),
    ).toStrictEqual([
      { field: "orderStatus", from: undefined, to: undefined },
      { field: "refundedAmount", from: undefined, to: 500 },
    ])
  })

  it("spells out a value that is a list or an object instead of printing [object Object]", () => {
    expect(
      describeAuditLogChanges({
        changed: ["tags"],
        new: { tags: [{ handle: "rings", visible: true }, null, "gold"] },
        old: { tags: { handle: "rings", ranks: [1, 2] } },
      }),
    ).toStrictEqual([{ field: "tags", from: "handle: rings, ranks: (1, 2)", to: "(handle: rings, visible: true), —, gold" }])
  })

  it.each([[undefined], [{ changed: "status" }], [{ changed: ["status"], new: { status: "draft" } }]])(
    "describes nothing for metadata %j that records no changes",
    (metadata) => {
      expect(describeAuditLogChanges(metadata)).toBeUndefined()
    },
  )
})

describe("describeAuditLogChanges for variants", () => {
  it("names the variant whose stock moved and how", () => {
    const metadata = variantsMetadata([variant("MB-1", 12_000, 99)], [variant("MB-1", 12_000, 0)])

    expect(describeAuditLogChanges(metadata)).toStrictEqual([
      {
        field: "variants",
        variants: [{ change: "updated", price: undefined, quantity: { from: 99, to: 0 }, sku: "MB-1" }],
      },
    ])
  })

  it("names the variant whose price moved and how", () => {
    const metadata = variantsMetadata([variant("MB-1", 12_000, 5)], [variant("MB-1", 9900, 5)])

    expect(describeAuditLogChanges(metadata)).toStrictEqual([
      {
        field: "variants",
        variants: [{ change: "updated", price: { from: 12_000, to: 9900 }, quantity: undefined, sku: "MB-1" }],
      },
    ])
  })

  it("lists added variants before removed ones, which is how a renamed SKU reads", () => {
    const metadata = variantsMetadata(
      [variant("MB-1", 12_000, 5), variant("MB-2", 9900, 1)],
      [variant("MB-1", 12_000, 5), variant("MB-3", 9900, 1)],
    )

    expect(describeAuditLogChanges(metadata)).toStrictEqual([
      {
        field: "variants",
        variants: [
          { change: "added", sku: "MB-3" },
          { change: "removed", sku: "MB-2" },
        ],
      },
    ])
  })

  it("pairs variants without a SKU in the order they were stored", () => {
    const metadata = variantsMetadata([variant("", 100, 1), variant("", 200, 2)], [variant("", 100, 1), variant("", 200, 0)])

    expect(describeAuditLogChanges(metadata)).toStrictEqual([
      {
        field: "variants",
        variants: [{ change: "updated", price: undefined, quantity: { from: 2, to: 0 }, sku: "" }],
      },
    ])
  })

  it("drops a variants entry whose variants read the same on both sides", () => {
    const metadata = variantsMetadata([variant("MB-1", 100, 1)], [variant("MB-1", 100, 1)])

    expect(describeAuditLogChanges(metadata)).toStrictEqual([])
  })

  it("spells out variants stored in a shape it does not know", () => {
    expect(describeAuditLogChanges(variantsMetadata([{ code: "MB-1" }], [{ code: "MB-2" }]))).toStrictEqual([
      { field: "variants", from: "(code: MB-1)", to: "(code: MB-2)" },
    ])
  })
})
