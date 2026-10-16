import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { useDisplayTimeZone, useFormatLocale, useFormatter } from "~/src/hooks/use-display-format"

import { buildCustomerColumns } from "~/src/presentation/components/custom/pages/admin/customers/lib/customers-column-defs"

export const useCustomerColumns = () => {
  const t = useTranslations("pages.admin.customers")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const formatLocale = useFormatLocale()
  const timeZone = useDisplayTimeZone()

  return useMemo(
    () =>
      buildCustomerColumns({
        format,
        formatLocale,
        t,
        tAdmin,
        timeZone,
      }),
    [format, formatLocale, t, tAdmin, timeZone],
  )
}
