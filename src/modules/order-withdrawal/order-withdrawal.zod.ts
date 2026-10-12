import zod from "zod/v4"

import { MIN_FIELD_LENGTH, idField } from "~/src/modules/_core/utils/zod-fields"
import {
  ORDER_WITHDRAWAL_EMAIL_MAX_LENGTH,
  ORDER_WITHDRAWAL_ITEMS_MAX_COUNT,
  ORDER_WITHDRAWAL_NAME_MAX_LENGTH,
  ORDER_WITHDRAWAL_ORDER_NUMBER_MAX_LENGTH,
  ORDER_WITHDRAWAL_SCOPE,
  ORDER_WITHDRAWAL_SCOPES,
  ORDER_WITHDRAWAL_TEXT_MAX_LENGTH,
  type OrderWithdrawalScope,
} from "~/src/modules/order-withdrawal/order-withdrawal.constants"

const statementFields = {
  consumerName: zod.string().trim().min(MIN_FIELD_LENGTH, "nameRequired").max(ORDER_WITHDRAWAL_NAME_MAX_LENGTH, "nameMaxLength"),
  reason: zod.string().trim().max(ORDER_WITHDRAWAL_TEXT_MAX_LENGTH, "reasonMaxLength"),
  scope: zod.enum(ORDER_WITHDRAWAL_SCOPES),
}

const customerFields = zod.object({
  ...statementFields,
  orderItemIds: zod.array(zod.string().min(MIN_FIELD_LENGTH)).max(ORDER_WITHDRAWAL_ITEMS_MAX_COUNT),
})

const guestFields = zod.object({
  ...statementFields,
  email: zod.string().trim().pipe(zod.email("emailInvalid").max(ORDER_WITHDRAWAL_EMAIL_MAX_LENGTH, "emailInvalid")),
  items: zod.string().trim().max(ORDER_WITHDRAWAL_TEXT_MAX_LENGTH, "itemsMaxLength"),
  orderNumber: zod
    .string({ error: "orderNumberRequired" })
    .trim()
    .toUpperCase()
    .min(MIN_FIELD_LENGTH, "orderNumberRequired")
    .max(ORDER_WITHDRAWAL_ORDER_NUMBER_MAX_LENGTH, "orderNumberMaxLength"),
})

const choosesItemsWhenPartial = ({ orderItemIds, scope }: Readonly<{ orderItemIds: readonly string[]; scope: OrderWithdrawalScope }>) =>
  scope === ORDER_WITHDRAWAL_SCOPE.ORDER || orderItemIds.length > 0

const namesItemsWhenPartial = ({ items, scope }: Readonly<{ items: string; scope: OrderWithdrawalScope }>) =>
  scope === ORDER_WITHDRAWAL_SCOPE.ORDER || items !== ""

const CHOSEN_ITEMS_REQUIRED = { message: "itemsRequired", path: ["orderItemIds"] }

const NAMED_ITEMS_REQUIRED = { message: "itemsRequired", path: ["items"] }

export const orderWithdrawalZodSchemas = {
  customerForm: customerFields.refine(choosesItemsWhenPartial, CHOSEN_ITEMS_REQUIRED),
  customerInput: customerFields.extend({ orderId: idField }).refine(choosesItemsWhenPartial, CHOSEN_ITEMS_REQUIRED),
  guestForm: guestFields.refine(namesItemsWhenPartial, NAMED_ITEMS_REQUIRED),
  orderIdInput: zod.object({ orderId: idField }),
}
