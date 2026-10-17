import { type JSX } from "react"

import { Heading, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import type emailMessages from "~/messages/en-US/emails.email-changed.json"
import { EMAIL_MUTED_TEXT_CLASS, EmailBodyText } from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const EMAIL_CHANGED_NAMESPACE = "emails.email-changed"

export const EmailChanged = ({ locale, maskedEmail, messages, name, seller }: Readonly<EmailChangedProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "email-changed": messages } }, namespace: EMAIL_CHANGED_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("greeting", { name })}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("message", { email: maskedEmail })}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <Text className={EMAIL_MUTED_TEXT_CLASS}>{t("security", { email: seller.email, phone: seller.phone })}</Text>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface EmailChangedProps {
  readonly locale: SupportedLocale
  readonly maskedEmail: string
  readonly messages: typeof emailMessages
  readonly name: string
  readonly seller: Pick<StoreSetting["sellerDetails"], "email" | "phone">
}
