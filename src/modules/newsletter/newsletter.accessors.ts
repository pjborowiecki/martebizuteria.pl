import { type SQL, and, asc, count, desc, eq, gt, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import { buildAdminSearchOrCondition } from "~/src/modules/_core/utils/search-conditions.server"
import { NEWSLETTER_STATUS, type NewsletterStatus } from "~/src/modules/newsletter/newsletter.constants"
import { newsletterSubscriber } from "~/src/modules/newsletter/newsletter.schema"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

const NO_ROWS = 0

export const normalizeSubscriberEmail = (email: string): string => email.trim().toLowerCase()

export const getSubscriberByEmail = (email: string) =>
  db.query.newsletterSubscriber.findFirst({
    where: eq(newsletterSubscriber.email, normalizeSubscriberEmail(email)),
  })

export const getSubscriberById = (id: string) =>
  db.query.newsletterSubscriber.findFirst({
    where: eq(newsletterSubscriber.id, id),
  })

export const getSubscriberByToken = (token: string) =>
  db.query.newsletterSubscriber.findFirst({
    where: eq(newsletterSubscriber.token, token),
  })

export const insertSubscriber = async (values: Newsletter["insert"]): Promise<void> => {
  await db.insert(newsletterSubscriber).values({ ...values, email: normalizeSubscriberEmail(values.email) })
}

export const updateSubscriberById = async (id: string, values: SubscriberUpdateSet): Promise<void> => {
  await db.update(newsletterSubscriber).set(values).where(eq(newsletterSubscriber.id, id))
}

const buildAdminSubscribersWhere = ({ search, status }: AdminSubscribersFilters): SQL | undefined =>
  and(
    buildAdminSearchOrCondition(search, [newsletterSubscriber.email]),
    status === undefined ? undefined : eq(newsletterSubscriber.status, status),
  )

export const getAdminSubscribersPage = async (params: AdminSubscribersListParams) => {
  const whereClause = buildAdminSubscribersWhere(params)
  const [[countRow], rows] = await db.batch([
    db.select({ count: count() }).from(newsletterSubscriber).where(whereClause),
    db
      .select()
      .from(newsletterSubscriber)
      .where(whereClause)
      .orderBy(desc(newsletterSubscriber.createdAt))
      .limit(params.limit)
      .offset(params.offset),
  ])

  return { rows, total: countRow?.count ?? NO_ROWS }
}

export const getAdminSubscribersFilteredList = (filters: AdminSubscribersFilters) =>
  db.select().from(newsletterSubscriber).where(buildAdminSubscribersWhere(filters)).orderBy(desc(newsletterSubscriber.createdAt))

const countByStatus = (status: Newsletter["select"]["status"]) =>
  db.select({ count: count() }).from(newsletterSubscriber).where(eq(newsletterSubscriber.status, status))

export const getAdminNewsletterStats = async (): Promise<Newsletter["adminStats"]> => {
  const [[totalRow], [confirmedRow], [pendingRow], [unsubscribedRow]] = await db.batch([
    db.select({ count: count() }).from(newsletterSubscriber),
    countByStatus(NEWSLETTER_STATUS.CONFIRMED),
    countByStatus(NEWSLETTER_STATUS.PENDING),
    countByStatus(NEWSLETTER_STATUS.UNSUBSCRIBED),
  ])

  return {
    confirmed: confirmedRow?.count ?? NO_ROWS,
    pending: pendingRow?.count ?? NO_ROWS,
    total: totalRow?.count ?? NO_ROWS,
    unsubscribed: unsubscribedRow?.count ?? NO_ROWS,
  }
}

export const countConfirmedSubscribers = (): Promise<number> =>
  db.$count(newsletterSubscriber, eq(newsletterSubscriber.status, NEWSLETTER_STATUS.CONFIRMED))

export const getConfirmedSubscribersAfter = (lastSubscriberId: string | null, limit: number) =>
  db
    .select({
      email: newsletterSubscriber.email,
      id: newsletterSubscriber.id,
      locale: newsletterSubscriber.locale,
      token: newsletterSubscriber.token,
    })
    .from(newsletterSubscriber)
    .where(
      and(
        eq(newsletterSubscriber.status, NEWSLETTER_STATUS.CONFIRMED),
        lastSubscriberId === null ? undefined : gt(newsletterSubscriber.id, lastSubscriberId),
      ),
    )
    .orderBy(asc(newsletterSubscriber.id))
    .limit(limit)

export const linkSubscriberToUser = async (email: string, userId: string): Promise<void> => {
  const sameEmail = eq(newsletterSubscriber.email, normalizeSubscriberEmail(email))
  const stillUnlinked = sql`${newsletterSubscriber.userId} is null`

  await db.update(newsletterSubscriber).set({ updatedAt: new Date(), userId }).where(and(sameEmail, stillUnlinked))
}

type SubscriberUpdateSet = Parameters<ReturnType<typeof db.update<typeof newsletterSubscriber>>["set"]>[0]

export interface AdminSubscribersFilters {
  readonly search?: string | undefined
  readonly status?: NewsletterStatus | undefined
}

export interface AdminSubscribersListParams extends AdminSubscribersFilters, ListPaginationParams {}
