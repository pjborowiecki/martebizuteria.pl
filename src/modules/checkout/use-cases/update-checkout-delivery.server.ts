import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getCheckoutById } from "~/src/modules/checkout/checkout.accessors"
import { prepareUpdateCheckoutDeliveryBatch } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

export const updateCheckoutDelivery = async (
  checkoutId: string,
  checkoutValues: CheckoutFormSchema,
  discountId?: string,
): Promise<void> => {
  const checkoutRow = await getCheckoutById(checkoutId)
  if (checkoutRow === undefined) {
    throw new AppError(ERROR_CODES.NOT_FOUND)
  }
  if (checkoutRow.status !== "pending") {
    throw new AppError(ERROR_CODES.CONFLICT)
  }

  const results = await db.batch(prepareUpdateCheckoutDeliveryBatch(checkoutRow, checkoutValues, discountId))
  const updatedCheckout: unknown = results.at(-1)
  if (!Array.isArray(updatedCheckout) || updatedCheckout.length === 0) {
    throw new AppError(ERROR_CODES.CONFLICT)
  }
}
