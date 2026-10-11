import { type JSX } from "react"

import { Button, Heading, Hr, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type OrderAccountCta } from "~/src/modules/order/order.email.utils"

import type emailMessages from "~/messages/en-US/emails.order-cancelled.json"
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

export const ORDER_CANCELLED_NAMESPACE = "emails.order-cancelled"

export const OrderCancelled = ({
  accountCta,
  currency,
  locale,
  messages,
  orderNumber,
  refundedAmount,
}: Readonly<OrderCancelledProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "order-cancelled": messages } }, namespace: ORDER_CANCELLED_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <EmailBorderedSection>
        <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("orderLabel")}</Text>
        <Text className="text-ink mt-[10px] mb-0 font-serif text-[20px] leading-[26px] tracking-[0.12em]">{orderNumber}</Text>

        <Hr className="border-line my-[20px]" />

        {refundedAmount === undefined ? (
          <Text className={EMAIL_MUTED_TEXT_CLASS}>{t("noPaymentNote")}</Text>
        ) : (
          <>
            <EmailDetailRow isFirst label={t("refundLabel")}>
              {formatPrice(refundedAmount, currency, locale)}
            </EmailDetailRow>
            <Text className={`${EMAIL_MUTED_TEXT_CLASS} mt-[12px]`}>{t("refundNote")}</Text>
          </>
        )}
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

interface OrderCancelledProps {
  readonly accountCta: OrderAccountCta
  readonly currency: string
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
  readonly refundedAmount: number | undefined
}
