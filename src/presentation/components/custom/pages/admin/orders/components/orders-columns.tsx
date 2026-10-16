import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { buildOrderColumns } from "~/src/presentation/components/custom/pages/admin/orders/lib/orders-column-defs"

export const useOrderColumns = () => {
  const t = useTranslations("pages.admin.orders")
  const tAdmin = useTranslations("pages.admin")
  const formatLocale = useFormatLocale()

  return useMemo(
    () =>
      buildOrderColumns({
        formatLocale,
        t,
        tAdmin,
      }),
    [formatLocale, t, tAdmin],
  )
}
