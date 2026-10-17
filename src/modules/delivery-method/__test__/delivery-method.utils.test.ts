import { describe, expect, it } from "vite-plus/test"

import { DELIVERY_METHOD_ERROR } from "~/src/modules/delivery-method/delivery-method.constants"
import {
  resolveDeliveryMethodStatus,
  resolveDeliveryPrice,
  resolveFreeDeliveryShortfall,
  resolveOfferedDeliveryConflict,
  toDeliveryMethodAuditSnapshot,
} from "~/src/modules/delivery-method/delivery-method.utils"

const OFFERED = [
  { id: "courier", type: "courier" },
  { id: "locker", type: "locker" },
  { id: "pickup", type: "in_store" },
] as const

describe("resolveOfferedDeliveryConflict", () => {
  it.each(["courier", "locker", "in_store"] as const)("lets the checkout keep offering its own %s method", (type) => {
    const id = OFFERED.find((method) => method.type === type)?.id

    expect(resolveOfferedDeliveryConflict({ candidate: { id, isOffered: true, type }, offered: OFFERED })).toBeUndefined()
  })

  it("offers any number of courier methods", () => {
    expect(
      resolveOfferedDeliveryConflict({ candidate: { id: undefined, isOffered: true, type: "courier" }, offered: OFFERED }),
    ).toBeUndefined()
  })

  it.each(["locker", "in_store"] as const)("offers only one %s method at a time", (type) => {
    expect(resolveOfferedDeliveryConflict({ candidate: { id: undefined, isOffered: true, type }, offered: OFFERED })).toBe(
      DELIVERY_METHOD_ERROR.TYPE_ALREADY_OFFERED,
    )
  })

  it("lets a method be switched off while another is still offered", () => {
    expect(
      resolveOfferedDeliveryConflict({ candidate: { id: "courier", isOffered: false, type: "courier" }, offered: OFFERED }),
    ).toBeUndefined()
  })

  it("keeps the last offered method on", () => {
    expect(resolveOfferedDeliveryConflict({ candidate: { id: "courier", isOffered: false, type: "courier" }, offered: [OFFERED[0]] })).toBe(
      DELIVERY_METHOD_ERROR.LAST_OFFERED,
    )
  })

  it("adds a hidden method to a shop that offers nothing yet", () => {
    expect(resolveOfferedDeliveryConflict({ candidate: { id: undefined, isOffered: false, type: "courier" }, offered: [] })).toBeUndefined()
  })
})

describe("toDeliveryMethodAuditSnapshot", () => {
  it("records the names, the price and whether the checkout offers the method", () => {
    expect(toDeliveryMethodAuditSnapshot({ isActive: false, names: { "en-US": "Courier", "pl-PL": "Kurier" }, price: 1999 })).toStrictEqual(
      { availability: "hidden", nameEn: "Courier", namePl: "Kurier", price: 1999 },
    )
    expect(toDeliveryMethodAuditSnapshot({ isActive: true, names: { "en-US": "", "pl-PL": "" }, price: 0 }).availability).toBe("offered")
  })
})

describe("free delivery", () => {
  const TENTH_OFF = { amountMinorUnits: 3000, type: "percentage" as const }
  const FREE_SHIPPING_CODE = { amountMinorUnits: 1999, type: "free_shipping" as const }

  it("charges the method's price when the shop sets no threshold", () => {
    expect(resolveDeliveryPrice({ discount: undefined, freeDeliveryThreshold: undefined, itemsSubtotal: 99_900, price: 1999 })).toBe(1999)
    expect(resolveFreeDeliveryShortfall({ discount: undefined, freeDeliveryThreshold: undefined, itemsSubtotal: 99_900 })).toBeUndefined()
  })

  it("delivers for free once the products reach the threshold, and says how much is missing before that", () => {
    expect(resolveDeliveryPrice({ discount: undefined, freeDeliveryThreshold: 30_000, itemsSubtotal: 30_000, price: 1999 })).toBe(0)
    expect(resolveDeliveryPrice({ discount: undefined, freeDeliveryThreshold: 30_000, itemsSubtotal: 29_999, price: 1999 })).toBe(1999)
    expect(resolveFreeDeliveryShortfall({ discount: undefined, freeDeliveryThreshold: 30_000, itemsSubtotal: 25_000 })).toBe(5000)
    expect(resolveFreeDeliveryShortfall({ discount: undefined, freeDeliveryThreshold: 30_000, itemsSubtotal: 40_000 })).toBe(0)
  })

  it("counts the products after a discount code that takes money off them", () => {
    expect(resolveDeliveryPrice({ discount: TENTH_OFF, freeDeliveryThreshold: 30_000, itemsSubtotal: 32_000, price: 1999 })).toBe(1999)
    expect(resolveFreeDeliveryShortfall({ discount: TENTH_OFF, freeDeliveryThreshold: 30_000, itemsSubtotal: 32_000 })).toBe(1000)
  })

  it("ignores a free shipping code, which takes nothing off the products", () => {
    expect(resolveDeliveryPrice({ discount: FREE_SHIPPING_CODE, freeDeliveryThreshold: 30_000, itemsSubtotal: 30_000, price: 1999 })).toBe(
      0,
    )
  })
})

describe("resolveDeliveryMethodStatus", () => {
  const ACTIVE_CARRIER = { id: "inpost", internalCode: "inpost", isActive: true, name: "InPost" }

  it("calls a method the checkout shows offered", () => {
    expect(resolveDeliveryMethodStatus({ archivedAt: undefined, courier: ACTIVE_CARRIER, isActive: true })).toBe("offered")
  })

  it("calls a method hidden when it or its carrier is switched off", () => {
    expect(resolveDeliveryMethodStatus({ archivedAt: undefined, courier: ACTIVE_CARRIER, isActive: false })).toBe("hidden")
    expect(resolveDeliveryMethodStatus({ archivedAt: undefined, courier: { ...ACTIVE_CARRIER, isActive: false }, isActive: true })).toBe(
      "hidden",
    )
  })

  it("calls an archived method archived whatever its switches say", () => {
    expect(resolveDeliveryMethodStatus({ archivedAt: new Date("2026-10-01T00:00:00.000Z"), courier: ACTIVE_CARRIER, isActive: true })).toBe(
      "archived",
    )
  })
})
