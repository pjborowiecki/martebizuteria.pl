import { type JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { cn } from "cn"
import { useLocale, useTranslations } from "use-intl/react"

import { formatSellerPostalAddress, toSellerPhoneHref } from "~/src/modules/store-setting/store-setting.utils"
import { getSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

export const SellerContactDetails = ({ className }: Readonly<{ className: string }>): JSX.Element => {
  const t = useTranslations("components.custom.sellerContactDetails")
  const locale = useLocale()
  const { data: seller } = useSuspenseQuery(getSellerDetailsQuery())

  return (
    <address className={cn("grid gap-6 not-italic", className)}>
      <p className="whitespace-pre-line">{formatSellerPostalAddress(seller, locale).join("\n")}</p>
      <p className="whitespace-pre-line">{[t("nip", { nip: seller.nip }), t("regon", { regon: seller.regon })].join("\n")}</p>
      <p className="flex flex-col items-start">
        <a className={CONTACT_LINK_CLASS} href={`mailto:${seller.email}`}>
          {seller.email}
        </a>
        <a className={CONTACT_LINK_CLASS} href={toSellerPhoneHref(seller.phone)}>
          {seller.phone}
        </a>
      </p>
    </address>
  )
}

const CONTACT_LINK_CLASS = "inline-flex min-h-6 items-center underline-offset-4 hover:underline pointer-coarse:min-h-10"
