import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  type ReserveInventoryItem,
  reserveInventoryByVariantLines,
  reserveInventoryForItems,
} from "~/src/modules/inventory/inventory.utils"

const accessors = vi.hoisted(() => ({
  getInventoryByVariantIds: vi.fn<(variantIds: readonly string[]) => Promise<ReadonlyMap<string, { id: string; version: number }>>>(),
  releaseInventoryForItems: vi.fn<(items: readonly { inventoryId: string; qty: number }[]) => Promise<void>>(),
  reserveInventoryRows: vi.fn<(items: readonly { inventoryId: string }[]) => Promise<ReadonlySet<string>>>(),
}))

vi.mock("~/src/modules/inventory/inventory.accessors", () => accessors)

const item = (inventoryId: string, title: string, qty = 1): ReserveInventoryItem => ({
  currentVersion: 3,
  inventoryId,
  qty,
  title,
})

const reserveAllBut = (...failing: string[]) => {
  accessors.reserveInventoryRows.mockImplementation((items) =>
    Promise.resolve(new Set(items.map((entry) => entry.inventoryId).filter((id) => !failing.includes(id)))),
  )
}

describe("reserveInventoryForItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessors.releaseInventoryForItems.mockResolvedValue()
    reserveAllBut()
  })

  it("reserves every item in one call and releases nothing when all succeed", async () => {
    await reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet")])

    expect(accessors.reserveInventoryRows).toHaveBeenCalledExactlyOnceWith([item("inv-a", "Ring"), item("inv-b", "Bracelet")])
    expect(accessors.releaseInventoryForItems).not.toHaveBeenCalled()
  })

  it("asks for the quantity of every line on the same stock row at once", async () => {
    await reserveInventoryForItems([item("inv-a", "Ring", 2), item("inv-a", "Ring", 3)])

    expect(accessors.reserveInventoryRows).toHaveBeenCalledExactlyOnceWith([item("inv-a", "Ring", 5)])
  })

  it("releases nothing for an empty item list", async () => {
    await reserveInventoryForItems([])

    expect(accessors.reserveInventoryRows).toHaveBeenCalledWith([])
    expect(accessors.releaseInventoryForItems).not.toHaveBeenCalled()
  })

  it("names the first failing item in the error it throws", async () => {
    reserveAllBut("inv-b", "inv-c")

    await expect(reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet"), item("inv-c", "Pendant")])).rejects.toThrow(
      "Inventory reservation failed for Bracelet. Stock changed or unavailable.",
    )
  })

  it("rolls back only the items that were actually reserved", async () => {
    reserveAllBut("inv-b")

    await expect(reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet")])).rejects.toThrow()

    expect(accessors.releaseInventoryForItems).toHaveBeenCalledWith([item("inv-a", "Ring")])
  })

  it("still reports the reservation failure when the rollback itself fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    reserveAllBut("inv-b")
    accessors.releaseInventoryForItems.mockRejectedValue(new Error("d1 unavailable"))

    await expect(reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet")])).rejects.toThrow(
      "Inventory reservation failed for Bracelet. Stock changed or unavailable.",
    )
    expect(consoleError).toHaveBeenCalledWith("Failed to roll back partial inventory reservation:", new Error("d1 unavailable"))

    consoleError.mockRestore()
  })

  it("rolls back with an empty list when nothing could be reserved", async () => {
    reserveAllBut("inv-a")

    await expect(reserveInventoryForItems([item("inv-a", "Ring")])).rejects.toThrow()

    expect(accessors.releaseInventoryForItems).toHaveBeenCalledWith([])
  })
})

describe("reserveInventoryByVariantLines", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessors.releaseInventoryForItems.mockResolvedValue()
    accessors.getInventoryByVariantIds.mockResolvedValue(new Map())
    reserveAllBut()
  })

  it("reads every stock row at once and reserves each line against the version it found", async () => {
    accessors.getInventoryByVariantIds.mockResolvedValue(
      new Map([
        ["variant-a", { id: "inv-variant-a", version: 7 }],
        ["variant-b", { id: "inv-variant-b", version: 2 }],
      ]),
    )

    await reserveInventoryByVariantLines([
      { qty: 2, variantId: "variant-a" },
      { qty: 1, variantId: "variant-b" },
    ])

    expect(accessors.getInventoryByVariantIds).toHaveBeenCalledExactlyOnceWith(["variant-a", "variant-b"])
    expect(accessors.reserveInventoryRows).toHaveBeenCalledExactlyOnceWith([
      { currentVersion: 7, inventoryId: "inv-variant-a", qty: 2, title: "variant-a" },
      { currentVersion: 2, inventoryId: "inv-variant-b", qty: 1, title: "variant-b" },
    ])
  })

  it("refuses the whole batch when a variant has no inventory row", async () => {
    accessors.getInventoryByVariantIds.mockResolvedValue(new Map([["variant-a", { id: "inv-a", version: 1 }]]))

    await expect(
      reserveInventoryByVariantLines([
        { qty: 1, variantId: "variant-a" },
        { qty: 1, variantId: "variant-ghost" },
      ]),
    ).rejects.toThrow("Inventory not found for variant variant-ghost.")

    expect(accessors.reserveInventoryRows).not.toHaveBeenCalled()
  })

  it("reserves nothing for an empty line list", async () => {
    await reserveInventoryByVariantLines([])

    expect(accessors.reserveInventoryRows).toHaveBeenCalledWith([])
    expect(accessors.releaseInventoryForItems).not.toHaveBeenCalled()
  })
})
