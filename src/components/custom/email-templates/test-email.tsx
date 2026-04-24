import type { JSX } from "react";

import { Body, Container, Head, Heading, Html, Preview, Section, Tailwind } from "react-email";
import { createTranslator } from "use-intl";

import type { Locale } from "~/src/constants/types";

import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

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
      <Head />
      <Tailwind>
        <Body className="font-sans">
          <Preview>{t("preview")}</Preview>
          <Container className="mx-auto px-5 py-10">
            <Section>
              <Heading className="m-0 mb-4 text-2xl font-bold">{t("title")}</Heading>
              <p>{t("body")}</p>
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
