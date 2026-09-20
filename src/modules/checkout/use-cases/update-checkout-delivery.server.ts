import { runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"

import { prepareUpdateCheckoutDeliveryBatch } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"
export const updateCheckoutDelivery = async (checkoutId: string, checkoutValues: CheckoutFormSchema): Promise<void> => {
  await runDrizzleBatch([prepareUpdateCheckoutDeliveryBatch(checkoutId, checkoutValues)])
}
