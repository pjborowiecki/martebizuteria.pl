import { type JSX } from "react"

import { Button, Heading, Section } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.newsletter-confirmation.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EmailBodyText,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const NEWSLETTER_CONFIRMATION_NAMESPACE = "emails.newsletter-confirmation"

export const NewsletterConfirmation = ({ confirmUrl, locale, messages }: Readonly<NewsletterConfirmationProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "newsletter-confirmation": messages } },
    namespace: NEWSLETTER_CONFIRMATION_NAMESPACE,
  })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={confirmUrl}>
          {t("cta")}
        </Button>
      </Section>

      <EmailBodyText className="mt-[34px]">{t("unsubscribeNote")}</EmailBodyText>
      <EmailBodyText className="mt-[20px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface NewsletterConfirmationProps {
  readonly confirmUrl: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
}
