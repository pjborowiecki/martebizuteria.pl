import type { JSX } from "react";

import { Button, Heading, Section, Text } from "react-email";

import type { Locale } from "~/src/constants/types";

import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText
} from "~/src/integrations/resend/templates/email-highlight-box";
import { EmailLayout } from "~/src/integrations/resend/templates/email-layout";
import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

interface ResetPasswordProps {
  locale: Locale;
  name?: string;
  resetPasswordUrl: string;
}

export function ResetPassword({ locale, name, resetPasswordUrl }: Readonly<ResetPasswordProps>): JSX.Element {
  const t = getMessagesForLocale(locale).pages.auth.email.resetPassword;

  return (
    <EmailLayout locale={locale} preview={t.preview} tagline={t.tagline}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t.heading}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t.greeting.replace("{name}", name ?? "")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t.message}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t.messageSecondary}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={resetPasswordUrl}>
          {t.cta}
        </Button>
      </Section>

      <Text className={EMAIL_MUTED_TEXT_CLASS}>{t.expiry}</Text>
      <Text className={`mt-[10px] ${EMAIL_MUTED_TEXT_CLASS}`}>{t.ignore}</Text>
      <Text className={`mt-[10px] ${EMAIL_MUTED_TEXT_CLASS}`}>{t.security}</Text>

      <EmailBodyText className="mt-[34px]">{t.signoff}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t.sender}</EmailBodyText>
    </EmailLayout>
  );
}

ResetPassword.PreviewProps = {
  locale: "en",
  name: "Jane Doe",
  resetPasswordUrl: "https://martebizuteria.pl/en/auth/reset-password?token=12345"
} satisfies ResetPasswordProps;
