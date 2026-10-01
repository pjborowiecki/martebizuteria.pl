import zod from "zod/v4"

import { CUSTOMER_ACCOUNT_ORDER_FILTERS } from "~/src/modules/customer-account/customer-account.constants"

const MAX_PHONE_LENGTH = 32

const MAX_NAME_LENGTH = 120

const FIRST_ORDERS_PAGE = 1

const CLOSE_ACCOUNT_CONFIRMATION = "delete"

export const closeAccountFormSchema = (hasPassword: boolean) =>
  zod.object({
    confirmation: zod.string().refine((value) => value.trim().toLowerCase() === CLOSE_ACCOUNT_CONFIRMATION, "confirmationMismatch"),
    password: hasPassword ? zod.string().min(1, "passwordRequired") : zod.string(),
  })

export type CloseAccountFormValues = zod.infer<ReturnType<typeof closeAccountFormSchema>>

export const customerAccountZodSchemas = {
  orderIdInput: zod.object({
    orderId: zod.string().min(1),
  }),
  ordersPageInput: zod.object({
    filter: zod.enum(CUSTOMER_ACCOUNT_ORDER_FILTERS).default("all"),
    page: zod.coerce.number().int().min(FIRST_ORDERS_PAGE).default(FIRST_ORDERS_PAGE),
  }),
  phoneInput: zod.object({
    phone: zod.string().trim().max(MAX_PHONE_LENGTH),
  }),
  profileForm: zod.object({
    name: zod.string().trim().min(1, "nameRequired").max(MAX_NAME_LENGTH, "nameMaxLength"),
    phone: zod.string().trim().max(MAX_PHONE_LENGTH, "phoneMaxLength"),
  }),
  sessionIdInput: zod.object({
    sessionId: zod.string().min(1),
  }),
}
