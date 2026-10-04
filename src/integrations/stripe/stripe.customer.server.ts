import { eq, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { stripe } from "~/src/integrations/stripe/stripe.server"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
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
  const [stored] = await db
    .update(user)
    .set({ stripeCustomerId: sql`coalesce(${user.stripeCustomerId}, ${customer.id})`, updatedAt: new Date() })
    .where(eq(user.id, userId))
    .returning({ stripeCustomerId: user.stripeCustomerId })

  if (stored?.stripeCustomerId !== customer.id) {
    await stripe.customers.del(customer.id).catch((deleteError: unknown) => {
      console.error("Failed to delete an unused Stripe customer:", deleteError)
    })
  }

  if (stored?.stripeCustomerId === undefined || stored.stripeCustomerId === null) {
    throw new AppError(ERROR_CODES.NOT_FOUND)
  }

  return stored.stripeCustomerId
}

interface EnsureStripeCustomerInput {
  readonly email: string
  readonly name: string
  readonly userId: string
}
