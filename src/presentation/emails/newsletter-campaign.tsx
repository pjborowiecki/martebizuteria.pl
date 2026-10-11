import { type JSX } from "react"

import { Heading, Link, Markdown, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { BUSINESS, BUSINESS_POSTAL_ADDRESS_LINES } from "~/src/presentation/branding/business"

import type emailMessages from "~/messages/en-US/emails.newsletter-campaign.json"
import { EMAIL_MUTED_TEXT_CLASS } from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
import { EMAIL_MARKDOWN_CONTAINER_STYLE, EMAIL_MARKDOWN_STYLES } from "~/src/presentation/emails/email-styles"

export const NEWSLETTER_CAMPAIGN_NAMESPACE = "emails.newsletter-campaign"

export const NewsletterCampaignEmail = ({
  body,
  locale,
  messages,
  subject,
  unsubscribeUrl,
}: Readonly<NewsletterCampaignEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "newsletter-campaign": messages } },
    namespace: NEWSLETTER_CAMPAIGN_NAMESPACE,
  })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">{subject}</Heading>

      <Markdown markdownContainerStyles={EMAIL_MARKDOWN_CONTAINER_STYLE} markdownCustomStyles={EMAIL_MARKDOWN_STYLES}>
        {body}
      </Markdown>

      <Section className="mt-[34px] text-center">
        <Text className={EMAIL_MUTED_TEXT_CLASS}>{t("reason")}</Text>
        <Link className="text-ink text-[13px] leading-[22px] underline" href={unsubscribeUrl}>
          {t("unsubscribe")}
        </Link>
      </Section>

      <Section className="mt-[24px] text-center">
        <Text className={`${EMAIL_MUTED_TEXT_CLASS} whitespace-pre-line`}>
          {[t("sender.label"), ...BUSINESS_POSTAL_ADDRESS_LINES, t("sender.country")].join("\n")}
        </Text>
        <Text className={EMAIL_MUTED_TEXT_CLASS}>
          {t("sender.emailLabel")}:{" "}
          <Link className="text-muted underline" href={`mailto:${BUSINESS.EMAIL}`}>
            {BUSINESS.EMAIL}
          </Link>
        </Text>
      </Section>
    </EmailLayout>
  )
}

interface NewsletterCampaignEmailProps {
  readonly body: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly subject: string
  readonly unsubscribeUrl: string
}
