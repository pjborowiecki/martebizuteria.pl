import { createElement } from "react"

import { type CreateBatchEmailOptions } from "resend"

import { resend } from "~/src/integrations/resend/resend.config"
import { shopSender } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import { buildLocalizedUrl } from "~/src/lib/seo"

import type campaignMessages from "~/messages/en-US/emails.newsletter-campaign.json"
import { NEWSLETTER_CAMPAIGN_NAMESPACE, NewsletterCampaignEmail } from "~/src/presentation/emails/newsletter-campaign"
import { ROUTES } from "~/src/routes"

const ONE_CLICK_UNSUBSCRIBE = "List-Unsubscribe=One-Click"

const unsubscribePageUrl = (origin: string, locale: SupportedLocale, token: string | undefined): string => {
  const page = buildLocalizedUrl(origin, ROUTES.NEWSLETTER_UNSUBSCRIBE, locale)

  return token === undefined ? page : `${page}?token=${encodeURIComponent(token)}`
}

const oneClickUnsubscribeHeaders = (origin: string, token: string | undefined): Pick<CreateBatchEmailOptions, "headers"> =>
  token === undefined
    ? {}
    : {
        headers: {
          "List-Unsubscribe": `<${origin}${ROUTES.API_NEWSLETTER_UNSUBSCRIBE}?token=${encodeURIComponent(token)}>`,
          "List-Unsubscribe-Post": ONE_CLICK_UNSUBSCRIBE,
        },
      }

const composeNewsletterEmail = async (
  { bodies, origin, subjects }: NewsletterContent,
  seller: StoreSetting["sellerDetails"],
  { email, locale, unsubscribeToken }: NewsletterCampaign["recipient"],
): Promise<CreateBatchEmailOptions> => ({
  ...oneClickUnsubscribeHeaders(origin, unsubscribeToken),
  from: shopSender(),
  react: createElement(NewsletterCampaignEmail, {
    body: bodies[locale],
    locale,
    messages: await loadNamespace<typeof campaignMessages>({ locale, namespace: NEWSLETTER_CAMPAIGN_NAMESPACE }),
    seller,
    subject: subjects[locale],
    unsubscribeUrl: unsubscribePageUrl(origin, locale, unsubscribeToken),
  }),
  replyTo: seller.email,
  subject: subjects[locale],
  to: email,
})

export const sendNewsletterBatch = async ({
  content,
  idempotencyKey,
  recipients,
}: Readonly<NewsletterBatch>): Promise<string | undefined> => {
  try {
    const seller = await readSellerDetails()
    const emails = await Promise.all(recipients.map((recipient) => composeNewsletterEmail(content, seller, recipient)))
    const { error } = await resend.batch.send(emails, idempotencyKey === undefined ? {} : { idempotencyKey })

    return error?.message
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }
}

type NewsletterContent = Pick<NewsletterCampaign["select"], "bodies" | "origin" | "subjects">

interface NewsletterBatch {
  readonly content: NewsletterContent
  readonly idempotencyKey?: string
  readonly recipients: readonly NewsletterCampaign["recipient"][]
}
