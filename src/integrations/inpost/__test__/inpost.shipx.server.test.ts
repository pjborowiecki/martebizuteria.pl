import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { env } = vi.hoisted(() => ({
  env: { APP_ENV: "preview", INPOST_API_TOKEN: "shipx-token", INPOST_ORGANIZATION_ID: "1001" } as Record<string, string | undefined>,
}))

vi.mock("cloudflare:workers", () => ({ env }))

import {
  SHIPX_LABEL_PDF,
  SHIPX_SHIPMENT_ID,
  SHIPX_TRACKING_NUMBER,
  shipxConfirmedShipment,
  shipxCreatedShipment,
  shipxUnauthorizedError,
  shipxValidationError,
} from "~/src/integrations/inpost/__test__/fixtures/shipx"
import { INPOST_ERROR_CODES } from "~/src/integrations/inpost/inpost.constants"
import {
  type InpostShipmentDraft,
  fetchShipxLabelPdfBase64,
  fetchShipxShipment,
  isInpostShipxConfigured,
  postShipxShipment,
} from "~/src/integrations/inpost/inpost.shipx.server"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const fetchMock = vi.fn<typeof fetch>()

const lockerDraft: InpostShipmentDraft = {
  destination: { lockerId: "KRA012", type: "locker" },
  email: "anna@example.test",
  firstName: "Anna",
  lastName: "Kowalska",
  parcel: { template: "small", weightKg: undefined },
  phone: "+48 501 234 567",
  reference: "MRT-2026-00012",
}

const courierDraft: InpostShipmentDraft = {
  ...lockerDraft,
  destination: {
    address: { city: "Warszawa", countryCode: "PL", line1: "ul. Krucza 1/4", line2: undefined, postalCode: "00-001" },
    type: "courier",
  },
  parcel: { template: "medium", weightKg: 0.4 },
}

const lastRequest = (): { readonly init: RequestInit | undefined; readonly url: string } => {
  const [input, init] = fetchMock.mock.calls.at(-1) ?? []
  if (typeof input !== "string") {
    throw new TypeError("ShipX was never asked")
  }

  return { init, url: input }
}

const sentBody = (): unknown => {
  const { body } = lastRequest().init ?? {}
  if (typeof body !== "string") {
    throw new TypeError("ShipX was sent no JSON body")
  }

  return JSON.parse(body)
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal("fetch", fetchMock)
  env["APP_ENV"] = "preview"
  env["INPOST_API_TOKEN"] = "shipx-token"
  env["INPOST_ORGANIZATION_ID"] = "1001"
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe("isInpostShipxConfigured", () => {
  it("is ready once the shop has a ShipX token and organisation id", () => {
    expect(isInpostShipxConfigured()).toBe(true)
  })

  it.each([
    ["an unset token", "INPOST_API_TOKEN", undefined],
    ["a blank token", "INPOST_API_TOKEN", ""],
    ["a whitespace token", "INPOST_API_TOKEN", "   "],
    ["an unset organisation id", "INPOST_ORGANIZATION_ID", undefined],
    ["a blank organisation id", "INPOST_ORGANIZATION_ID", ""],
  ])("is not ready with %s", (_label, name, value) => {
    env[name] = value

    expect(isInpostShipxConfigured()).toBe(false)
  })
})

describe("postShipxShipment", () => {
  it("books a locker parcel in the organisation's sandbox outside production", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(shipxCreatedShipment, { status: 201 }))

    await expect(postShipxShipment(lockerDraft)).resolves.toStrictEqual({
      id: SHIPX_SHIPMENT_ID,
      status: "created",
      tracking_number: undefined,
    })

    const { init, url } = lastRequest()
    expect(url).toBe("https://sandbox-api-shipx-pl.easypack24.net/v1/organizations/1001/shipments")
    expect(init?.method).toBe("POST")
    expect(init?.headers).toStrictEqual({ authorization: "Bearer shipx-token", "content-type": "application/json" })
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(sentBody()).toStrictEqual({
      custom_attributes: { target_point: "KRA012" },
      parcels: { template: "small" },
      receiver: { email: "anna@example.test", first_name: "Anna", last_name: "Kowalska", phone: "501234567" },
      reference: "MRT-2026-00012",
      service: "inpost_locker_standard",
    })
  })

  it("books a courier parcel at the shipping address with its size and weight", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(shipxCreatedShipment, { status: 201 }))

    await postShipxShipment(courierDraft)

    expect(sentBody()).toStrictEqual({
      parcels: { dimensions: { height: 190, length: 380, unit: "mm", width: 640 }, weight: { amount: 0.4, unit: "kg" } },
      receiver: {
        address: { city: "Warszawa", country_code: "PL", line1: "ul. Krucza 1/4", post_code: "00-001" },
        email: "anna@example.test",
        first_name: "Anna",
        last_name: "Kowalska",
        phone: "501234567",
      },
      reference: "MRT-2026-00012",
      service: "inpost_courier_standard",
    })
  })

  it("uses InPost's production API in production", async () => {
    env["APP_ENV"] = "production"
    fetchMock.mockResolvedValueOnce(Response.json(shipxCreatedShipment, { status: 201 }))

    await postShipxShipment(lockerDraft)

    expect(lastRequest().url).toBe("https://api-shipx-pl.easypack24.net/v1/organizations/1001/shipments")
  })

  it("leaves out a phone number the order does not have", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(shipxCreatedShipment, { status: 201 }))

    await postShipxShipment({ ...lockerDraft, phone: undefined })

    expect(sentBody()).toMatchObject({ receiver: { email: "anna@example.test" } })
    expect(sentBody()).not.toHaveProperty("receiver.phone")
  })

  it("refuses a courier parcel without a weight before asking InPost", async () => {
    await expect(postShipxShipment({ ...courierDraft, parcel: { template: "small", weightKg: undefined } })).rejects.toMatchObject({
      code: ERROR_CODES.VALIDATION,
      message: INPOST_ERROR_CODES.WEIGHT_REQUIRED,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("explains that InPost is not set up instead of calling it without credentials", async () => {
    env["INPOST_API_TOKEN"] = ""

    await expect(postShipxShipment(lockerDraft)).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: INPOST_ERROR_CODES.NOT_CONFIGURED,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    { body: shipxValidationError, code: ERROR_CODES.VALIDATION, reason: INPOST_ERROR_CODES.REQUEST_REFUSED, status: 400 },
    { body: shipxUnauthorizedError, code: ERROR_CODES.FORBIDDEN, reason: INPOST_ERROR_CODES.CREDENTIALS_REJECTED, status: 401 },
    { body: shipxUnauthorizedError, code: ERROR_CODES.FORBIDDEN, reason: INPOST_ERROR_CODES.CREDENTIALS_REJECTED, status: 403 },
    { body: { error: "unavailable" }, code: ERROR_CODES.INTERNAL_ERROR, reason: INPOST_ERROR_CODES.UNAVAILABLE, status: 503 },
  ])("logs ShipX's answer and reports a $status as $reason", async ({ body, code, reason, status }) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(Response.json(body, { status }))

    await expect(postShipxShipment(lockerDraft)).rejects.toMatchObject({ code, message: reason })
    expect(log).toHaveBeenCalledWith(`[InPost] ShipX refused /v1/organizations/1001/shipments with ${String(status)}`, JSON.stringify(body))
  })

  it("reports InPost as unavailable when the request never gets an answer", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const timeout = new DOMException("The operation timed out.", "TimeoutError")
    fetchMock.mockRejectedValueOnce(timeout)

    await expect(postShipxShipment(lockerDraft)).rejects.toMatchObject({
      code: ERROR_CODES.INTERNAL_ERROR,
      message: INPOST_ERROR_CODES.UNAVAILABLE,
    })
    expect(log).toHaveBeenCalledWith("[InPost] ShipX did not answer /v1/organizations/1001/shipments", timeout)
  })

  it("reports InPost as unavailable when it answers with a shipment the shop cannot read", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    fetchMock.mockResolvedValueOnce(Response.json({ id: "not-a-number", status: "created" }, { status: 201 }))

    await expect(postShipxShipment(lockerDraft)).rejects.toMatchObject({ message: INPOST_ERROR_CODES.UNAVAILABLE })
    expect(log).toHaveBeenCalledWith("[InPost] ShipX answered with a shipment this shop cannot read", expect.anything())
  })
})

describe("fetchShipxShipment", () => {
  it("reads the shipment's status and the tracking number InPost assigned", async () => {
    fetchMock.mockResolvedValueOnce(Response.json(shipxConfirmedShipment))

    await expect(fetchShipxShipment(String(SHIPX_SHIPMENT_ID))).resolves.toStrictEqual({
      id: SHIPX_SHIPMENT_ID,
      status: "confirmed",
      tracking_number: SHIPX_TRACKING_NUMBER,
    })
    expect(lastRequest().url).toBe(`https://sandbox-api-shipx-pl.easypack24.net/v1/shipments/${String(SHIPX_SHIPMENT_ID)}`)
  })

  it("reads a shipment whose tracking number InPost leaves out", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ id: SHIPX_SHIPMENT_ID, status: "offers_prepared" }))

    const shipment = await fetchShipxShipment(String(SHIPX_SHIPMENT_ID))

    expect(shipment.status).toBe("offers_prepared")
    expect(shipment.tracking_number).toBeUndefined()
  })
})

describe("fetchShipxLabelPdfBase64", () => {
  it("downloads the shipment's PDF label as base64 for the admin to save", async () => {
    fetchMock.mockResolvedValueOnce(new Response(SHIPX_LABEL_PDF, { headers: { "content-type": "application/pdf" } }))

    const label = await fetchShipxLabelPdfBase64(String(SHIPX_SHIPMENT_ID))

    expect(Buffer.from(label, "base64").toString("utf8")).toBe(SHIPX_LABEL_PDF)
    expect(lastRequest().url).toBe(`https://sandbox-api-shipx-pl.easypack24.net/v1/shipments/${String(SHIPX_SHIPMENT_ID)}/label`)
  })
})
