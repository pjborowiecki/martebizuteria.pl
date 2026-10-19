import { describe, expect, it } from "vite-plus/test"

import {
  describeOrderDestination,
  describeOrderLocker,
  mapAdminOrderDetailAddress,
  resolveAdminOrderDeliveryLocker,
  resolveOrderLocker,
} from "~/src/modules/order/order.utils"

const LOCKER_POINT = {
  buildingNumber: "12",
  city: "Warszawa",
  description: "Przy sklepie Żabka",
  postalCode: "00-640",
  street: "Mokotowska",
}

const STORED_LOCKER_POINT = JSON.stringify(LOCKER_POINT)

const LOCKER_METHOD = { names: { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" }, type: "locker" } as const

const COURIER_METHOD = { names: { "en-US": "InPost courier", "pl-PL": "Kurier InPost" }, type: "courier" } as const

const shippingAddress = {
  address1: "ul. Mokotowska 12/4",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48 600 123 456",
  postalCode: "00-640",
  province: null,
  type: "shipping" as const,
}

type DestinationRow = Parameters<typeof describeOrderDestination>[0]

const destinationRow = (overrides: Partial<DestinationRow> = {}): DestinationRow => ({
  addresses: [shippingAddress],
  checkout: null,
  deliveryMethod: LOCKER_METHOD,
  lockerId: "WAW01A",
  lockerPoint: STORED_LOCKER_POINT,
  ...overrides,
})

const adminDelivery = (overrides = {}) => ({
  courierCode: "inpost",
  courierName: undefined,
  lockerId: "WAW01A",
  lockerPoint: LOCKER_POINT,
  lockerUnconfirmed: false,
  methodName: "Paczkomat InPost",
  type: "locker" as const,
  ...overrides,
})

describe("mapAdminOrderDetailAddress with blank optional fields", () => {
  it("treats a blank second line, phone, postal code and province as never captured", () => {
    expect(mapAdminOrderDetailAddress({ ...shippingAddress, address2: " ", phone: "", postalCode: "", province: "  " })).toMatchObject({
      line2: undefined,
      phone: undefined,
      postalCode: undefined,
      province: undefined,
    })
  })
})

describe("resolveOrderLocker", () => {
  it("returns the parcel locker and the point stored when the shopper picked it", () => {
    expect(resolveOrderLocker({ deliveryType: "locker", lockerId: "WAW01A", lockerPoint: STORED_LOCKER_POINT })).toStrictEqual({
      code: "WAW01A",
      point: LOCKER_POINT,
    })
  })

  it("keeps the locker code when the stored point is missing or unreadable", () => {
    expect(resolveOrderLocker({ deliveryType: "locker", lockerId: "WAW01A", lockerPoint: null })).toStrictEqual({
      code: "WAW01A",
      point: undefined,
    })
    expect(resolveOrderLocker({ deliveryType: "locker", lockerId: "WAW01A", lockerPoint: '{"city":1}' })?.point).toBeUndefined()
  })

  it("has no locker for a courier delivery or a blank locker code", () => {
    expect(resolveOrderLocker({ deliveryType: "courier", lockerId: "WAW01A", lockerPoint: STORED_LOCKER_POINT })).toBeUndefined()
    expect(resolveOrderLocker({ deliveryType: "locker", lockerId: " ", lockerPoint: STORED_LOCKER_POINT })).toBeUndefined()
    expect(resolveOrderLocker({ deliveryType: "locker", lockerId: null, lockerPoint: null })).toBeUndefined()
    expect(resolveOrderLocker({ deliveryType: undefined, lockerId: "WAW01A", lockerPoint: null })).toBeUndefined()
  })
})

describe("describeOrderLocker", () => {
  it("lists the code, the directions and the address of the locker", () => {
    expect(describeOrderLocker({ code: "WAW01A", point: LOCKER_POINT })).toStrictEqual([
      "WAW01A",
      "Przy sklepie Żabka",
      "Mokotowska 12",
      "00-640 Warszawa",
    ])
  })

  it("leaves out the directions a locker has none for", () => {
    expect(describeOrderLocker({ code: "WAW01A", point: { city: "Warszawa", postalCode: "00-640", street: "Mokotowska" } })).toStrictEqual([
      "WAW01A",
      "Mokotowska",
      "00-640 Warszawa",
    ])
  })

  it("lists only the code when the locker point was never stored", () => {
    expect(describeOrderLocker({ code: "WAW01A", point: undefined })).toStrictEqual(["WAW01A"])
  })
})

describe("describeOrderDestination", () => {
  it("describes a locker order by its parcel locker, never by the shopper's address", () => {
    expect(describeOrderDestination(destinationRow(), "pl-PL")).toBe(
      "Paczkomat InPost: WAW01A, Przy sklepie Żabka, Mokotowska 12, 00-640 Warszawa",
    )
  })

  it("names the delivery method in the language of the admin who exports it", () => {
    expect(describeOrderDestination(destinationRow(), "en-US")).toBe(
      "InPost parcel locker: WAW01A, Przy sklepie Żabka, Mokotowska 12, 00-640 Warszawa",
    )
  })

  it("describes a courier order by the shipping address", () => {
    expect(describeOrderDestination(destinationRow({ deliveryMethod: COURIER_METHOD, lockerId: null, lockerPoint: null }), "pl-PL")).toBe(
      "Kurier InPost: ul. Mokotowska 12/4, 00-640 Warszawa, PL",
    )
  })

  it("keeps the second line and drops a postal code that was never captured", () => {
    const addresses = [{ ...shippingAddress, address2: "lok. 4", postalCode: null }]

    expect(describeOrderDestination(destinationRow({ addresses, deliveryMethod: COURIER_METHOD }), "pl-PL")).toBe(
      "Kurier InPost: ul. Mokotowska 12/4, lok. 4, Warszawa, PL",
    )
  })

  it("names only the method when a courier order has no address", () => {
    expect(describeOrderDestination(destinationRow({ addresses: [], deliveryMethod: COURIER_METHOD }), "pl-PL")).toBe("Kurier InPost")
  })

  it("describes only the address when the order has no delivery method", () => {
    expect(describeOrderDestination(destinationRow({ deliveryMethod: null }), "pl-PL")).toBe("ul. Mokotowska 12/4, 00-640 Warszawa, PL")
  })

  it("has nothing to describe without a delivery method or an address", () => {
    expect(describeOrderDestination(destinationRow({ addresses: [], deliveryMethod: null }), "pl-PL")).toBeUndefined()
  })
})

describe("resolveAdminOrderDeliveryLocker", () => {
  it("returns the parcel locker of a locker delivery", () => {
    expect(resolveAdminOrderDeliveryLocker(adminDelivery())).toStrictEqual({ code: "WAW01A", point: LOCKER_POINT })
  })

  it("has no locker for a courier delivery, a locker delivery without a code or an order without delivery", () => {
    expect(resolveAdminOrderDeliveryLocker(adminDelivery({ type: "courier" }))).toBeUndefined()
    expect(resolveAdminOrderDeliveryLocker(adminDelivery({ lockerId: undefined }))).toBeUndefined()
    expect(resolveAdminOrderDeliveryLocker(undefined)).toBeUndefined()
  })
})
