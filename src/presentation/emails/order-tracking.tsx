import { type JSX } from "react"

import { Button, Heading, Hr, Link, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type emailMessages from "~/messages/en-US/emails.order-tracking.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_DETAIL_LABEL_CLASS,
  EmailBodyText,
  EmailBorderedSection,
  EmailDetailRow,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
import { type OrderAccountCta, type OrderTracking } from "~/src/presentation/emails/order-email-content"

export const ORDER_TRACKING_NAMESPACE = "emails.order-tracking"

export const OrderTrackingUpdate = ({
  accountCta,
  locale,
  messages,
  orderNumber,
  tracking,
}: Readonly<OrderTrackingUpdateProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "order-tracking": messages } }, namespace: ORDER_TRACKING_NAMESPACE })

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

        {tracking.carrier !== undefined && (
          <EmailDetailRow isFirst label={t("carrierLabel")}>
            {tracking.carrier}
          </EmailDetailRow>
        )}
        <EmailDetailRow isFirst={tracking.carrier === undefined} label={t("trackingNumberLabel")}>
          {tracking.trackingNumber ?? t("unavailable")}
        </EmailDetailRow>
      </EmailBorderedSection>

      <EmailBodyText>{t("closingNote")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={tracking.trackingUrl ?? accountCta.href}>
          {tracking.trackingUrl === undefined ? accountCta.label : t("trackingCta")}
        </Button>
        {tracking.trackingUrl !== undefined && (
          <Text className="mt-[16px] mb-0 text-[12px] leading-[18px]">
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

interface OrderTrackingUpdateProps {
  readonly accountCta: OrderAccountCta
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
  readonly tracking: OrderTracking
}
