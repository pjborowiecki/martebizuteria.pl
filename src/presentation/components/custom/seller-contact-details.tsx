import { type JSX } from "react"

import { cn } from "cn"
import { useTranslations } from "use-intl/react"

import { BUSINESS, BUSINESS_PHONE_HREF, BUSINESS_POSTAL_ADDRESS_LINES } from "~/src/presentation/branding/business"

export const SellerContactDetails = ({ className }: Readonly<{ className: string }>): JSX.Element => {
  const t = useTranslations("components.custom.sellerContactDetails")

  return (
    <address className={cn("grid gap-6 not-italic", className)}>
      <p className="whitespace-pre-line">{[...BUSINESS_POSTAL_ADDRESS_LINES, t("country")].join("\n")}</p>
      <p className="whitespace-pre-line">{[t("nip", { nip: BUSINESS.NIP }), t("regon", { regon: BUSINESS.REGON })].join("\n")}</p>
      <p className="flex flex-col items-start">
        <a className={CONTACT_LINK_CLASS} href={`mailto:${BUSINESS.EMAIL}`}>
          {BUSINESS.EMAIL}
        </a>
        <a className={CONTACT_LINK_CLASS} href={BUSINESS_PHONE_HREF}>
          {BUSINESS.PHONE}
        </a>
      </p>
    </address>
  )
}

const CONTACT_LINK_CLASS = "underline-offset-4 hover:underline"
