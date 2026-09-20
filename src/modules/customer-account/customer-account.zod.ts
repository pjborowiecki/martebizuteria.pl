import { z } from "zod/v4"

const MAX_PHONE_LENGTH = 32

export const customerAccountZodSchemas = {
  orderIdInput: z.object({
    orderId: z.string().min(1),
  }),
  phoneInput: z.object({
    phone: z.string().max(MAX_PHONE_LENGTH).optional(),
  }),
  sessionIdInput: z.object({
    sessionId: z.string().min(1),
  }),
}
