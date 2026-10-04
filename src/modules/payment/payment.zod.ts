import zod from "zod/v4"

const PAYMENT_METHOD_ID_MAX_LENGTH = 255

export const savedPaymentMethodInput = zod.object({
  paymentMethodId: zod.string().trim().min(1).max(PAYMENT_METHOD_ID_MAX_LENGTH),
})
