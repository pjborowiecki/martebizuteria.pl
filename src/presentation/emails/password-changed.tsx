import { type JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.password-changed.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const PASSWORD_CHANGED_NAMESPACE = "emails.password-changed"

export const PasswordChanged = ({ locale, messages, name, signInUrl }: Readonly<PasswordChangedProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "password-changed": messages } }, namespace: PASSWORD_CHANGED_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("greeting", { name })}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={signInUrl}>
          {t("cta")}
        </Button>
      </Section>

      <Text className={EMAIL_MUTED_TEXT_CLASS}>{t("security")}</Text>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface PasswordChangedProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name: string
  readonly signInUrl: string
}
