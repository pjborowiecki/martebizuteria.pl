import { type JSX, type ReactNode } from "react"

import { Body, Container, Head, Hr, Html, Preview, Section, Tailwind, Text } from "react-email"

import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { EMAIL_BODY_STYLE, EMAIL_CONTAINER_STYLE } from "~/src/presentation/emails/email-styles"
export const EmailLayout = ({ children, locale, preview, tagline }: Readonly<EmailLayoutProps>): JSX.Element => (
  <Html lang={locale}>
    <Head>
      <meta content="light only" name="color-scheme" />
      <meta content="light only" name="supported-color-schemes" />
    </Head>
    <Tailwind config={EMAIL_TAILWIND_CONFIG}>
      <Preview>{preview}</Preview>
      <Body className="m-0 font-sans" lang={locale} style={EMAIL_BODY_STYLE}>
        <Container className="box-border" lang={locale} style={EMAIL_CONTAINER_STYLE}>
          <Section className="text-center">
            <Text className="text-ink m-0 font-serif text-[26px] leading-[30px] tracking-[0.42em]">M&apos;ARTE</Text>
            <Hr className="border-gold mx-auto my-[14px] w-[48px] border-t border-solid" />
            <Text className="m-0 text-[10px] leading-[14px] tracking-[0.34em] text-muted uppercase">{tagline}</Text>
          </Section>

          <Hr className="border-line my-[36px]" />

          {children}

          <Hr className="border-line mt-[44px] mb-[28px]" />

          <Section className="text-center">
            <Text className="text-ink m-0 font-serif text-[13px] leading-[16px] tracking-[0.38em]">M&apos;ARTE</Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

const SERIF_STACK = ["Georgia", "Cambria", "Times New Roman", "Times", "serif"]
const SANS_STACK = ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"]
export const EMAIL_TAILWIND_CONFIG = {
  theme: {
    extend: {
      colors: {
        cream: "#f3f0ea",
        gold: "#b39b6d",
        ink: "#16140f",
        line: "#e2ddd4",
        muted: "#7a746a",
        paper: "#ffffff",
        wash: "#faf8f5",
      },
      fontFamily: {
        sans: SANS_STACK,
        serif: SERIF_STACK,
      },
    },
  },
}
interface EmailLayoutProps {
  readonly children: ReactNode
  readonly locale: Locale
  readonly preview: string
  readonly tagline: string
}
