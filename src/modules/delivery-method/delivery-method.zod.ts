import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURIER_NAME_MAX_LENGTH } from "~/src/modules/courier/courier.constants"
import {
  DELIVERY_METHODS,
  DELIVERY_METHOD_NAME_MAX_LENGTH,
  DELIVERY_METHOD_PRICE_MAX,
} from "~/src/modules/delivery-method/delivery-method.constants"

const nameField = zod.string().trim().min(1, "nameRequired").max(DELIVERY_METHOD_NAME_MAX_LENGTH, "nameTooLong")

const priceField = zod.int("priceInvalid").min(0, "priceInvalid").max(DELIVERY_METHOD_PRICE_MAX, "priceTooHigh")

const courierField = zod.union([
  zod.object({ id: zod.uuid() }),
  zod.object({ name: zod.string().trim().min(1, "courierNameRequired").max(COURIER_NAME_MAX_LENGTH, "courierNameTooLong") }),
])

const editableFields = zod.object({
  isActive: zod.boolean(),
  names: zod.record(zod.enum(I18N.SUPPORTED_LOCALES), nameField),
  price: priceField,
})

export const deliveryMethodZodSchemas = {
  archiveInput: zod.object({ archived: zod.boolean(), id: zod.uuid() }),
  createInput: editableFields.extend({ courier: courierField, type: zod.enum(DELIVERY_METHODS) }),
  reorderInput: zod.array(zod.uuid()).min(1),
  updateInput: editableFields.extend({ expectedUpdatedAt: zod.date(), id: zod.uuid() }),
}
