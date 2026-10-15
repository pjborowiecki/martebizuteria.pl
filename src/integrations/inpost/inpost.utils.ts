import { INPOST_TRACKING_PAGE_URL } from "~/src/integrations/inpost/inpost.constants"
import { type InpostLockerPoint, type InpostPointParsed, inpostLockerPointSchema } from "~/src/integrations/inpost/inpost.zod"

import { tryParseJsonRecord } from "~/src/modules/_core/utils/json"

export const inpostTrackingUrl = (trackingNumber: string): string =>
  `${INPOST_TRACKING_PAGE_URL}?number=${encodeURIComponent(trackingNumber)}`

const filled = (value: string | null | undefined): string | undefined => {
  const trimmed = value?.trim()

  return trimmed === undefined || trimmed === "" ? undefined : trimmed
}

export const serializeInpostLockerPoint = ({ address_details: address, location_description: description }: InpostPointParsed): string =>
  JSON.stringify({
    buildingNumber: filled(address.building_number),
    city: address.city,
    description: filled(description),
    postalCode: address.post_code,
    street: address.street,
  })

export const parseInpostLockerPoint = (raw: string | null): InpostLockerPoint | undefined =>
  inpostLockerPointSchema.safeParse(tryParseJsonRecord(raw)).data

export const formatInpostLockerAddress = ({ buildingNumber, city, postalCode, street }: InpostLockerPoint): readonly string[] => [
  buildingNumber === undefined ? street : `${street} ${buildingNumber}`,
  `${postalCode} ${city}`,
]
