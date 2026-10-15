import { INPOST_TRACKING_PAGE_URL } from "~/src/integrations/inpost/inpost.constants"

export const inpostTrackingUrl = (trackingNumber: string): string =>
  `${INPOST_TRACKING_PAGE_URL}?number=${encodeURIComponent(trackingNumber)}`
