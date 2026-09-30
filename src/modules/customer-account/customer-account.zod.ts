import zod from "zod/v4"

const MAX_PHONE_LENGTH = 32

const MAX_NAME_LENGTH = 120

export const customerAccountZodSchemas = {
  orderIdInput: zod.object({
    orderId: zod.string().min(1),
  }),
  phoneInput: zod.object({
    phone: zod.string().max(MAX_PHONE_LENGTH),
  }),
  profileForm: zod.object({
    name: zod.string().trim().min(1).max(MAX_NAME_LENGTH),
    phone: zod.string().trim().max(MAX_PHONE_LENGTH),
  }),
  sessionIdInput: zod.object({
    sessionId: zod.string().min(1),
  }),
}
