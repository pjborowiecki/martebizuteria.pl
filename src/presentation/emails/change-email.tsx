import { type JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.change-email.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText,
  EmailHighlightBox,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const CHANGE_EMAIL_NAMESPACE = "emails.change-email"

export const ChangeEmail = ({ locale, messages, name, verificationUrl }: Readonly<ChangeEmailProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "change-email": messages } }, namespace: CHANGE_EMAIL_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("greeting", { name: name ?? "" })}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageTertiary")}</EmailBodyText>

      <EmailHighlightBox body={t("highlightBody")} title={t("highlightTitle")} />

      <Section className={EMAIL_CTA_SECTION_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={verificationUrl}>
          {t("cta")}
        </Button>
      </Section>

      <Text className={EMAIL_MUTED_TEXT_CLASS}>{t("expiry")}</Text>
      <Text className={`mt-[10px] ${EMAIL_MUTED_TEXT_CLASS}`}>{t("ignore")}</Text>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface ChangeEmailProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name?: string
  readonly verificationUrl: string
}
