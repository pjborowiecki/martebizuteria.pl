import { type JSX } from "react"

import { Button, Heading, Hr, Link, Section, Text } from "react-email"
import { createTranslator } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type OrderAccountCta } from "~/src/modules/order/order.email.utils"

import { BUSINESS } from "~/src/presentation/branding/business"

import type emailMessages from "~/messages/en-US/emails.order-delivered.json"
import {
  EMAIL_CTA_BUTTON_CLASS,
  EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS,
  EMAIL_DETAIL_LABEL_CLASS,
  EmailBodyText,
  EmailBorderedSection,
} from "~/src/presentation/emails/email-highlight-box"
import { EmailLayout } from "~/src/presentation/emails/email-layout"

export const ORDER_DELIVERED_NAMESPACE = "emails.order-delivered"

const CARE_TIPS = ["wipe", "takeOff", "putOnLast", "gentle"] as const

export const OrderDelivered = ({ accountCta, links, locale, messages, orderNumber }: Readonly<OrderDeliveredProps>): JSX.Element => {
  const t = createTranslator({ locale, messages: { emails: { "order-delivered": messages } }, namespace: ORDER_DELIVERED_NAMESPACE })

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

        <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("care.label")}</Text>
        {CARE_TIPS.map((tip) => (
          <Text className={NOTE_TEXT_CLASS} key={tip}>
            {`• ${t(`care.tips.${tip}`)}`}
          </Text>
        ))}
        <Text className={NOTE_TEXT_CLASS}>
          <Link className={LINK_CLASS} href={links.care}>
            {t("care.more")}
          </Link>
        </Text>
      </EmailBorderedSection>

      <Text className={EMAIL_DETAIL_LABEL_CLASS}>{t("returns.label")}</Text>
      <Text className={NOTE_TEXT_CLASS}>{t("returns.period")}</Text>
      <Text className={NOTE_TEXT_CLASS}>{t("returns.exception")}</Text>
      <Text className={NOTE_TEXT_CLASS}>
        <Link className={LINK_CLASS} href={links.withdrawal}>
          {t("returns.withdrawal")}
        </Link>
        {LINK_SEPARATOR}
        <Link className={LINK_CLASS} href={links.exchangesAndReturns}>
          {t("returns.exchangesAndReturns")}
        </Link>
      </Text>

      <EmailBodyText className="mt-[28px]">{t("contact", { email: BUSINESS.EMAIL, phone: BUSINESS.PHONE })}</EmailBodyText>

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

const NOTE_TEXT_CLASS = "text-ink mt-[8px] mb-0 text-[13px] leading-[22px]"

const LINK_CLASS = "text-ink underline"

const LINK_SEPARATOR = " · "

export interface OrderDeliveredLinks {
  readonly care: string
  readonly exchangesAndReturns: string
  readonly withdrawal: string
}

interface OrderDeliveredProps {
  readonly accountCta: OrderAccountCta
  readonly links: OrderDeliveredLinks
  readonly locale: SupportedLocale
  readonly messages: typeof emailMessages
  readonly orderNumber: string
}
