import { and, eq, gt, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { CHECKOUT_SESSION_LIFETIME_SECONDS } from "~/src/integrations/stripe/stripe.constants"

import { checkout } from "~/src/modules/checkout/checkout.schema"
import { payment } from "~/src/modules/payment/payment.schema"

const MILLISECONDS_PER_SECOND = 1000

export const countOpenCheckouts = async ({ clientAddress, email }: OpenCheckoutsOwner): Promise<OpenCheckoutCounts> => {
  const latestSessionOpenedAfter = new Date(Date.now() - CHECKOUT_SESSION_LIFETIME_SECONDS * MILLISECONDS_PER_SECOND)
  const customerEmail = email.toLowerCase()
  const checkoutEmail = sql<string>`lower(${checkout.email})`
  const heldByVisitor = or(eq(checkout.clientAddress, clientAddress), eq(checkoutEmail, customerEmail))
  const openCheckouts = await db
    .select({ clientAddress: checkout.clientAddress, email: checkoutEmail })
    .from(checkout)
    .innerJoin(payment, eq(payment.checkoutId, checkout.id))
    .where(
      and(eq(checkout.status, "pending"), eq(payment.status, "pending"), gt(payment.updatedAt, latestSessionOpenedAfter), heldByVisitor),
    )

  return {
    byClientAddress: openCheckouts.filter((row) => row.clientAddress === clientAddress).length,
    byEmail: openCheckouts.filter((row) => row.email === customerEmail).length,
  }
}

export interface OpenCheckoutsOwner {
  readonly clientAddress: string
  readonly email: string
}

export interface OpenCheckoutCounts {
  readonly byClientAddress: number
  readonly byEmail: number
}
