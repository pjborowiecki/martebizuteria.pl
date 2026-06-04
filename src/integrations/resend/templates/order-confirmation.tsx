import { Body, Container, Head, Heading, Hr, Html, Preview, Tailwind, Text, pixelBasedPreset } from "react-email";

import type { Locale } from "~/src/constants/types";

import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

import { formatPrice } from "~/src/lib/_utils/currency";

const REFERENCE_START = 0;
const REFERENCE_LENGTH = 8;

export interface OrderConfirmationItem {
  readonly price: number;
  readonly qty: number;
  readonly title: string;
}

export interface OrderConfirmationProps {
  readonly currency: string;
  readonly items: readonly OrderConfirmationItem[];
  readonly locale: Locale;
  readonly orderId: string;
  readonly total: number;
}

const tailwindConfig = {
  presets: [pixelBasedPreset],
  theme: {
    extend: {
      colors: {
        brand: "#09090b"
      }
    }
  }
};

export const getOrderConfirmationSubject = (locale: Locale): string => getMessagesForLocale(locale).emails.orderConfirmation.subject;

export const OrderConfirmation = ({ currency, items, locale, orderId, total }: OrderConfirmationProps) => {
  const t = getMessagesForLocale(locale).emails.orderConfirmation;
  const reference = orderId.slice(REFERENCE_START, REFERENCE_LENGTH).toUpperCase();

  return (
    <Html lang={locale}>
      <Tailwind config={tailwindConfig}>
        <Head />
        <Body className="bg-[#f4f4f5] font-sans">
          <Preview>{t.preview}</Preview>
          <Container className="mx-auto my-10 max-w-xl border border-solid border-gray-200 bg-white p-12">
            <Heading className="text-brand text-center font-serif text-2xl font-light tracking-widest uppercase">M&apos;ARTE</Heading>
            <Text className="mt-8 text-[16px] leading-[24px] font-semibold text-black">{t.greeting}</Text>
            <Text className="text-[14px] leading-[24px] text-black">{t.message}</Text>
            <Text className="mt-4 text-[11px] leading-[24px] tracking-[0.2em] text-gray-500 uppercase">
              {t.orderLabel}: {reference}
            </Text>
            <Hr className="my-6 border-t border-gray-200" />
            {items.map((item) => (
              <Text key={`${item.title}-${item.price}-${item.qty}`} className="my-1 text-[14px] leading-[22px] text-black">
                {item.title} × {item.qty} — {formatPrice(item.price * item.qty, currency, locale)}
              </Text>
            ))}
            <Hr className="my-6 border-t border-gray-200" />
            <Text className="text-[15px] leading-[24px] font-semibold text-black">
              {t.totalLabel}: {formatPrice(total, currency, locale)}
            </Text>
            <Text className="mt-10 text-[13px] leading-[22px] text-gray-600">{t.footer}</Text>
            <Text className="mt-10 text-center text-[12px] leading-[24px] tracking-[0.2em] text-gray-400 uppercase">M&apos;ARTE</Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

OrderConfirmation.PreviewProps = {
  currency: "PLN",
  items: [
    { price: 24_900, qty: 1, title: "Bransoletka Aurora" },
    { price: 18_900, qty: 2, title: "Kolczyki Luna" }
  ],
  locale: "pl",
  orderId: "a1b2c3d4-0000-0000-0000-000000000000",
  total: 62_700
} satisfies OrderConfirmationProps;
