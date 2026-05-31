import type { JSX, ReactNode } from "react";

import { Body, Container, Head, Hr, Html, Preview, Section, Tailwind, Text } from "react-email";

import type { Locale } from "~/src/constants/types";

const SERIF_STACK = ["Georgia", "Cambria", "Times New Roman", "Times", "serif"];
const SANS_STACK = ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"];

export const EMAIL_TAILWIND_CONFIG = {
  theme: {
    extend: {
      colors: {
        cream: "#f6f4f0",
        ink: "#16140f",
        line: "#e7e3dc",
        muted: "#8a857c",
        paper: "#ffffff"
      },
      fontFamily: {
        sans: SANS_STACK,
        serif: SERIF_STACK
      }
    }
  }
};

interface EmailLayoutProps {
  readonly children: ReactNode;
  readonly footer: string;
  readonly locale: Locale;
  readonly preview: string;
  readonly tagline: string;
}

export function EmailLayout({ children, footer, locale, preview, tagline }: Readonly<EmailLayoutProps>): JSX.Element {
  return (
    <Html lang={locale}>
      <Head>
        <meta content="light" name="color-scheme" />
        <meta content="light" name="supported-color-schemes" />
      </Head>
      <Tailwind config={EMAIL_TAILWIND_CONFIG}>
        <Preview>{preview}</Preview>
        <Body className="bg-cream m-0 px-[16px] py-[40px] font-sans">
          <Container className="bg-paper mx-auto max-w-[540px] px-[48px] py-[44px]">
            <Section className="text-center">
              <Text className="text-ink m-0 font-serif text-[24px] leading-[28px] tracking-[0.44em]">M&apos;ARTE</Text>
              <Text className="m-0 mt-[10px] text-[10px] leading-[14px] tracking-[0.34em] text-muted uppercase">{tagline}</Text>
            </Section>

            <Hr className="border-line my-[32px]" />

            {children}

            <Hr className="border-line mt-[40px] mb-[24px]" />

            <Section className="text-center">
              <Text className="text-ink m-0 font-serif text-[13px] leading-[16px] tracking-[0.38em]">M&apos;ARTE</Text>
              <Text className="m-0 mt-[8px] text-[11px] leading-[18px] tracking-[0.04em] text-muted">{footer}</Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
