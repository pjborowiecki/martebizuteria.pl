import { z } from "zod/v4";

const MIN_ORDER_ID_LENGTH = 1;
const MAX_PHONE_LENGTH = 32;

export const customerAccountZodSchemas = {
  orderIdInput: z.object({
    orderId: z.string().min(MIN_ORDER_ID_LENGTH)
  }),
  phoneInput: z.object({
    phone: z.string().max(MAX_PHONE_LENGTH).optional()
  }),
  sessionIdInput: z.object({
    sessionId: z.string().min(MIN_ORDER_ID_LENGTH)
  })
};
