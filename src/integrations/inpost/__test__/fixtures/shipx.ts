export const SHIPX_ORGANIZATION_ID = "1001"

export const SHIPX_SHIPMENT_ID = 1_234_567_890

export const SHIPX_TRACKING_NUMBER = "602677217131630339938736"

export const shipxCreatedShipment = {
  created_at: "2026-10-10T10:53:47.958+02:00",
  custom_attributes: { target_point: "KRA012" },
  href: `https://sandbox-api-shipx-pl.easypack24.net/v1/shipments/${String(SHIPX_SHIPMENT_ID)}`,
  id: SHIPX_SHIPMENT_ID,
  parcels: [{ dimensions: { height: 80, length: 380, unit: "mm", width: 640 }, id: 123, template: "small", tracking_number: null }],
  reference: "MRT-2026-00012",
  service: "inpost_locker_standard",
  status: "created",
  tracking_number: null,
}

export const shipxConfirmedShipment = {
  ...shipxCreatedShipment,
  status: "confirmed",
  tracking_number: SHIPX_TRACKING_NUMBER,
}

export const shipxCanceledShipment = {
  ...shipxConfirmedShipment,
  status: "canceled",
}

export const shipxValidationError = {
  details: { receiver: [{ phone: ["invalid"] }] },
  error: "validation_failed",
  message: "There are some validation errors. Check details object for more info.",
  status: 400,
}

export const shipxUnauthorizedError = {
  description: "Access token is invalid or expired.",
  error: "token_invalid",
  status: 401,
}

export const SHIPX_LABEL_PDF = "%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n"

export const shipxStatusChangedEvent = {
  event: "shipment_status_changed",
  event_ts: "2026-10-10 15:08:42 +0200",
  organization_id: Number(SHIPX_ORGANIZATION_ID),
  payload: { shipment_id: SHIPX_SHIPMENT_ID, status: "delivered", tracking_number: SHIPX_TRACKING_NUMBER },
}
