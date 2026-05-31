import type { JSX } from "react";

import { Button, Heading, Section, Text } from "react-email";

import type { Locale } from "~/src/constants/types";

import { EmailLayout } from "~/src/integrations/resend/templates/email-layout";
import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

interface VerifyEmailProps {
  locale: Locale;
  name?: string;
  verificationUrl: string;
}

export function VerifyEmail({ locale, name, verificationUrl }: Readonly<VerifyEmailProps>): JSX.Element {
  const t = getMessagesForLocale(locale).auth.email.verifyEmail;

  return (
    <EmailLayout footer={t.footer} locale={locale} preview={t.preview} tagline={t.tagline}>
      <Heading className="text-ink m-0 text-center font-serif text-[27px] leading-[34px] font-normal tracking-[0.01em]">
        {t.heading}
      </Heading>

      <Text className="text-ink mt-[26px] mb-0 text-[15px] leading-[26px]">{t.greeting.replace("{name}", name ?? "")}</Text>
      <Text className="text-ink mt-[14px] mb-0 text-[15px] leading-[26px]">{t.message}</Text>

      <Section className="my-[36px] text-center">
        <Button
          className="bg-ink rounded-none px-[42px] py-[16px] text-center text-[12px] leading-[12px] font-semibold tracking-[0.18em] text-white uppercase no-underline"
          href={verificationUrl}
        >
          {t.cta}
        </Button>
      </Section>

      <Text className="m-0 text-[13px] leading-[22px] text-muted">{t.expiry}</Text>
      <Text className="mt-[10px] mb-0 text-[13px] leading-[22px] text-muted">{t.ignore}</Text>

      <Text className="text-ink mt-[30px] mb-0 text-[15px] leading-[24px]">{t.signoff}</Text>
      <Text className="text-ink m-0 font-serif text-[15px] leading-[24px] italic">{t.sender}</Text>
    </EmailLayout>
  );
}

VerifyEmail.PreviewProps = {
  locale: "en",
  name: "Jane Doe",
  verificationUrl: "https://martebizuteria.pl/en/auth/verify-email?token=12345"
} satisfies VerifyEmailProps;
