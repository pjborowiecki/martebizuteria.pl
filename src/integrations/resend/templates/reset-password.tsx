import { Html, Head, Preview, Body, Container, Heading, Text, Button, Tailwind, Hr, Section } from "react-email";

import type { Locale } from "~/src/constants/types";

import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

interface ResetPasswordProps {
  name?: string;
  resetPasswordUrl: string;
  locale: Locale;
}

const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        brand: "#09090b"
      }
    }
  }
};

export const ResetPassword = ({ name, resetPasswordUrl, locale }: ResetPasswordProps) => {
  const t = getMessagesForLocale(locale).auth.email.resetPassword;

  return (
    <Html lang={locale}>
      <Tailwind config={tailwindConfig}>
        <Head />
        <Body className="bg-white font-sans">
          <Preview>Reset your password - M&apos;ARTE</Preview>
          <Container className="mx-auto mt-10 max-w-xl border border-solid border-gray-200 p-10">
            <Heading className="text-brand mb-6 text-center font-serif text-2xl font-light tracking-widest uppercase">M&apos;ARTE</Heading>
            <Hr className="my-8 border-solid border-gray-200" />
            <Text className="text-[14px] leading-[24px] text-black">{t.greeting.replace("{name}", name ?? "")}</Text>
            <Text className="text-[14px] leading-[24px] text-black">{t.message}</Text>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
                href={resetPasswordUrl}
              >
                {t.cta}
              </Button>
            </Section>
            <Text className="text-[14px] leading-[24px] text-black">{t.ignore}</Text>
            <Hr className="mx-0 my-[26px] w-full border border-solid border-[#eaeaea]" />
            <Text className="text-[12px] leading-[24px] text-[#666666]">{t.security}</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

ResetPassword.PreviewProps = {
  locale: "en",
  name: "Jane Doe",
  resetPasswordUrl: "https://martebizuteria.pl/en/auth/reset-password?token=12345"
} satisfies ResetPasswordProps;
