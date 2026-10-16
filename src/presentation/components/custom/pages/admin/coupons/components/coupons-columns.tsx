import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { useFormatLocale, useFormatter } from "~/src/hooks/use-display-format"

import { buildCouponColumns } from "~/src/presentation/components/custom/pages/admin/coupons/lib/coupons-column-defs"

export const useCouponColumns = () => {
  const t = useTranslations("pages.admin.coupons")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const formatLocale = useFormatLocale()

  return useMemo(
    () =>
      buildCouponColumns({
        format,
        formatLocale,
        t,
        tAdmin,
      }),
    [format, formatLocale, t, tAdmin],
  )
}
