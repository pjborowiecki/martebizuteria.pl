import { useMemo } from "react"

import { useTranslations } from "use-intl/react"

import { buildAuditColumns } from "~/src/presentation/components/custom/pages/admin/audit/lib/audit-column-defs"

export const useAuditColumns = () => {
  const t = useTranslations("pages.admin")

  return useMemo(
    () =>
      buildAuditColumns({
        selectionLabels: {
          all: t("a11y.selectAll"),
          row: t("a11y.selectRow"),
        },
        t,
      }),
    [t],
  )
}
