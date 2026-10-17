import zod from "zod/v4"

import { pageField, pageSizeField, searchTermField } from "~/src/modules/_core/utils/zod-fields"
import {
  CUSTOMER_ACCOUNT_LOGIN_STATUSES,
  CUSTOMER_ACCOUNT_NAME_MAX_LENGTH,
  CUSTOMER_ACCOUNT_ORDER_FILTERS,
  CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH,
} from "~/src/modules/customer-account/customer-account.constants"

const FIRST_ORDERS_PAGE = 1

const CLOSE_ACCOUNT_CONFIRMATION = "delete"

export const closeAccountFormSchema = (hasPassword: boolean) =>
  zod.object({
    confirmation: zod.string().refine((value) => value.trim().toLowerCase() === CLOSE_ACCOUNT_CONFIRMATION, "confirmationMismatch"),
    password: hasPassword ? zod.string().min(1, "passwordRequired") : zod.string(),
  })

export type CloseAccountFormValues = zod.infer<ReturnType<typeof closeAccountFormSchema>>

export const customerAccountZodSchemas = {
  loginHistoryPageInput: zod.object({
    page: pageField.optional(),
    pageSize: pageSizeField.optional(),
    search: searchTermField.optional(),
    status: zod.enum(CUSTOMER_ACCOUNT_LOGIN_STATUSES).optional(),
  }),
  orderIdInput: zod.object({
    orderId: zod.string().min(1),
  }),
  ordersPageInput: zod.object({
    filter: zod.enum(CUSTOMER_ACCOUNT_ORDER_FILTERS).default("all"),
    page: zod.coerce.number().int().min(FIRST_ORDERS_PAGE).default(FIRST_ORDERS_PAGE),
  }),
  phoneInput: zod.object({
    phone: zod.string().trim().max(CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH),
  }),
  profileForm: zod.object({
    name: zod.string().trim().min(1, "nameRequired").max(CUSTOMER_ACCOUNT_NAME_MAX_LENGTH, "nameMaxLength"),
    phone: zod.string().trim().max(CUSTOMER_ACCOUNT_PHONE_MAX_LENGTH, "phoneMaxLength"),
  }),
  sessionIdInput: zod.object({
    sessionId: zod.string().min(1),
  }),
}
