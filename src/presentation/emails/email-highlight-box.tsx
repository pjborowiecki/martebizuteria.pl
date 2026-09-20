import { type JSX, type ReactNode } from "react"

import { Section, Text } from "react-email"

import { EMAIL_HIGHLIGHT_BOX_STYLE } from "~/src/presentation/emails/email-styles"
/** Bordered inset panel with reliable inline padding for email clients. */
export const EmailBorderedSection = ({ children }: Readonly<EmailBorderedSectionProps>): JSX.Element => (
  <Section className="box-border" style={EMAIL_HIGHLIGHT_BOX_STYLE}>
    {children}
  </Section>
)

export const EmailHighlightBox = ({ body, title }: Readonly<EmailHighlightBoxProps>): JSX.Element => (
  <EmailBorderedSection>
    <Text className="text-ink m-0 text-[11px] leading-[16px] font-semibold tracking-[0.22em] uppercase">{title}</Text>
    <Text className="text-ink mt-[12px] mb-0 text-[14px] leading-[24px]">{body}</Text>
  </EmailBorderedSection>
)

export const EmailBodyText = ({ children, className = "" }: Readonly<EmailBodyTextProps>): JSX.Element => (
  <Text className={`text-ink m-0 text-[15px] leading-[26px] ${className}`.trim()}>{children}</Text>
)

export { EMAIL_HIGHLIGHT_BOX_STYLE } from "~/src/presentation/emails/email-styles"
interface EmailBorderedSectionProps {
  readonly children: ReactNode
}
interface EmailHighlightBoxProps {
  readonly body: string
  readonly title: string
}
interface EmailBodyTextProps {
  readonly children: ReactNode
  readonly className?: string
}
export const EMAIL_CTA_BUTTON_CLASS =
  "bg-ink rounded-none px-[32px] py-[15px] text-center text-[11px] leading-[11px] font-semibold tracking-[0.2em] text-white uppercase no-underline box-border"
export const EMAIL_CTA_SECTION_CLASS = "mb-[28px] text-center"
export const EMAIL_CTA_SECTION_WITH_TOP_SPACING_CLASS = "my-[28px] text-center"
export const EMAIL_MUTED_TEXT_CLASS = "m-0 text-[13px] leading-[22px] text-muted"
