import { type JSX } from "react"

import { Button, Heading, Hr, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import type emailMessages from "~/messages/en-US/emails.order-refunded.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_DETAIL_LABEL_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText,
  EmailBorderedSection,
  EmailDetailRow,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
import { type OrderAccountCta } from "~/src/presentation/emails/order-email-content"

export const ORDER_REFUNDED_NAMESPACE = "emails.order-refunded"

export const OrderRefunded = ({
  accountCta,
  currency,
  fullyRefunded,
  locale,
  messages,
  orderNumber,
  orderTotal,
  refundedAmount,
}: Readonly<OrderRefundedProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "order-refunded": messages } }, namespace: ORDER_REFUNDED_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t(fullyRefunded ? "messageFull" : "messagePartial")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <EmailBorderedSection>
        <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("orderLabel")}</Text>
        <Text className="text-ink mt-[10px] mb-0 font-serif text-[20px] leading-[26px] tracking-[0.12em]">{orderNumber}</Text>

        <Hr className="border-line my-[20px]" />

        <EmailDetailRow isFirst label={t("refundLabel")}>
          {formatPrice(refundedAmount, currency, locale)}
        </EmailDetailRow>
        <EmailDetailRow label={t("orderTotalLabel")}>{formatPrice(orderTotal, currency, locale)}</EmailDetailRow>
        <Text className={`${EMAIL_MUTED_TEXT_CLASS} mt-[20px]`}>{t("refundNote")}</Text>
      </EmailBorderedSection>

      <EmailBodyText>{t("closingNote")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={accountCta.href}>
          {accountCta.label}
        </Button>
      </Section>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface OrderRefundedProps {
  readonly accountCta: OrderAccountCta
  readonly currency: string
  readonly fullyRefunded: boolean
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
  readonly orderTotal: number
  readonly refundedAmount: number
}
