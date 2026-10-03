import { type SQL, and, count, desc, eq, isNull, or, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import { buildAdminSearchOrCondition } from "~/src/modules/_core/utils/search-conditions.server"
import { discount, discountRedemption } from "~/src/modules/discount/discount.schema"
import { type Discount } from "~/src/modules/discount/discount.types"

const NO_ROWS = 0

export const getDiscountByCode = (code: string) =>
  db.query.discount.findFirst({
    where: eq(discount.code, code),
  })

export const getDiscountById = (id: string) =>
  db.query.discount.findFirst({
    where: eq(discount.id, id),
  })

export const countCustomerRedemptions = async (discountId: string, email: string | undefined): Promise<number> => {
  const normalizedEmail = email?.trim().toLowerCase()
  if (normalizedEmail === undefined || normalizedEmail === "") {
    return NO_ROWS
  }

  const sameDiscount = eq(discountRedemption.discountId, discountId)
  const sameEmail = eq(sql`lower(${discountRedemption.email})`, normalizedEmail)
  const [row] = await db.select({ used: count() }).from(discountRedemption).where(and(sameDiscount, sameEmail))

  return row?.used ?? NO_ROWS
}

const buildAdminDiscountsWhere = (search: string | undefined): SQL | undefined =>
  buildAdminSearchOrCondition(search, [discount.code, discount.description])

export const getAdminDiscountsPage = async (params: AdminDiscountsListParams) => {
  const whereClause = buildAdminDiscountsWhere(params.search)
  const [[countRow], rows] = await db.batch([
    db.select({ count: count() }).from(discount).where(whereClause),
    db.select().from(discount).where(whereClause).orderBy(desc(discount.createdAt)).limit(params.limit).offset(params.offset),
  ])

  return {
    rows,
    total: countRow?.count ?? NO_ROWS,
  }
}

const usableDiscountCondition = (now: Date): SQL => {
  const withinWindowStart = or(isNull(discount.startsAt), sql`${discount.startsAt} <= ${now.getTime()}`)!
  const withinWindowEnd = or(isNull(discount.endsAt), sql`${discount.endsAt} > ${now.getTime()}`)!
  const belowLimit = or(isNull(discount.usageLimit), sql`${discount.usageCount} < ${discount.usageLimit}`)!

  return and(eq(discount.isActive, true), withinWindowStart, withinWindowEnd, belowLimit)!
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

export interface AdminDiscountsListParams extends ListPaginationParams {
  readonly search?: string | undefined
}
