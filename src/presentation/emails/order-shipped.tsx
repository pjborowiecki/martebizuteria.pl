import { type JSX } from "react"

import { Button, Heading, Hr, Section, Text } from "react-email"

import { type OrderAccountCta } from "~/src/integrations/resend/order-confirmation.utils"
import { getEmailMessages } from "~/src/integrations/use-intl/i18n.emails"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EmailBodyText,
  EmailBorderedSection,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
const DetailRow = ({ isFirst = false, label, value }: Readonly<DetailRowProps>): JSX.Element => (
  <Section className={isFirst ? "m-0" : DETAIL_GROUP_TOP_MARGIN}>
    <Text className={DETAIL_LABEL_CLASS}>{label}</Text>
    <Text className={DETAIL_VALUE_CLASS}>{value}</Text>
  </Section>
)

export const OrderShipped = ({ accountCta, details, locale, orderId }: Readonly<OrderShippedProps>): JSX.Element => {
  const t = getEmailMessages(locale).emails.orderShipped
  const reference = orderId.slice(0, REFERENCE_LENGTH).toUpperCase()
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

        <Hr className="border-line my-[20px]" />

        <DetailRow isFirst label={t.deliveryMethodLabel} value={details.deliveryMethod} />
        <DetailRow label={t.shippingAddressLabel} value={details.shippingAddress} />
        <DetailRow label={t.estimatedDeliveryLabel} value={details.estimatedDelivery} />
      </EmailBorderedSection>

      <EmailBodyText>{t.closingNote}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={accountCta.href}>
          {accountCta.label}
        </Button>
      </Section>

      <EmailBodyText className="mt-[34px]">{t.signoff}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t.sender}</EmailBodyText>
    </EmailLayout>
  )
}
const REFERENCE_LENGTH = 8
const DETAIL_GROUP_TOP_MARGIN = "mt-[20px]"
const DETAIL_LABEL_CLASS = "text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase"
const DETAIL_VALUE_CLASS = "text-ink mt-[6px] mb-0 text-[14px] leading-[22px] whitespace-pre-line"
export interface OrderShippedDetails {
  readonly deliveryMethod: string
  readonly estimatedDelivery: string
  readonly shippingAddress: string
}
export interface OrderShippedProps {
  readonly accountCta: OrderAccountCta
  readonly details: OrderShippedDetails
  readonly locale: Locale
  readonly orderId: string
}
export const getOrderShippedSubject = (locale: Locale): string => getEmailMessages(locale).emails.orderShipped.subject
interface DetailRowProps {
  readonly isFirst?: boolean
  readonly label: string
  readonly value: string
}
OrderShipped.PreviewProps = {
  accountCta: {
    href: "http://localhost:3000/pl/konto/zamowienia/abc123",
    isGuest: false,
    label: "Zobacz zamówienie",
  },
  details: {
    deliveryMethod: "Kurier DPD · dostawa do domu",
    estimatedDelivery: "2–4 dni robocze od wysyłki",
    shippingAddress: "Anna Kowalska\nul. Mokotowska 12/4\n00-640 Warszawa\nPL\n+48 600 123 456",
  },
  locale: "pl",
  orderId: "a1b2c3d4-0000-0000-0000-000000000000",
} satisfies OrderShippedProps
