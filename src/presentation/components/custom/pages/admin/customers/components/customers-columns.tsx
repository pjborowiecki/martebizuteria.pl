import { useMemo } from "react"

import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { buildCustomerColumns } from "~/src/presentation/components/custom/pages/admin/customers/lib/customers-column-defs"

export const useCustomerColumns = () => {
  const t = useTranslations("pages.admin.customers")
  const tAdmin = useTranslations("pages.admin")
  const format = useFormatter()
  const locale = useLocale()

  return useMemo(
    () =>
      buildCustomerColumns({
        format,
        locale,
        t,
        tAdmin,
      }),
    [format, locale, t, tAdmin],
  )
}
