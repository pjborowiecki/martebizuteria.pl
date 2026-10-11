export const INPOST_QUERY_KEYS = {
  BY_CITY: ["inpost-points", "city"] as const,
} as const

export const INPOST_POINT_NAME_PATTERN = /^[\dA-Z][\w-]{2,31}$/iu

export const INPOST_POINTS_API_ORIGIN = "https://api-pl-points.easypack24.net"

export const INPOST_PARCEL_TEMPLATES = ["small", "medium", "large"] as const

export type InpostParcelTemplate = (typeof INPOST_PARCEL_TEMPLATES)[number]

export const INPOST_PARCEL_DIMENSIONS_MM: Readonly<Record<InpostParcelTemplate, InpostParcelDimensions>> = {
  large: { height: 410, length: 380, width: 640 },
  medium: { height: 190, length: 380, width: 640 },
  small: { height: 80, length: 380, width: 640 },
}

export const INPOST_PARCEL_MAX_WEIGHT_KG = 25

export const INPOST_TRACKING_PAGE_URL = "https://inpost.pl/sledzenie-przesylek"

export const INPOST_CANCELED_SHIPMENT_STATUS = "canceled"

export const INPOST_WEBHOOK_RATE_LIMIT = 120

export const INPOST_ERROR_CODES = {
  CREDENTIALS_REJECTED: "INPOST_CREDENTIALS_REJECTED",
  NOT_CONFIGURED: "INPOST_NOT_CONFIGURED",
  REQUEST_REFUSED: "INPOST_REQUEST_REFUSED",
  UNAVAILABLE: "INPOST_UNAVAILABLE",
  WEIGHT_REQUIRED: "INPOST_WEIGHT_REQUIRED",
} as const

interface InpostParcelDimensions {
  readonly height: number
  readonly length: number
  readonly width: number
}
