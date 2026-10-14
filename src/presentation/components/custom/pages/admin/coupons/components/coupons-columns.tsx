import { useMemo } from "react"

import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { buildCouponColumns } from "~/src/presentation/components/custom/pages/admin/coupons/lib/coupons-column-defs"

export const useCouponColumns = () => {
  const t = useTranslations("pages.admin.coupons")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()

  return useMemo(
    () =>
      buildCouponColumns({
        format,
        locale,
        t,
        tAdmin,
      }),
    [format, locale, t, tAdmin],
  )
}
