import { describe, expect, it } from "vite-plus/test"

import { DELIVERY_METHOD_ERROR } from "~/src/modules/delivery-method/delivery-method.constants"
import { resolveOfferedDeliveryConflict, toDeliveryMethodAuditSnapshot } from "~/src/modules/delivery-method/delivery-method.utils"

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
