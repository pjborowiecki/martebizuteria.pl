import { type JSX } from "react"

import { Button, Heading, Hr, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.order-in-progress.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_DETAIL_LABEL_CLASS,
  EmailBodyText,
  EmailBorderedSection,
  EmailDetailRow,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
import { type OrderAccountCta } from "~/src/presentation/emails/order-email-content"

export const ORDER_IN_PROGRESS_NAMESPACE = "emails.order-in-progress"

export const OrderInProgress = ({ accountCta, delivery, locale, messages, orderNumber }: Readonly<OrderInProgressProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "order-in-progress": messages } }, namespace: ORDER_IN_PROGRESS_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t(`nextStep.${delivery.type}`)}</EmailBodyText>

      <EmailBorderedSection>
        <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("orderLabel")}</Text>
        <Text className="text-ink mt-[10px] mb-0 font-serif text-[20px] leading-[26px] tracking-[0.12em]">{orderNumber}</Text>

        <Hr className="border-line my-[20px]" />

        <EmailDetailRow isFirst label={t("deliveryMethodLabel")}>
          {delivery.methodName ?? t("unavailable")}
        </EmailDetailRow>
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

export interface OrderInProgressDelivery {
  readonly methodName: string | undefined
  readonly type: "courier" | "in_store" | "locker"
}

interface OrderInProgressProps {
  readonly accountCta: OrderAccountCta
  readonly delivery: OrderInProgressDelivery
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
}
