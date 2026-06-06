import type { JSX } from "react";

import { Button, Column, Heading, Hr, Img, Link, Row, Section, Text } from "react-email";

import type { Locale } from "~/src/constants/types";

import type { OrderAccountCta } from "~/src/integrations/resend/order-confirmation.utils";
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText,
  EmailBorderedSection
} from "~/src/integrations/resend/templates/email-highlight-box";
import { EmailLayout } from "~/src/integrations/resend/templates/email-layout";
import { EMAIL_PRODUCT_IMAGE_STYLE } from "~/src/integrations/resend/templates/email-styles";
import { getMessagesForLocale } from "~/src/integrations/use-intl/i18n.queries";

import { formatPrice } from "~/src/lib/_utils/currency";

const REFERENCE_START = 0;
const REFERENCE_LENGTH = 8;
const FIRST_ITEM_TOP_MARGIN = "mt-[8px]";
const ITEM_TOP_MARGIN = "mt-[16px]";
const DETAIL_GROUP_TOP_MARGIN = "mt-[24px]";
const PRODUCT_IMAGE_SIZE = 72;
const DETAIL_LABEL_CLASS = "text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase";
const DETAIL_VALUE_CLASS = "text-ink mt-[6px] mb-0 text-[14px] leading-[22px] whitespace-pre-line";
const PRODUCT_LINK_CLASS = "text-muted mt-[6px] inline-block text-[12px] leading-[18px] underline";

export interface OrderConfirmationItem {
  readonly imageUrl: string;
  readonly price: number;
  readonly productUrl: string;
  readonly qty: number;
  readonly title: string;
}

export interface OrderConfirmationDetails {
  readonly billingAddress: string;
  readonly deliveryMethod: string;
  readonly estimatedDelivery: string;
  readonly fulfillmentTime: string;
  readonly paymentMethod: string;
  readonly shippingAddress: string;
}

export interface OrderConfirmationProps {
  readonly accountCta: OrderAccountCta;
  readonly currency: string;
  readonly details: OrderConfirmationDetails;
  readonly items: readonly OrderConfirmationItem[];
  readonly locale: Locale;
  readonly orderId: string;
  readonly shippingTotal: number;
  readonly subtotal: number;
  readonly total: number;
}

export const getOrderConfirmationSubject = (locale: Locale): string => getMessagesForLocale(locale).emails.orderConfirmation.subject;

interface DetailRowProps {
  readonly isFirst?: boolean;
  readonly label: string;
  readonly value: string;
}

function DetailRow({ isFirst = false, label, value }: Readonly<DetailRowProps>): JSX.Element {
  return (
    <Section className={isFirst ? "m-0" : DETAIL_GROUP_TOP_MARGIN}>
      <Text className={DETAIL_LABEL_CLASS}>{label}</Text>
      <Text className={DETAIL_VALUE_CLASS}>{value}</Text>
    </Section>
  );
}

interface OrderItemRowProps {
  readonly currency: string;
  readonly isFirst: boolean;
  readonly item: OrderConfirmationItem;
  readonly locale: Locale;
  readonly viewProductLabel: string;
}

function OrderItemRow({ currency, isFirst, item, locale, viewProductLabel }: Readonly<OrderItemRowProps>): JSX.Element {
  return (
    <Section className={isFirst ? FIRST_ITEM_TOP_MARGIN : ITEM_TOP_MARGIN}>
      <Row>
        <Column className="w-[72px] align-top">
          <Img
            alt={item.title}
            className="box-border"
            height={PRODUCT_IMAGE_SIZE}
            src={item.imageUrl}
            style={EMAIL_PRODUCT_IMAGE_STYLE}
            width={PRODUCT_IMAGE_SIZE}
          />
        </Column>
        <Column className="pl-[14px] align-top">
          <Text className="text-ink m-0 text-[14px] leading-[22px] font-medium">{item.title}</Text>
          <Text className="text-ink mt-[4px] mb-0 text-[14px] leading-[22px]">
            {item.qty} × {formatPrice(item.price, currency, locale)} — {formatPrice(item.price * item.qty, currency, locale)}
          </Text>
          <Link className={PRODUCT_LINK_CLASS} href={item.productUrl}>
            {viewProductLabel}
          </Link>
        </Column>
      </Row>
    </Section>
  );
}

export function OrderConfirmation({
  accountCta,
  currency,
  details,
  items,
  locale,
  orderId,
  shippingTotal,
  subtotal,
  total
}: Readonly<OrderConfirmationProps>): JSX.Element {
  const t = getMessagesForLocale(locale).emails.orderConfirmation;
  const reference = orderId.slice(REFERENCE_START, REFERENCE_LENGTH).toUpperCase();

  return (
    <EmailLayout locale={locale} preview={t.preview} tagline={t.tagline}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t.heading}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t.message}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t.messageSecondary}</EmailBodyText>

      <EmailBorderedSection>
        <Text className="text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase">{t.orderLabel}</Text>
        <Text className="text-ink mt-[10px] mb-0 font-serif text-[20px] leading-[26px] tracking-[0.12em]">{reference}</Text>

        <Hr className="border-line my-[22px]" />

        <Text className="text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase">{t.itemsLabel}</Text>
        {items.map((item, index) => (
          <OrderItemRow
            key={`${item.title}-${item.productUrl}-${item.qty}`}
            currency={currency}
            isFirst={index === REFERENCE_START}
            item={item}
            locale={locale}
            viewProductLabel={t.viewProductLink}
          />
        ))}

        <Hr className="border-line my-[22px]" />

        <Section className="m-0">
          <Text className="text-ink m-0 text-[14px] leading-[24px]">
            {t.subtotalLabel}: {formatPrice(subtotal, currency, locale)}
          </Text>
          <Text className="text-ink mt-[8px] mb-0 text-[14px] leading-[24px]">
            {t.shippingLabel}: {formatPrice(shippingTotal, currency, locale)}
          </Text>
          <Text className="text-ink mt-[12px] mb-0 text-[15px] leading-[24px] font-semibold">
            {t.totalLabel}: {formatPrice(total, currency, locale)}
          </Text>
        </Section>

        <Hr className="border-line my-[22px]" />

        <DetailRow isFirst label={t.paymentMethodLabel} value={details.paymentMethod} />
        <DetailRow label={t.deliveryMethodLabel} value={details.deliveryMethod} />
        <DetailRow label={t.shippingAddressLabel} value={details.shippingAddress} />
        <DetailRow label={t.billingAddressLabel} value={details.billingAddress} />
        <DetailRow label={t.fulfillmentTimeLabel} value={details.fulfillmentTime} />
        <DetailRow label={t.estimatedDeliveryLabel} value={details.estimatedDelivery} />
      </EmailBorderedSection>

      <EmailBodyText>{t.closingNote}</EmailBodyText>

      {accountCta.isGuest ? (
        <Section className="mt-[16px]">
          <Text className={EMAIL_MUTED_TEXT_CLASS}>{t.accountCtaNote}</Text>
        </Section>
      ) : undefined}

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={accountCta.href}>
          {accountCta.label}
        </Button>
      </Section>

      <EmailBodyText className="mt-[34px]">{t.signoff}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t.sender}</EmailBodyText>
    </EmailLayout>
  );
}

OrderConfirmation.PreviewProps = {
  accountCta: {
    href: "http://localhost:3000/auth/sign-up",
    isGuest: true,
    label: "Załóż konto i śledź zamówienie"
  },
  currency: "PLN",
  details: {
    billingAddress: "Tak jak adres dostawy",
    deliveryMethod: "Kurier DPD · dostawa do domu",
    estimatedDelivery: "2–4 dni robocze od wysyłki",
    fulfillmentTime: "1–3 dni robocze",
    paymentMethod: "Karta płatnicza",
    shippingAddress: "Anna Kowalska\nul. Mokotowska 12/4\n00-640 Warszawa\nPL\n+48 600 123 456"
  },
  items: [
    {
      imageUrl: "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.svg",
      price: 24_900,
      productUrl: "http://localhost:3000/products/bransoletka-aurora",
      qty: 1,
      title: "Bransoletka Aurora"
    },
    {
      imageUrl: "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.svg",
      price: 18_900,
      productUrl: "http://localhost:3000/products/kolczyki-luna",
      qty: 2,
      title: "Kolczyki Luna"
    }
  ],
  locale: "pl",
  orderId: "a1b2c3d4-0000-0000-0000-000000000000",
  shippingTotal: 1900,
  subtotal: 62_700,
  total: 64_600
} satisfies OrderConfirmationProps;
