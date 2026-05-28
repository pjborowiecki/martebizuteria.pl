import { z } from "zod";

export const inpostAddressDetailsSchema = z.object({
  building_number: z.string().nullable(),
  city: z.string(),
  flat_number: z.string().nullable().optional(),
  post_code: z.string(),
  province: z.string(),
  street: z.string()
});

export const inpostLocationSchema = z.object({
  latitude: z.number(),
  longitude: z.number()
});

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
  status: z.string().optional()
});

export const inpostApiResponseSchema = z.object({
  count: z.number(),
  items: z.array(inpostPointSchema)
});

export type InpostPointParsed = z.infer<typeof inpostPointSchema>;
