import { type JSX } from "react"

import { Button, Heading, Hr, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Order } from "~/src/modules/order/order.types"

import type emailMessages from "~/messages/en-US/emails.new-order.json"
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

export const NEW_ORDER_NAMESPACE = "emails.new-order"

const describeVariantAndSku = ({ sku, variantTitle }: NewOrderItem, skuLabel: string): string =>
  [variantTitle, sku === undefined ? undefined : `${skuLabel}: ${sku}`].filter((part) => part !== undefined).join(" · ")

const NewOrderItemRow = ({ currency, item, locale, skuLabel }: Readonly<NewOrderItemRowProps>): JSX.Element => {
  const variantAndSku = describeVariantAndSku(item, skuLabel)

  return (
    <Section className="mt-[12px]">
      <Text className="text-ink m-0 text-[14px] leading-[22px] font-medium">{item.title}</Text>
      {variantAndSku === "" ? undefined : <Text className={`${EMAIL_MUTED_TEXT_CLASS} mt-[2px]`}>{variantAndSku}</Text>}
      <Text className="text-ink mt-[4px] mb-0 text-[14px] leading-[22px]">
        {item.quantity} × {formatPrice(item.unitPriceMinorUnits, currency, locale)} — {formatPrice(item.totalMinorUnits, currency, locale)}
      </Text>
    </Section>
  )
}

export const NewOrder = ({
  adminOrderUrl,
  currency,
  details,
  items,
  locale,
  messages,
  orderNumber,
  total,
}: Readonly<NewOrderProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "new-order": messages } }, namespace: NEW_ORDER_NAMESPACE })

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

        <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("itemsLabel")}</Text>
        {items.map((item) => (
          <NewOrderItemRow key={item.id} currency={currency} item={item} locale={locale} skuLabel={t("skuLabel")} />
        ))}
        <Text className="text-ink mt-[16px] mb-0 text-[15px] leading-[24px] font-semibold">
          {t("totalLabel")}: {formatPrice(total, currency, locale)}
        </Text>

        <Hr className="border-line my-[20px]" />

        <EmailDetailRow isFirst label={t("customerLabel")}>
          {details.customer}
        </EmailDetailRow>
        <EmailDetailRow label={t("deliveryMethodLabel")}>{details.deliveryMethod}</EmailDetailRow>
        <EmailDetailRow label={t("shippingAddressLabel")}>{details.shippingAddress}</EmailDetailRow>
        {details.companyInvoice === undefined ? undefined : (
          <EmailDetailRow label={t("companyInvoiceLabel")}>{details.companyInvoice}</EmailDetailRow>
        )}
        {details.customerNote === undefined ? undefined : (
          <EmailDetailRow label={t("customerNoteLabel")}>{details.customerNote}</EmailDetailRow>
        )}
      </EmailBorderedSection>

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={adminOrderUrl}>
          {t("adminCta")}
        </Button>
      </Section>
    </EmailLayout>
  )
}

type NewOrderItem = Pick<
  Order["adminOrderDetailItem"],
  "id" | "quantity" | "sku" | "title" | "totalMinorUnits" | "unitPriceMinorUnits" | "variantTitle"
>

export interface NewOrderDetails {
  readonly companyInvoice: string | undefined
  readonly customer: string
  readonly customerNote: string | undefined
  readonly deliveryMethod: string
  readonly shippingAddress: string
}

interface NewOrderProps {
  readonly adminOrderUrl: string
  readonly currency: string
  readonly details: NewOrderDetails
  readonly items: readonly NewOrderItem[]
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
  readonly total: number
}

interface NewOrderItemRowProps {
  readonly currency: string
  readonly item: NewOrderItem
  readonly locale: SupportedLocale
  readonly skuLabel: string
}
