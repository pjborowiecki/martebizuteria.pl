import { eq, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { checkout } from "~/src/modules/checkout/checkout.schema"

export const forgetCheckoutClientAddress = async (checkoutId: string): Promise<void> => {
  await db
    .update(checkout)
    .set({ clientAddress: sql`NULL` })
    .where(eq(checkout.id, checkoutId))
}
