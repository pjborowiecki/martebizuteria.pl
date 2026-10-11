import { z } from "zod"

import { INPOST_PARCEL_TEMPLATES } from "~/src/integrations/inpost/inpost.constants"

export const inpostAddressDetailsSchema = z.object({
  building_number: z.string().nullable(),
  city: z.string(),
  flat_number: z.string().nullable().optional(),
  post_code: z.string(),
  province: z.string(),
  street: z.string(),
})

export const inpostLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

export const inpostPointSchema = z.object({
  address_details: inpostAddressDetailsSchema,
  location: inpostLocationSchema,
  location_description: z
    .string()
    .nullable()
    .optional()
    .transform((val) => val ?? ""),
  location_type: z.string().optional(),
  name: z.string(),
  opening_hours: z.string().optional(),
  payment_available: z.boolean().optional(),
  status: z.string().optional(),
})

export const inpostApiResponseSchema = z.object({
  count: z.number(),
  items: z.array(inpostPointSchema),
})

export type InpostPointParsed = z.infer<typeof inpostPointSchema>

export const inpostParcelTemplateSchema = z.enum(INPOST_PARCEL_TEMPLATES)

export const inpostShipmentSchema = z.object({
  id: z.number().int(),
  status: z.string(),
  tracking_number: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
})

export const inpostWebhookEventSchema = z.object({
  event: z.string(),
  organization_id: z.number().int(),
  payload: z.object({
    shipment_id: z.number().int(),
  }),
})

export type InpostShipment = z.infer<typeof inpostShipmentSchema>
