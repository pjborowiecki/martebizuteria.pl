import { type JSX } from "react"

import { Button, Heading, Hr, Link, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type OrderAccountCta, type OrderEmailDestination, type OrderTracking } from "~/src/modules/order/order.email.utils"

import type emailMessages from "~/messages/en-US/emails.order-shipped.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EmailBodyText,
  EmailBorderedSection,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const ORDER_SHIPPED_NAMESPACE = "emails.order-shipped"

const DetailRow = ({ isFirst = false, label, value }: Readonly<DetailRowProps>): JSX.Element => (
  <Section className={isFirst ? "m-0" : DETAIL_GROUP_TOP_MARGIN}>
    <Text className={DETAIL_LABEL_CLASS}>{label}</Text>
    <Text className={DETAIL_VALUE_CLASS}>{value}</Text>
  </Section>
)

export const OrderShipped = ({ accountCta, details, locale, messages, orderNumber }: Readonly<OrderShippedProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "order-shipped": messages } }, namespace: ORDER_SHIPPED_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <EmailBorderedSection>
        <Text className="text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase">{t("orderLabel")}</Text>
        <Text className="text-ink mt-[10px] mb-0 font-serif text-[20px] leading-[26px] tracking-[0.12em]">{orderNumber}</Text>

        <Hr className="border-line my-[20px]" />

        <DetailRow isFirst label={t("deliveryMethodLabel")} value={details.deliveryMethod} />
        {details.carrier !== undefined && <DetailRow label={t("carrierLabel")} value={details.carrier} />}
        {details.destination.kind === "address" ? (
          <DetailRow label={t("shippingAddressLabel")} value={details.destination.address} />
        ) : (
          <>
            <DetailRow label={t("lockerLabel")} value={details.destination.locker} />
            {details.destination.recipient !== undefined && <DetailRow label={t("recipientLabel")} value={details.destination.recipient} />}
          </>
        )}
        {details.trackingNumber !== undefined && <DetailRow label={t("trackingNumberLabel")} value={details.trackingNumber} />}
        <DetailRow label={t("estimatedDeliveryLabel")} value={details.estimatedDelivery} />
      </EmailBorderedSection>

      <EmailBodyText>{t("closingNote")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={details.trackingUrl ?? accountCta.href}>
          {details.trackingUrl === undefined ? accountCta.label : t("trackingCta")}
        </Button>
        {details.trackingUrl !== undefined && (
          <Text className={ACCOUNT_LINK_TEXT_CLASS}>
            <Link className="text-ink underline" href={accountCta.href}>
              {accountCta.label}
            </Link>
          </Text>
        )}
      </Section>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

const DETAIL_GROUP_TOP_MARGIN = "mt-[20px]"

const ACCOUNT_LINK_TEXT_CLASS = "mt-[16px] mb-0 text-[12px] leading-[18px]"

const DETAIL_LABEL_CLASS = "text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase"

const DETAIL_VALUE_CLASS = "text-ink mt-[6px] mb-0 text-[14px] leading-[22px] whitespace-pre-line"

export interface OrderShippedDetails extends OrderTracking {
  readonly deliveryMethod: string
  readonly destination: OrderEmailDestination
  readonly estimatedDelivery: string
}

interface OrderShippedProps {
  readonly accountCta: OrderAccountCta
  readonly details: OrderShippedDetails
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
}

interface DetailRowProps {
  readonly isFirst?: boolean
  readonly label: string
  readonly value: string
}
