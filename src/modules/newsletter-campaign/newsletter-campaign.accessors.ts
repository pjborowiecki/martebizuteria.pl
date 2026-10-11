import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import {
  ADMIN_NEWSLETTER_CAMPAIGNS_LIMIT,
  NEWSLETTER_CAMPAIGN_STATUS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { newsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.schema"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

const isSending = eq(newsletterCampaign.status, NEWSLETTER_CAMPAIGN_STATUS.SENDING)

export const insertNewsletterCampaign = async (values: NewsletterCampaign["insert"]): Promise<boolean> => {
  const inserted = await db.insert(newsletterCampaign).values(values).onConflictDoNothing().returning({ id: newsletterCampaign.id })

  return inserted.length > 0
}

export const getNewsletterCampaignById = (id: string): Promise<NewsletterCampaign["select"] | undefined> =>
  db.query.newsletterCampaign.findFirst({ where: eq(newsletterCampaign.id, id) })

export const listRecentNewsletterCampaigns = (): Promise<NewsletterCampaign["adminListItem"][]> =>
  db
    .select({
      completedAt: newsletterCampaign.completedAt,
      createdAt: newsletterCampaign.createdAt,
      failure: newsletterCampaign.failure,
      id: newsletterCampaign.id,
      recipientCount: newsletterCampaign.recipientCount,
      sentCount: newsletterCampaign.sentCount,
      status: newsletterCampaign.status,
      subjects: newsletterCampaign.subjects,
    })
    .from(newsletterCampaign)
    .orderBy(desc(newsletterCampaign.createdAt))
    .limit(ADMIN_NEWSLETTER_CAMPAIGNS_LIMIT)

export const recordNewsletterBatchSent = async ({
  campaign,
  delivered,
  finished,
  lastRecipientId,
}: Readonly<NewsletterBatchSent>): Promise<boolean> => {
  const fromSameRecipient =
    campaign.lastRecipientId === null
      ? isNull(newsletterCampaign.lastRecipientId)
      : eq(newsletterCampaign.lastRecipientId, campaign.lastRecipientId)
  const updated = await db
    .update(newsletterCampaign)
    .set({
      completedAt: finished ? new Date() : undefined,
      lastRecipientId,
      sentCount: sql`${newsletterCampaign.sentCount} + ${delivered}`,
      status: finished ? NEWSLETTER_CAMPAIGN_STATUS.SENT : NEWSLETTER_CAMPAIGN_STATUS.SENDING,
      updatedAt: new Date(),
    })
    .where(and(eq(newsletterCampaign.id, campaign.id), isSending, fromSameRecipient))
    .returning({ id: newsletterCampaign.id })

  return updated.length > 0
}

export const completeNewsletterCampaign = async (id: string): Promise<void> => {
  await db
    .update(newsletterCampaign)
    .set({ completedAt: new Date(), status: NEWSLETTER_CAMPAIGN_STATUS.SENT, updatedAt: new Date() })
    .where(and(eq(newsletterCampaign.id, id), isSending))
}

export const deleteUnsentNewsletterCampaign = async (id: string): Promise<void> => {
  await db.delete(newsletterCampaign).where(and(eq(newsletterCampaign.id, id), isSending, isNull(newsletterCampaign.lastRecipientId)))
}

export const failNewsletterCampaign = async (id: string, failure: string): Promise<void> => {
  await db
    .update(newsletterCampaign)
    .set({ completedAt: new Date(), failure, status: NEWSLETTER_CAMPAIGN_STATUS.FAILED, updatedAt: new Date() })
    .where(and(eq(newsletterCampaign.id, id), isSending))
}

interface NewsletterBatchSent {
  readonly campaign: Pick<NewsletterCampaign["select"], "id" | "lastRecipientId">
  readonly delivered: number
  readonly finished: boolean
  readonly lastRecipientId: string
}
