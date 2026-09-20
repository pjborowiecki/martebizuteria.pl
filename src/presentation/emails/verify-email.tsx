import { type JSX } from "react"

import { Button, Heading, Section, Text } from "react-email"

import { getEmailMessages } from "~/src/integrations/use-intl/i18n.emails"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText,
  EmailHighlightBox,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
export const VerifyEmail = ({ locale, name, verificationUrl }: Readonly<VerifyEmailProps>): JSX.Element => {
  const t = getEmailMessages(locale).pages.auth.email.verifyEmail
  return (
    <EmailLayout locale={locale} preview={t.preview} tagline={t.tagline}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t.heading}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t.greeting.replace("{name}", name ?? "")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t.message}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t.messageSecondary}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t.messageTertiary}</EmailBodyText>

      <EmailHighlightBox body={t.highlightBody} title={t.highlightTitle} />

      <Section className={EMAIL_CTA_SECTION_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={verificationUrl}>
          {t.cta}
        </Button>
      </Section>

      <Text className={EMAIL_MUTED_TEXT_CLASS}>{t.expiry}</Text>
      <Text className={`mt-[10px] ${EMAIL_MUTED_TEXT_CLASS}`}>{t.ignore}</Text>

      <EmailBodyText className="mt-[34px]">{t.signoff}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t.sender}</EmailBodyText>
    </EmailLayout>
  )
}
interface VerifyEmailProps {
  locale: Locale
  name?: string
  verificationUrl: string
}
VerifyEmail.PreviewProps = {
  locale: "en",
  name: "Jane Doe",
  verificationUrl: "https://martebizuteria.pl/en/auth/verify-email?token=12345",
} satisfies VerifyEmailProps
