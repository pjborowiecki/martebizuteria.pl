import { type JSX } from "react"

import { Button, Heading, Hr, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type OrderAccountCta } from "~/src/integrations/resend/order-confirmation.utils"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

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
        <DetailRow label={t("shippingAddressLabel")} value={details.shippingAddress} />
        {details.trackingNumber !== undefined && <DetailRow label={t("trackingNumberLabel")} value={details.trackingNumber} />}
        <DetailRow label={t("estimatedDeliveryLabel")} value={details.estimatedDelivery} />
      </EmailBorderedSection>

      <EmailBodyText>{t("closingNote")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={details.trackingUrl ?? accountCta.href}>
          {details.trackingUrl === undefined ? accountCta.label : t("trackingCta")}
        </Button>
      </Section>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

const DETAIL_GROUP_TOP_MARGIN = "mt-[20px]"

const DETAIL_LABEL_CLASS = "text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase"

const DETAIL_VALUE_CLASS = "text-ink mt-[6px] mb-0 text-[14px] leading-[22px] whitespace-pre-line"

export interface OrderShippedDetails {
  readonly deliveryMethod: string
  readonly estimatedDelivery: string
  readonly shippingAddress: string
  readonly trackingNumber: string | undefined
  readonly trackingUrl: string | undefined
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
