import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CHECKOUT_ERROR_CODES } from "~/src/integrations/stripe/stripe.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { type ReserveInventoryItem, reserveInventoryForItems } from "~/src/modules/inventory/inventory.utils"

const accessors = vi.hoisted(() => ({
  releaseInventoryForItems: vi.fn<(items: readonly { inventoryId: string; qty: number }[]) => Promise<void>>(),
  reserveInventoryRows: vi.fn<(items: readonly { inventoryId: string }[]) => Promise<ReadonlySet<string>>>(),
}))

vi.mock("~/src/modules/inventory/inventory.accessors", () => accessors)

const item = (inventoryId: string, title: string, qty = 1): ReserveInventoryItem => ({ inventoryId, qty, title })

const reserveAllBut = (...failing: string[]) => {
  accessors.reserveInventoryRows.mockImplementation((items) =>
    Promise.resolve(new Set(items.map((entry) => entry.inventoryId).filter((id) => !failing.includes(id)))),
  )
}

const OUT_OF_STOCK = { code: ERROR_CODES.CONFLICT, message: CHECKOUT_ERROR_CODES.INSUFFICIENT_INVENTORY }

describe("reserveInventoryForItems", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, "warn").mockImplementation(() => {})
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

  it("tells the shopper the stock ran out and names the first failing item in the log", async () => {
    reserveAllBut("inv-b", "inv-c")

    await expect(
      reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet"), item("inv-c", "Pendant")]),
    ).rejects.toMatchObject(OUT_OF_STOCK)
    expect(console.warn).toHaveBeenCalledExactlyOnceWith("Inventory reservation failed for Bracelet. Not enough stock available.")
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

    await expect(reserveInventoryForItems([item("inv-a", "Ring"), item("inv-b", "Bracelet")])).rejects.toMatchObject(OUT_OF_STOCK)
    expect(consoleError).toHaveBeenCalledWith("Failed to roll back partial inventory reservation:", new Error("d1 unavailable"))

    consoleError.mockRestore()
  })

  it("rolls back with an empty list when nothing could be reserved", async () => {
    reserveAllBut("inv-a")

    await expect(reserveInventoryForItems([item("inv-a", "Ring")])).rejects.toThrow()

    expect(accessors.releaseInventoryForItems).toHaveBeenCalledWith([])
  })
})
