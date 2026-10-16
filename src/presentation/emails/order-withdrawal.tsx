import { type JSX } from "react"

import { Button, Heading, Hr, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"
import { formatSellerPostalAddress } from "~/src/modules/store-setting/store-setting.utils"

import type emailMessages from "~/messages/en-US/emails.order-withdrawal.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_DETAIL_LABEL_CLASS,
  EmailBodyText,
  EmailBorderedSection,
  EmailDetailRow,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const ORDER_WITHDRAWAL_NAMESPACE = "emails.order-withdrawal"

const HEADING_CLASS = "text-ink m-0 text-center font-serif text-[30px] leading-[38px] font-normal tracking-[0.02em]"

const STATEMENT_TEXT_CLASS = "text-ink mt-[12px] mb-0 text-[14px] leading-[22px] whitespace-pre-line"

const translatorFor = (locale: SupportedLocale, messages: typeof emailMessages) =>
  createTranslator({ locale, messages: { emails: { "order-withdrawal": messages } }, namespace: ORDER_WITHDRAWAL_NAMESPACE })

const formatSubmittedAt = (submittedAt: Date, locale: SupportedLocale): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "long", timeZone: I18N.DEFAULT_TIMEZONE }).format(submittedAt)

const WithdrawalStatement = ({ locale, messages, orderNumber, statement }: Readonly<OrderWithdrawalEmailProps>): JSX.Element => {
  const t = translatorFor(locale, messages)

  return (
    <EmailBorderedSection>
      <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("statement.label")}</Text>
      <Text className={STATEMENT_TEXT_CLASS}>{t("statement.declaration", { orderNumber, scope: statement.scope })}</Text>
      {statement.items === undefined ? undefined : <Text className={STATEMENT_TEXT_CLASS}>{statement.items}</Text>}

      <Hr className="border-line my-[20px]" />

      <EmailDetailRow isFirst label={t("statement.nameLabel")}>
        {statement.consumerName}
      </EmailDetailRow>
      <EmailDetailRow label={t("statement.submittedAtLabel")}>{formatSubmittedAt(statement.submittedAt, locale)}</EmailDetailRow>
      <EmailDetailRow label={t("statement.emailLabel")}>{statement.email}</EmailDetailRow>
      <EmailDetailRow label={t("statement.reasonLabel")}>{statement.reason ?? t("statement.noReason")}</EmailDetailRow>
    </EmailBorderedSection>
  )
}

export const OrderWithdrawalReceived = ({ seller, ...props }: Readonly<OrderWithdrawalReceivedProps>): JSX.Element => {
  const t = translatorFor(props.locale, props.messages)

  return (
    <EmailLayout locale={props.locale} preview={t("received.preview")} tagline={t("received.tagline")}>
      <Heading className={HEADING_CLASS}>{t("received.heading")}</Heading>

      <EmailBodyText className="mt-[30px]">{t("received.message", { orderNumber: props.orderNumber })}</EmailBodyText>

      <WithdrawalStatement {...props} />

      <EmailDetailRow isFirst label={t("received.returnLabel")}>
        {t("received.returnBody")}
      </EmailDetailRow>
      <Text className={STATEMENT_TEXT_CLASS}>{formatSellerPostalAddress(seller, props.locale).join("\n")}</Text>
      <EmailDetailRow label={t("received.refundLabel")}>{t("received.refundBody")}</EmailDetailRow>

      <EmailBodyText className="mt-[30px]">{t("received.closingNote")}</EmailBodyText>
      <EmailBodyText className="mt-[34px]">{t("received.signoff")}</EmailBodyText>
      <EmailBodyText className="font-serif italic">{t("received.sender")}</EmailBodyText>
    </EmailLayout>
  )
}

export const OrderWithdrawalNotice = ({ adminOrderUrl, ...props }: Readonly<OrderWithdrawalNoticeProps>): JSX.Element => {
  const t = translatorFor(props.locale, props.messages)

  return (
    <EmailLayout locale={props.locale} preview={t("notice.preview")} tagline={t("notice.tagline")}>
      <Heading className={HEADING_CLASS}>{t("notice.heading")}</Heading>

      <EmailBodyText className="mt-[30px]">{t("notice.message", { orderNumber: props.orderNumber })}</EmailBodyText>

      <WithdrawalStatement {...props} />

      <Section className={EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS}>
        <Button className={EMAIL_CTA_BUTTON_CLASS} href={adminOrderUrl}>
          {t("notice.adminCta")}
        </Button>
      </Section>
    </EmailLayout>
  )
}

interface OrderWithdrawalEmailProps {
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
  readonly statement: OrderWithdrawal["statement"]
}

interface OrderWithdrawalReceivedProps extends OrderWithdrawalEmailProps {
  readonly seller: StoreSetting["sellerDetails"]
}

interface OrderWithdrawalNoticeProps extends OrderWithdrawalEmailProps {
  readonly adminOrderUrl: string
}
