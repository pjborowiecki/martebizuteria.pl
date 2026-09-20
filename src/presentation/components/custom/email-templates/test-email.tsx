import { type JSX } from "react"

import { Body, Container, Head, Heading, Html, Preview, Section, Tailwind, Text, pixelBasedPreset } from "react-email"
import { createTranslator } from "use-intl"

import { getEmailMessages } from "~/src/integrations/use-intl/i18n.emails"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
const TestEmail = ({ locale }: Readonly<TestEmailProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: getEmailMessages(locale),
    namespace: "emails.test",
  })
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
  )
}
const EMAIL_TAILWIND_CONFIG = {
  presets: [pixelBasedPreset],
}
interface TestEmailProps {
  locale: Locale
}
export default TestEmail
TestEmail.PreviewProps = {
  locale: "en",
} satisfies TestEmailProps
