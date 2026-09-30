import { type JSX } from "react"

import { Button, Column, Heading, Hr, Img, Link, Row, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type OrderAccountCta } from "~/src/integrations/resend/order-confirmation.utils"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { formatPrice } from "~/src/modules/_core/utils/currency"
import { formatVatRatePercent } from "~/src/modules/_core/utils/tax"

import type emailMessages from "~/messages/en-US/emails.order-confirmation.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_MUTED_TEXT_CLASS,
  EmailBodyText,
  EmailBorderedSection,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"
import { EMAIL_PRODUCT_IMAGE_STYLE } from "~/src/presentation/emails/email-styles"

export const ORDER_CONFIRMATION_NAMESPACE = "emails.order-confirmation"

const DetailRow = ({ isFirst = false, label, value }: Readonly<DetailRowProps>): JSX.Element => (
  <Section className={isFirst ? "m-0" : DETAIL_GROUP_TOP_MARGIN}>
    <Text className={DETAIL_LABEL_CLASS}>{label}</Text>
    <Text className={DETAIL_VALUE_CLASS}>{value}</Text>
  </Section>
)

const OrderItemRow = ({ currency, isFirst, item, locale, viewProductLabel }: Readonly<OrderItemRowProps>): JSX.Element => (
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
)

export const OrderConfirmation = ({
  accountCta,
  currency,
  details,
  items,
  discountTotal,
  locale,
  messages,
  orderNumber,
  shippingTotal,
  subtotal,
  taxBasisPoints,
  taxTotal,
  total,
}: Readonly<OrderConfirmationProps>): JSX.Element => {
  const t = createTranslator({
    locale,
    messages: { emails: { "order-confirmation": messages } },
    namespace: ORDER_CONFIRMATION_NAMESPACE,
  })

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

        <Hr className="border-line my-[22px]" />

        <Text className="text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase">{t("itemsLabel")}</Text>
        {items.map((item, index) => (
          <OrderItemRow
            key={`${item.title}-${item.productUrl}-${item.qty}`}
            currency={currency}
            isFirst={index === 0}
            item={item}
            locale={locale}
            viewProductLabel={t("viewProductLink")}
          />
        ))}

        <Hr className="border-line my-[22px]" />

        <Section className="m-0">
          <Text className="text-ink m-0 text-[14px] leading-[24px]">
            {t("subtotalLabel")}: {formatPrice(subtotal, currency, locale)}
          </Text>
          {discountTotal > NO_AMOUNT && (
            <Text className="text-ink mt-[8px] mb-0 text-[14px] leading-[24px]">
              {t("discountLabel")}: −{formatPrice(discountTotal, currency, locale)}
            </Text>
          )}
          <Text className="text-ink mt-[8px] mb-0 text-[14px] leading-[24px]">
            {t("shippingLabel")}: {formatPrice(shippingTotal, currency, locale)}
          </Text>
          <Text className="text-ink mt-[12px] mb-0 text-[15px] leading-[24px] font-semibold">
            {t("totalLabel")}: {formatPrice(total, currency, locale)}
          </Text>
          <Text className="m-0 mt-[6px] text-[12px] leading-[20px] text-muted">
            {t("vatIncludedLabel", { rate: formatVatRatePercent(taxBasisPoints) })}: {formatPrice(taxTotal, currency, locale)}
          </Text>
        </Section>

        <Hr className="border-line my-[22px]" />

        <DetailRow isFirst label={t("paymentMethodLabel")} value={details.paymentMethod} />
        <DetailRow label={t("deliveryMethodLabel")} value={details.deliveryMethod} />
        <DetailRow label={t("shippingAddressLabel")} value={details.shippingAddress} />
        <DetailRow label={t("billingAddressLabel")} value={details.billingAddress} />
        <DetailRow label={t("fulfillmentTimeLabel")} value={details.fulfillmentTime} />
        <DetailRow label={t("estimatedDeliveryLabel")} value={details.estimatedDelivery} />
      </EmailBorderedSection>

      <EmailBodyText>{t("closingNote")}</EmailBodyText>

      {accountCta.isGuest ? (
        <Section className="mt-[16px]">
          <Text className={EMAIL_MUTED_TEXT_CLASS}>{t("accountCtaNote")}</Text>
        </Section>
      ) : undefined}

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

const NO_AMOUNT = 0

const FIRST_ITEM_TOP_MARGIN = "mt-[8px]"

const ITEM_TOP_MARGIN = "mt-[16px]"

const DETAIL_GROUP_TOP_MARGIN = "mt-[24px]"

const PRODUCT_IMAGE_SIZE = 72

const DETAIL_LABEL_CLASS = "text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase"

const DETAIL_VALUE_CLASS = "text-ink mt-[6px] mb-0 text-[14px] leading-[22px] whitespace-pre-line"

const PRODUCT_LINK_CLASS = "text-muted mt-[6px] inline-block text-[12px] leading-[18px] underline"

export interface OrderConfirmationItem {
  readonly imageUrl: string
  readonly price: number
  readonly productUrl: string
  readonly qty: number
  readonly title: string
}

export interface OrderConfirmationDetails {
  readonly billingAddress: string
  readonly deliveryMethod: string
  readonly estimatedDelivery: string
  readonly fulfillmentTime: string
  readonly paymentMethod: string
  readonly shippingAddress: string
}

interface OrderConfirmationProps {
  readonly accountCta: OrderAccountCta
  readonly currency: string
  readonly details: OrderConfirmationDetails
  readonly items: readonly OrderConfirmationItem[]
  readonly locale: SupportedLocale
  readonly discountTotal: number
  readonly messages: typeof emailMessages
  readonly orderNumber: string
  readonly shippingTotal: number
  readonly subtotal: number
  readonly taxBasisPoints: number
  readonly taxTotal: number
  readonly total: number
}

interface DetailRowProps {
  readonly isFirst?: boolean
  readonly label: string
  readonly value: string
}

interface OrderItemRowProps {
  readonly currency: string
  readonly isFirst: boolean
  readonly item: OrderConfirmationItem
  readonly locale: SupportedLocale
  readonly viewProductLabel: string
}
