import { env } from "cloudflare:workers"

import { parsePhoneNumberFromString } from "libphonenumber-js/mobile"
import { Buffer } from "node:buffer"

import {
  INPOST_ERROR_CODES,
  INPOST_PARCEL_DIMENSIONS_MM,
  INPOST_TRACKING_PAGE_URL,
  type InpostParcelTemplate,
} from "~/src/integrations/inpost/inpost.constants"
import { type InpostShipment, inpostShipmentSchema } from "~/src/integrations/inpost/inpost.zod"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"

const SHIPX_PRODUCTION_URL = "https://api-shipx-pl.easypack24.net"

const SHIPX_SANDBOX_URL = "https://sandbox-api-shipx-pl.easypack24.net"

const SHIPX_TIMEOUT_MS = 15_000

const PRODUCTION_APP_ENV = "production"

const RECEIVER_COUNTRY = "PL"

const SHIPX_SERVICE = {
  courier: "inpost_courier_standard",
  locker: "inpost_locker_standard",
} as const

const isFilled = (value: string): boolean => Boolean(value) && value.trim() !== ""

export const isInpostShipxConfigured = (): boolean => isFilled(env.INPOST_API_TOKEN) && isFilled(env.INPOST_ORGANIZATION_ID)

export const inpostTrackingUrl = (trackingNumber: string): string =>
  `${INPOST_TRACKING_PAGE_URL}?number=${encodeURIComponent(trackingNumber)}`

const shipxBaseUrl = (appEnv: string): string => (appEnv === PRODUCTION_APP_ENV ? SHIPX_PRODUCTION_URL : SHIPX_SANDBOX_URL)

const unavailable = (): AppError => new AppError(ERROR_CODES.INTERNAL_ERROR, INPOST_ERROR_CODES.UNAVAILABLE)

const refusal = (status: number): AppError => {
  if (status === HTTP_STATUS.UNAUTHORIZED || status === HTTP_STATUS.FORBIDDEN) {
    return new AppError(ERROR_CODES.FORBIDDEN, INPOST_ERROR_CODES.CREDENTIALS_REJECTED)
  }

  if (status < HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    return new AppError(ERROR_CODES.VALIDATION, INPOST_ERROR_CODES.REQUEST_REFUSED)
  }

  return unavailable()
}

const fetchShipx = async (path: string, init: RequestInit): Promise<Response> => {
  try {
    return await fetch(`${shipxBaseUrl(env.APP_ENV)}${path}`, {
      ...init,
      headers: { authorization: `Bearer ${env.INPOST_API_TOKEN.trim()}`, "content-type": "application/json" },
      signal: AbortSignal.timeout(SHIPX_TIMEOUT_MS),
    })
  } catch (error) {
    console.error(`[InPost] ShipX did not answer ${path}`, error)

    throw unavailable()
  }
}

const requestShipx = async (path: string, init: RequestInit = {}): Promise<Response> => {
  if (!isInpostShipxConfigured()) {
    throw new AppError(ERROR_CODES.CONFLICT, INPOST_ERROR_CODES.NOT_CONFIGURED)
  }

  const response = await fetchShipx(path, init)
  if (!response.ok) {
    console.error(`[InPost] ShipX refused ${path} with ${String(response.status)}`, await response.text())

    throw refusal(response.status)
  }

  return response
}

const readShipment = async (response: Response): Promise<InpostShipment> => {
  const parsed = inpostShipmentSchema.safeParse(await response.json())
  if (!parsed.success) {
    console.error("[InPost] ShipX answered with a shipment this shop cannot read", parsed.error)

    throw unavailable()
  }

  return parsed.data
}

const shipxParcel = ({ template, weightKg }: InpostParcel, destination: InpostDestination) => {
  if (destination.type === "locker") {
    return { template }
  }

  if (weightKg === undefined) {
    throw new AppError(ERROR_CODES.VALIDATION, INPOST_ERROR_CODES.WEIGHT_REQUIRED)
  }

  return {
    dimensions: { ...INPOST_PARCEL_DIMENSIONS_MM[template], unit: "mm" },
    weight: { amount: weightKg, unit: "kg" },
  }
}

const shipxReceiverAddress = (destination: InpostDestination) =>
  destination.type === "courier"
    ? {
        city: destination.address.city,
        country_code: destination.address.countryCode,
        line1: destination.address.line1,
        line2: destination.address.line2,
        post_code: destination.address.postalCode,
      }
    : undefined

const shipxShipmentBody = ({ destination, email, firstName, lastName, parcel, phone, reference }: InpostShipmentDraft) => ({
  custom_attributes: destination.type === "locker" ? { target_point: destination.lockerId } : undefined,
  parcels: shipxParcel(parcel, destination),
  receiver: {
    address: shipxReceiverAddress(destination),
    email,
    first_name: firstName,
    last_name: lastName,
    phone: phone === undefined ? undefined : parsePhoneNumberFromString(phone, RECEIVER_COUNTRY)?.nationalNumber,
  },
  reference,
  service: SHIPX_SERVICE[destination.type],
})

export const postShipxShipment = async (draft: InpostShipmentDraft): Promise<InpostShipment> => {
  const body = JSON.stringify(shipxShipmentBody(draft))
  const response = await requestShipx(`/v1/organizations/${encodeURIComponent(env.INPOST_ORGANIZATION_ID.trim())}/shipments`, {
    body,
    method: "POST",
  })

  return readShipment(response)
}

export const fetchShipxShipment = async (shipmentId: string): Promise<InpostShipment> =>
  readShipment(await requestShipx(`/v1/shipments/${encodeURIComponent(shipmentId)}`))

export const fetchShipxLabelPdfBase64 = async (shipmentId: string): Promise<string> => {
  const response = await requestShipx(`/v1/shipments/${encodeURIComponent(shipmentId)}/label`)

  return Buffer.from(await response.arrayBuffer()).toString("base64")
}

interface InpostParcel {
  readonly template: InpostParcelTemplate
  readonly weightKg: number | undefined
}

interface InpostCourierAddress {
  readonly city: string
  readonly countryCode: string
  readonly line1: string
  readonly line2: string | undefined
  readonly postalCode: string | undefined
}

type InpostDestination =
  | { readonly address: InpostCourierAddress; readonly type: "courier" }
  | { readonly lockerId: string; readonly type: "locker" }

export interface InpostShipmentDraft {
  readonly destination: InpostDestination
  readonly email: string
  readonly firstName: string | undefined
  readonly lastName: string | undefined
  readonly parcel: InpostParcel
  readonly phone: string | undefined
  readonly reference: string
}
