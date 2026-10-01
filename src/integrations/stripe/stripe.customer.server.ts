import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { user } from "~/src/modules/user/user.schema"

export const getStripeCustomerId = async (userId: string): Promise<string | undefined> => {
  const row = await db.query.user.findFirst({
    columns: { stripeCustomerId: true },
    where: eq(user.id, userId),
  })

  return row?.stripeCustomerId ?? undefined
}

export const ensureStripeCustomer = async ({ email, name, userId }: EnsureStripeCustomerInput): Promise<string> => {
  const existing = await getStripeCustomerId(userId)
  if (existing !== undefined) {
    return existing
  }

  const customer = await stripe.customers.create({ email, metadata: { userId }, name })
  await db.update(user).set({ stripeCustomerId: customer.id, updatedAt: new Date() }).where(eq(user.id, userId))

  return customer.id
}

interface EnsureStripeCustomerInput {
  readonly email: string
  readonly name: string
  readonly userId: string
}
