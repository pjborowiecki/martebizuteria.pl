import { type SQL, and, count, desc, eq, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import { buildAdminSearchOrCondition } from "~/src/modules/_core/utils/search-conditions.server"
import { DISCOUNT_STATUS, type DiscountStatus, type DiscountType } from "~/src/modules/discount/discount.constants"
import { discount, discountClaim, discountRedemption } from "~/src/modules/discount/discount.schema"
import { type Discount } from "~/src/modules/discount/discount.types"
import { payment } from "~/src/modules/payment/payment.schema"

const NO_ROWS = 0

export const getDiscountByCode = (code: string) =>
  db.query.discount.findFirst({
    where: eq(discount.code, code),
  })

export const getDiscountById = (id: string) =>
  db.query.discount.findFirst({
    where: eq(discount.id, id),
  })

const normalizeCustomerEmail = (email: string | undefined): string | undefined => {
  const normalizedEmail = email?.trim().toLowerCase()

  return normalizedEmail === "" ? undefined : normalizedEmail
}

const customerRedemptionCount = (email: string | undefined): SQL<number> => {
  const normalizedEmail = normalizeCustomerEmail(email)
  if (normalizedEmail === undefined) {
    return sql<number>`${NO_ROWS}`
  }

  const sameDiscount = eq(discountRedemption.discountId, discount.id)
  const sameEmail = eq(sql`lower(${discountRedemption.email})`, normalizedEmail)

  return sql<number>`${db.select({ used: count() }).from(discountRedemption).where(and(sameDiscount, sameEmail))}`
}

export const getDiscountByCodeForCustomerQuery = (code: string, email: string | undefined) =>
  db.query.discount.findFirst({
    extras: { redeemedByCustomer: customerRedemptionCount(email).as("redeemed_by_customer") },
    where: eq(discount.code, code),
  })

const claimsOfOtherCheckouts = (heldSessionId: string | undefined): SQL | undefined => {
  const sameDiscount = eq(discountClaim.discountId, discount.id)
  if (heldSessionId === undefined) {
    return sameDiscount
  }

  const heldCheckout = db.select({ checkoutId: payment.checkoutId }).from(payment).where(eq(payment.transactionId, heldSessionId))

  return and(sameDiscount, notInArray(discountClaim.checkoutId, heldCheckout))
}

const claimCount = (claims: SQL | undefined): SQL<number> => sql<number>`${db.select({ held: count() }).from(discountClaim).where(claims)}`

const customerClaimCount = (claims: SQL | undefined, email: string | undefined): SQL<number> => {
  const normalizedEmail = normalizeCustomerEmail(email)
  if (normalizedEmail === undefined) {
    return sql<number>`${NO_ROWS}`
  }

  return claimCount(and(claims, eq(sql`lower(${discountClaim.email})`, normalizedEmail)))
}

export const getDiscountByCodeForPreviewQuery = ({ code, email, heldSessionId }: DiscountPreviewLookup) => {
  const otherCheckoutsClaims = claimsOfOtherCheckouts(heldSessionId)

  return db.query.discount.findFirst({
    extras: {
      heldByOtherCheckouts: claimCount(otherCheckoutsClaims).as("held_by_other_checkouts"),
      heldForCustomer: customerClaimCount(otherCheckoutsClaims, email).as("held_for_customer"),
      redeemedByCustomer: customerRedemptionCount(email).as("redeemed_by_customer"),
    },
    where: eq(discount.code, code),
  })
}

const notExpiredCondition = (now: Date): SQL => or(isNull(discount.endsAt), sql`${discount.endsAt} > ${now.getTime()}`)!

const belowUsageLimitCondition = (): SQL => or(isNull(discount.usageLimit), sql`${discount.usageCount} < ${discount.usageLimit}`)!

const startedCondition = (now: Date): SQL => or(isNull(discount.startsAt), sql`${discount.startsAt} <= ${now.getTime()}`)!

const usableDiscountCondition = (now: Date): SQL =>
  and(eq(discount.isActive, true), startedCondition(now), notExpiredCondition(now), belowUsageLimitCondition())!

const discountStatusCondition = (status: DiscountStatus, now: Date): SQL => {
  const enabled = eq(discount.isActive, true)
  const statusConditions: Record<DiscountStatus, () => SQL> = {
    [DISCOUNT_STATUS.ACTIVE]: () => usableDiscountCondition(now),
    [DISCOUNT_STATUS.DISABLED]: () => eq(discount.isActive, false),
    [DISCOUNT_STATUS.EXHAUSTED]: () =>
      and(enabled, notExpiredCondition(now), isNotNull(discount.usageLimit), sql`${discount.usageCount} >= ${discount.usageLimit}`)!,
    [DISCOUNT_STATUS.EXPIRED]: () => and(enabled, isNotNull(discount.endsAt), sql`${discount.endsAt} <= ${now.getTime()}`)!,
    [DISCOUNT_STATUS.SCHEDULED]: () =>
      and(enabled, notExpiredCondition(now), belowUsageLimitCondition(), sql`${discount.startsAt} > ${now.getTime()}`)!,
  }

  return statusConditions[status]()
}

const buildAdminDiscountsWhere = ({ now, search, status, type }: AdminDiscountsListParams): SQL | undefined =>
  and(
    buildAdminSearchOrCondition(search, [discount.code, discount.description]),
    type === undefined ? undefined : eq(discount.type, type),
    status === undefined ? undefined : discountStatusCondition(status, now),
  )

export const getAdminDiscountsPage = async (params: AdminDiscountsListParams) => {
  const whereClause = buildAdminDiscountsWhere(params)
  const [[countRow], rows] = await db.batch([
    db.select({ count: count() }).from(discount).where(whereClause),
    db.select().from(discount).where(whereClause).orderBy(desc(discount.createdAt)).limit(params.limit).offset(params.offset),
  ])

  return {
    rows,
    total: countRow?.count ?? NO_ROWS,
  }
}

export const getAdminDiscountStats = async (now: Date): Promise<Discount["adminStats"]> => {
  const [[totalRow], [activeRow], [redemptionRow]] = await db.batch([
    db.select({ count: count() }).from(discount),
    db.select({ count: count() }).from(discount).where(usableDiscountCondition(now)),
    db
      .select({
        count: count(),
        total: sql<number>`coalesce(sum(${discountRedemption.amount}), ${0})`,
      })
      .from(discountRedemption),
  ])

  return {
    active: activeRow?.count ?? NO_ROWS,
    currencyCode: STORE_CURRENCY_CODE,
    redeemedTotalMinorUnits: redemptionRow?.total ?? NO_ROWS,
    redemptions: redemptionRow?.count ?? NO_ROWS,
    total: totalRow?.count ?? NO_ROWS,
  }
}

export const insertDiscount = async (values: Discount["insert"]): Promise<void> => {
  await db.insert(discount).values(values)
}

export const updateDiscountById = async (id: string, values: DiscountUpdateSet): Promise<void> => {
  await db.update(discount).set(values).where(eq(discount.id, id))
}

export const deleteDiscountsByIds = async (ids: readonly string[]): Promise<number> => {
  const deleted = await db.delete(discount).where(inJsonList(discount.id, ids)).returning({ id: discount.id })

  return deleted.length
}

type DiscountUpdateSet = Parameters<ReturnType<typeof db.update<typeof discount>>["set"]>[0]

interface DiscountPreviewLookup {
  readonly code: string
  readonly email: string | undefined
  readonly heldSessionId: string | undefined
}

export interface AdminDiscountsListParams extends ListPaginationParams {
  readonly now: Date
  readonly search?: string | undefined
  readonly status?: DiscountStatus | undefined
  readonly type?: DiscountType | undefined
}
