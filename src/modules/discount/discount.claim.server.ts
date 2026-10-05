import { and, count, eq, isNull, ne, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { checkout } from "~/src/modules/checkout/checkout.schema"
import { discount, discountClaim, discountRedemption } from "~/src/modules/discount/discount.schema"
import { type Discount } from "~/src/modules/discount/discount.types"

const NO_CLAIM = 0

export const prepareDiscountClaim = ({ checkoutId, discountId, email }: DiscountClaimInput) => {
  const customerEmail = email.trim().toLowerCase()
  const claimsOfOtherCheckouts = and(eq(discountClaim.discountId, discount.id), ne(discountClaim.checkoutId, checkoutId))
  const heldByOtherCheckouts = db.select({ held: count() }).from(discountClaim).where(claimsOfOtherCheckouts)
  const heldForCustomer = db
    .select({ held: count() })
    .from(discountClaim)
    .where(and(claimsOfOtherCheckouts, eq(sql`lower(${discountClaim.email})`, customerEmail)))
  const redeemedByCustomer = db
    .select({ redeemed: count() })
    .from(discountRedemption)
    .where(and(eq(discountRedemption.discountId, discount.id), eq(sql`lower(${discountRedemption.email})`, customerEmail)))
  const withinUsageLimit = or(isNull(discount.usageLimit), sql`${discount.usageCount} + ${heldByOtherCheckouts} < ${discount.usageLimit}`)
  const withinCustomerLimit = or(
    isNull(discount.perCustomerLimit),
    sql`${redeemedByCustomer} + ${heldForCustomer} < ${discount.perCustomerLimit}`,
  )
  const claimedAt = new Date()
  const claimColumns = {
    checkoutId: sql<string>`${checkoutId}`.as("checkout_id"),
    discountId: discount.id,
    email: sql<string>`${email}`.as("email"),
    id: sql<string>`${crypto.randomUUID()}`.as("id"),
  }
  const claimRowInTableOrder = Object.assign(claimColumns, {
    createdAt: sql<Date>`${sql.param(claimedAt, discountClaim.createdAt)}`.as("created_at"),
    updatedAt: sql<Date>`${sql.param(claimedAt, discountClaim.updatedAt)}`.as("updated_at"),
  })
  const claimableDiscount = db
    .select(claimRowInTableOrder)
    .from(discount)
    .where(and(eq(discount.id, discountId), withinUsageLimit, withinCustomerLimit))

  return db
    .insert(discountClaim)
    .select(claimableDiscount)
    .onConflictDoUpdate({ set: { email, updatedAt: claimedAt }, target: [discountClaim.checkoutId, discountClaim.discountId] })
    .returning({ id: discountClaim.id })
}

export const keepClaimedDiscount = (applied: Discount["applied"] | undefined, claimed: boolean): Discount["applied"] | undefined => {
  if (applied === undefined || claimed) {
    return applied
  }

  console.info(`Discount ${applied.code} not applied to checkout: other checkouts hold the uses its limits allow.`)

  return undefined
}

export const claimCheckoutDiscount = async ({
  applied,
  checkoutId,
  email,
}: ClaimCheckoutDiscountInput): Promise<Discount["applied"] | undefined> => {
  if (applied === undefined) {
    return undefined
  }

  const claims = await prepareDiscountClaim({ checkoutId, discountId: applied.discountId, email })

  return keepClaimedDiscount(applied, claims.length > NO_CLAIM)
}

export const releaseDiscountClaims = async (checkoutId: string): Promise<void> => {
  await db.delete(discountClaim).where(eq(discountClaim.checkoutId, checkoutId))
}

export const releaseUnappliedDiscountClaims = async (checkoutId: string): Promise<void> => {
  const appliedDiscount = db.select({ discountId: checkout.discountId }).from(checkout).where(eq(checkout.id, checkoutId))

  await db
    .delete(discountClaim)
    .where(and(eq(discountClaim.checkoutId, checkoutId), sql`${discountClaim.discountId} is not ${appliedDiscount}`))
}

interface DiscountClaimInput {
  readonly checkoutId: string
  readonly discountId: string
  readonly email: string
}

interface ClaimCheckoutDiscountInput {
  readonly applied: Discount["applied"] | undefined
  readonly checkoutId: string
  readonly email: string
}
