import { type JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.account-deleted.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const ACCOUNT_DELETED_NAMESPACE = "emails.account-deleted"

export const AccountDeleted = ({ locale, messages, name, storefrontUrl }: Readonly<AccountDeletedProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "account-deleted": messages } }, namespace: ACCOUNT_DELETED_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("greeting", { name: name ?? "" })}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageTertiary")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={storefrontUrl}>
          {t("cta")}
        </Button>
      </Section>

      <Text className={EMAIL_MUTED_TEXT_CLASS}>{t("security")}</Text>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface AccountDeletedProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly name?: string
  readonly storefrontUrl: string
}
