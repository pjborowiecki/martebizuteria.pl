import type { JSX } from "react";

import { Body, Container, Head, Heading, Html, pixelBasedPreset, Preview, Section, Tailwind, Text } from "react-email";
import { createTranslator } from "use-intl";

import type { Locale } from "~/src/constants/types";

import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

const EMAIL_TAILWIND_CONFIG = { presets: [pixelBasedPreset] };

interface TestEmailProps {
  locale: Locale;
}

export default function TestEmail({ locale }: Readonly<TestEmailProps>): JSX.Element {
  const t = createTranslator({
    locale,
    messages: getMessagesForLocale(locale),
    namespace: "emails.test"
  });

  return (
    <Html lang={locale}>
      <Tailwind config={EMAIL_TAILWIND_CONFIG}>
        <Head />
        <Body className="bg-gray-100 font-sans">
          <Preview>{t("preview")}</Preview>
          <Container className="mx-auto px-5 py-10">
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("title")}</Heading>
              <Text className="text-base leading-6 text-gray-800">{t("body")}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

TestEmail.PreviewProps = {
  locale: "en"
} satisfies TestEmailProps;
