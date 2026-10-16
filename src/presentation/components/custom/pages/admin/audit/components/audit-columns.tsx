import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import { buildAuditColumns } from "~/src/presentation/components/custom/pages/admin/audit/lib/audit-column-defs"

export const useAuditColumns = () => {
  const t = useTranslations("pages.admin")
  const formatLocale = useFormatLocale()

  return useMemo(
    () =>
      buildAuditColumns({
        formatLocale,
        selectionLabels: {
          all: t("a11y.selectAll"),
          row: t("a11y.selectRow"),
        },
        t,
      }),
    [formatLocale, t],
  )
}
