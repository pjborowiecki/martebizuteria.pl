import { type JSX } from "react"

import { Button, Heading, Link, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formatPrice } from "~/src/modules/_core/utils/currency"

import type emailMessages from "~/messages/en-US/emails.payment-failed.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_DETAIL_LABEL_CLASS,
  EmailBodyText,
  EmailBorderedSection,
  EmailDetailRow,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
import { type OrderConfirmationItem } from "~/src/presentation/emails/order-confirmation"

export const PAYMENT_FAILED_NAMESPACE = "emails.payment-failed"

export const PaymentFailed = ({ amount, currency, items, locale, messages, shopUrl }: Readonly<PaymentFailedProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "payment-failed": messages } }, namespace: PAYMENT_FAILED_NAMESPACE })

  return (
    <EmailLayout locale={locale} preview={t("preview")} tagline={t("tagline")}>
      <Heading className="text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]">
        {t("heading")}
      </Heading>

      <EmailBodyText className="mt-[30px]">{t("message")}</EmailBodyText>
      <EmailBodyText className="mt-[16px]">{t("messageSecondary")}</EmailBodyText>

      <EmailBorderedSection>
        <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("itemsLabel")}</Text>
        {items.map((item) => (
          <Text key={`${item.title}-${item.productUrl}-${item.qty}`} className="text-ink mt-[6px] mb-0 text-[14px] leading-[22px]">
            <Link className="text-ink underline" href={item.productUrl}>
              {item.title}
            </Link>{" "}
            × {item.qty}
          </Text>
        ))}
        {amount === null || currency === null ? undefined : (
          <EmailDetailRow label={t("amountLabel")}>{formatPrice(amount, currency, locale)}</EmailDetailRow>
        )}
      </EmailBorderedSection>

      <EmailBodyText>{t("closingNote")}</EmailBodyText>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={shopUrl}>
          {t("shopCta")}
        </Button>
      </Section>

      <EmailBodyText className="mt-[34px]">{t("signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("sender")}</EmailBodyText>
    </EmailLayout>
  )
}

interface PaymentFailedProps {
  readonly amount: number | null
  readonly currency: string | null
  readonly items: readonly Pick<OrderConfirmationItem, "productUrl" | "qty" | "title">[]
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly shopUrl: string
}
