import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  type ReserveInventoryItem,
  reserveInventoryByVariantLines,
  reserveInventoryForItems,
} from "~/src/modules/inventory/inventory.utils"

const accessors = vi.hoisted(() => ({
  getInventoryByVariantId: vi.fn<(variantId: string) => Promise<{ id: string; version: number } | undefined>>(),
  releaseInventoryForItems: vi.fn<(items: { inventoryId: string; qty: number }[]) => Promise<void>>(),
  reserveInventory: vi.fn<(input: { inventoryId: string }) => Promise<boolean>>(),
}))

vi.mock("~/src/modules/inventory/inventory.accessors", () => accessors)

const item = (inventoryId: string, title: string, qty = 1): ReserveInventoryItem => ({
  currentVersion: 3,
  inventoryId,
  qty,
  title,
})

describe("reserveInventoryForItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessors.releaseInventoryForItems.mockResolvedValue()
    accessors.reserveInventory.mockResolvedValue(true)
  })

  it("reserves every item and releases nothing when all succeed", async () => {
    await reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet")])

    expect(accessors.reserveInventory).toHaveBeenCalledTimes(2)
    expect(accessors.releaseInventoryForItems).not.toHaveBeenCalled()
  })

  it("passes the optimistic version and quantity through to the accessor", async () => {
    await reserveInventoryForItems([item("inv-a", "Ring", 4)])

    expect(accessors.reserveInventory).toHaveBeenCalledWith({ currentVersion: 3, inventoryId: "inv-a", qty: 4, title: "Ring" })
  })

  it("does nothing for an empty item list", async () => {
    await reserveInventoryForItems([])

    expect(accessors.reserveInventory).not.toHaveBeenCalled()
    expect(accessors.releaseInventoryForItems).not.toHaveBeenCalled()
  })

  it("names the first failing item in the error it throws", async () => {
    accessors.reserveInventory.mockImplementation((input) => Promise.resolve(input.inventoryId !== "inv-b"))

    await expect(reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet"), item("inv-c", "Pendant")])).rejects.toThrow(
      "Inventory reservation failed for Bracelet. Stock changed or unavailable.",
    )
  })

  it("rolls back only the items that were actually reserved", async () => {
    accessors.reserveInventory.mockImplementation((input) => Promise.resolve(input.inventoryId !== "inv-b"))

    await expect(reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet")])).rejects.toThrow()

    expect(accessors.releaseInventoryForItems).toHaveBeenCalledWith([item("inv-a", "Ring")])
  })

  it("still reports the reservation failure when the rollback itself fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    accessors.reserveInventory.mockImplementation((input) => Promise.resolve(input.inventoryId === "inv-a"))
    accessors.releaseInventoryForItems.mockRejectedValue(new Error("d1 unavailable"))

    await expect(reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet")])).rejects.toThrow(
      "Inventory reservation failed for Bracelet. Stock changed or unavailable.",
    )
    expect(consoleError).toHaveBeenCalledWith("Failed to roll back partial inventory reservation:", new Error("d1 unavailable"))

    consoleError.mockRestore()
  })

  it("rolls back with an empty list when nothing could be reserved", async () => {
    accessors.reserveInventory.mockResolvedValue(false)

    await expect(reserveInventoryForItems([item("inv-a", "Ring")])).rejects.toThrow()

    expect(accessors.releaseInventoryForItems).toHaveBeenCalledWith([])
  })
})

describe("reserveInventoryByVariantLines", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    accessors.releaseInventoryForItems.mockResolvedValue()
    accessors.reserveInventory.mockResolvedValue(true)
  })

  it("turns each variant line into a versioned reservation keyed by its inventory row", async () => {
    accessors.getInventoryByVariantId.mockImplementation((variantId) => Promise.resolve({ id: `inv-${variantId}`, version: 7 }))

    await reserveInventoryByVariantLines([
      { qty: 2, variantId: "variant-a" },
      { qty: 1, variantId: "variant-b" },
    ])

    expect(accessors.reserveInventory).toHaveBeenNthCalledWith(1, {
      currentVersion: 7,
      inventoryId: "inv-variant-a",
      qty: 2,
      title: "variant-a",
    })
    expect(accessors.reserveInventory).toHaveBeenNthCalledWith(2, {
      currentVersion: 7,
      inventoryId: "inv-variant-b",
      qty: 1,
      title: "variant-b",
    })
  })

  it("refuses the whole batch when a variant has no inventory row", async () => {
    accessors.getInventoryByVariantId.mockImplementation((variantId) =>
      Promise.resolve(variantId === "variant-a" ? { id: "inv-a", version: 1 } : undefined),
    )

    await expect(
      reserveInventoryByVariantLines([
        { qty: 1, variantId: "variant-a" },
        { qty: 1, variantId: "variant-ghost" },
      ]),
    ).rejects.toThrow("Inventory not found for variant variant-ghost.")

    expect(accessors.reserveInventory).not.toHaveBeenCalled()
  })

  it("reserves nothing for an empty line list", async () => {
    await reserveInventoryByVariantLines([])

    expect(accessors.getInventoryByVariantId).not.toHaveBeenCalled()
    expect(accessors.reserveInventory).not.toHaveBeenCalled()
  })
})
