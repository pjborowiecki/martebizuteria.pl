import { describe, expect, it, vi } from "vite-plus/test"

const { env } = vi.hoisted(() => ({ env: {} }))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { paymentIntents: { retrieve: vi.fn() } } }))
vi.mock("~/src/lib/image", () => ({ PLACEHOLDER_IMAGE: "https://assets.test/placeholder.svg" }))
vi.mock("~/src/lib/url", () => ({
  getBaseURL: () => "https://fallback.test",
  resolveAssetURL: (src: string) => `https://assets.test/${src}`,
}))

import {
  type OrderShipmentEmailSource,
  buildOrderShippedAccountCta,
  buildOrderShippedDetails,
  resolveOrderTracking,
  toOrderShipmentEmailSource,
} from "~/src/modules/order/order.email.utils"

import englishConfirmationCopy from "~/messages/en-US/emails.order-confirmation.json"
import englishCopy from "~/messages/en-US/emails.order-shipped.json"
import polishConfirmationCopy from "~/messages/pl-PL/emails.order-confirmation.json"
import polishCopy from "~/messages/pl-PL/emails.order-shipped.json"

const addressRow = {
  address1: "Krucza 1",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: null,
  postalCode: "00-001",
  province: null,
}

const INPOST = { name: "InPost" }

const COURIER_NAMES = { "en-US": "InPost courier", "pl-PL": "Kurier InPost" }

const LOCKER_NAMES = { "en-US": "InPost parcel locker", "pl-PL": "Paczkomat InPost" }

const METHOD_NAMES = { "en-US": "Method", "pl-PL": "Metoda" }

const shipment: OrderShipmentEmailSource = {
  deliveryMethod: { courier: INPOST, names: COURIER_NAMES, type: "courier" },
  lockerId: null,
  lockerPoint: null,
  shippingAddress: addressRow,
  trackingNumber: undefined,
  trackingUrl: undefined,
}

describe("buildOrderShippedDetails", () => {
  it("renders the delivery method and the shipping address of the order, naming both in the order's language", () => {
    const details = buildOrderShippedDetails(shipment, englishCopy, "en-US")

    expect(details.deliveryMethod).toBe("InPost courier")
    expect(buildOrderShippedDetails(shipment, polishCopy, "pl-PL").deliveryMethod).toBe("Kurier InPost")
    expect(details.destination).toStrictEqual({ address: "Anna Kowalska\nKrucza 1\n00-001 Warszawa, Poland", kind: "address" })
    expect(buildOrderShippedDetails(shipment, polishCopy, "pl-PL").destination).toStrictEqual({
      address: "Anna Kowalska\nKrucza 1\n00-001 Warszawa, Polska",
      kind: "address",
    })
  })

  it("sends a locker shipment to the locker, naming the customer only as its recipient", () => {
    const locker: OrderShipmentEmailSource = {
      ...shipment,
      deliveryMethod: { courier: INPOST, names: LOCKER_NAMES, type: "locker" },
      lockerId: "WAW01A",
      lockerPoint: JSON.stringify({
        buildingNumber: "5",
        city: "Bochnia",
        description: "Przy Biedronce",
        postalCode: "32-700",
        street: "Kazimierza Wielkiego",
      }),
      shippingAddress: { ...addressRow, phone: "+48 501 234 567" },
    }
    const details = buildOrderShippedDetails(locker, englishCopy, "en-US")

    expect(details.deliveryMethod).toBe("InPost parcel locker")
    expect(details.destination).toStrictEqual({
      kind: "locker",
      locker: "WAW01A\nPrzy Biedronce\nKazimierza Wielkiego 5\n32-700 Bochnia",
      recipient: "Anna Kowalska\n+48 501 234 567",
    })
  })

  it("names a locker an older order kept only by its code", () => {
    const details = buildOrderShippedDetails(
      {
        ...shipment,
        deliveryMethod: { courier: INPOST, names: LOCKER_NAMES, type: "locker" },
        lockerId: "WAW01A",
        shippingAddress: undefined,
      },
      englishCopy,
      "en-US",
    )

    expect(details.destination).toStrictEqual({ kind: "locker", locker: "WAW01A", recipient: undefined })
  })

  it.each([["courier"], ["locker"], ["in_store"]] as const)("uses the %s estimated delivery", (type) => {
    const details = buildOrderShippedDetails(
      { ...shipment, deliveryMethod: { courier: INPOST, names: METHOD_NAMES, type } },
      englishCopy,
      "en-US",
    )

    expect(details.estimatedDelivery).toBe(englishCopy.deliveryTiming[type].estimatedDelivery)
  })

  it.each([
    ["courier", englishCopy, englishConfirmationCopy],
    ["locker", englishCopy, englishConfirmationCopy],
    ["courier", polishCopy, polishConfirmationCopy],
    ["locker", polishCopy, polishConfirmationCopy],
  ] as const)("promises the %s transit time the order confirmation and the terms of service give", (type, copy, confirmationCopy) => {
    const details = buildOrderShippedDetails(
      { ...shipment, deliveryMethod: { courier: INPOST, names: METHOD_NAMES, type } },
      copy,
      copy === polishCopy ? "pl-PL" : "en-US",
    )

    expect(details.estimatedDelivery).toBe(confirmationCopy.estimatedDelivery[type])
  })

  it("assumes courier timings and names no carrier when the order lost its delivery method", () => {
    const details = buildOrderShippedDetails({ ...shipment, deliveryMethod: null }, englishCopy, "en-US")

    expect(details.estimatedDelivery).toBe(englishCopy.deliveryTiming.courier.estimatedDelivery)
    expect(details.deliveryMethod).toBe(englishCopy.unavailable)
    expect(details.carrier).toBeUndefined()
  })

  it("falls back to the unavailable copy when the order kept no shipping address", () => {
    expect(buildOrderShippedDetails({ ...shipment, shippingAddress: undefined }, polishCopy, "pl-PL").destination).toStrictEqual({
      address: polishCopy.unavailable,
      kind: "address",
    })
  })
})

describe("resolveOrderTracking", () => {
  it("names the carrier of a parcel sent with InPost", () => {
    expect(resolveOrderTracking(shipment).carrier).toBe("InPost")
  })

  it("names no carrier for a piece collected at the atelier", () => {
    const pickup = {
      ...shipment,
      deliveryMethod: {
        courier: { name: "M'ARTE Atelier" },
        names: { "en-US": "Pickup at the atelier", "pl-PL": "Odbiór w atelier" },
        type: "in_store" as const,
      },
    }

    expect(resolveOrderTracking({ ...pickup, trackingNumber: "A-1" })).toStrictEqual({
      carrier: undefined,
      trackingNumber: "A-1",
      trackingUrl: undefined,
    })
  })

  it("passes the tracking number and link through without the whitespace they were typed with", () => {
    const tracking = resolveOrderTracking({
      ...shipment,
      trackingNumber: "  INP-0042  ",
      trackingUrl: " https://tracking.test/INP-0042 ",
    })

    expect(tracking.trackingNumber).toBe("INP-0042")
    expect(tracking.trackingUrl).toBe("https://tracking.test/INP-0042")
  })

  it("links an InPost number to InPost's tracking page when no link was stored", () => {
    expect(resolveOrderTracking({ ...shipment, trackingNumber: "00259007123456789012" }).trackingUrl).toBe(
      "https://inpost.pl/sledzenie-przesylek?number=00259007123456789012",
    )
  })

  it.each([
    ["blank", "   ", ""],
    ["missing", undefined, undefined],
  ])("leaves the tracking details out when they are %s", (_case, trackingNumber, trackingUrl) => {
    const tracking = resolveOrderTracking({ ...shipment, trackingNumber, trackingUrl })

    expect(tracking.trackingNumber).toBeUndefined()
    expect(tracking.trackingUrl).toBeUndefined()
  })
})

describe("toOrderShipmentEmailSource", () => {
  const checkoutAddress = { ...addressRow, address1: "Checkout 9" }

  const row = { deliveryMethod: shipment.deliveryMethod, lockerId: null, lockerPoint: null, trackingNumber: null, trackingUrl: null }

  it("takes the shipping address from the order's own snapshot and reads blank tracking as none", () => {
    const source = toOrderShipmentEmailSource({
      ...row,
      addresses: [{ ...addressRow, type: "shipping" }],
      checkout: { shippingAddress: checkoutAddress },
    })

    expect(source.shippingAddress?.address1).toBe("Krucza 1")
    expect(source.trackingNumber).toBeUndefined()
    expect(source.trackingUrl).toBeUndefined()
  })

  it("falls back to the checkout's address for an order placed before snapshots", () => {
    expect(
      toOrderShipmentEmailSource({
        ...row,
        addresses: [],
        checkout: { shippingAddress: checkoutAddress },
        trackingNumber: "T-1",
        trackingUrl: "https://t.test/1",
      }),
    ).toMatchObject({ shippingAddress: checkoutAddress, trackingNumber: "T-1", trackingUrl: "https://t.test/1" })
  })
})

describe("buildOrderShippedAccountCta", () => {
  const origin = "http://localhost:3000"

  it("links a signed-in shopper straight to the order on the address the shop used", () => {
    expect(
      buildOrderShippedAccountCta({ locale: "en-US", messages: englishCopy, orderId: "order-1", origin, userId: "user-1" }),
    ).toStrictEqual({
      href: "http://localhost:3000/en-US/account/orders/order-1",
      isGuest: false,
      label: englishCopy.viewOrderCta,
    })
  })

  it.each([[null], [undefined], [""]])("treats the shopper as a guest when the user id is %j", (userId) => {
    expect(buildOrderShippedAccountCta({ locale: "en-US", messages: englishCopy, orderId: "order-1", origin, userId })).toStrictEqual({
      href: "http://localhost:3000/en-US/auth/sign-up",
      isGuest: true,
      label: englishCopy.createAccountCta,
    })
  })

  it("leaves the default locale unprefixed on the production address", () => {
    expect(
      buildOrderShippedAccountCta({
        locale: "pl-PL",
        messages: polishCopy,
        orderId: "order-9",
        origin: "https://martebizuteria.pl",
        userId: "user-1",
      }).href,
    ).toBe("https://martebizuteria.pl/account/orders/order-9")
  })
})
