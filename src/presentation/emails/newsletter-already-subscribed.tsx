import { type JSX } from "react"

import { Button, Heading, Section } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.newsletter-already-subscribed.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EmailBodyText,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE = "emails.newsletter-already-subscribed"

export const NewsletterAlreadySubscribed = ({
  locale,
  messages,
  storefrontUrl,
}: Readonly<NewsletterAlreadySubscribedProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "newsletter-already-subscribed": messages } },
    namespace: NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE,
  })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={storefrontUrl}>
          {t("cta")}
        </Button>
      </Section>

      <EmailBodyText className="mt-[34px]">{t("unsubscribeNote")}</EmailBodyText>
      <EmailBodyText className="mt-[20px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface NewsletterAlreadySubscribedProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly storefrontUrl: string
}
