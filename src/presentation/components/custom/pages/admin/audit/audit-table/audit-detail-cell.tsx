import { type JSX } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

import { AuditTableCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-table-cell"
import { formatAuditLogDetail } from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-detail-format"
import { CATALOG_DATAGRID_MUTED_TEXT_CLASS } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-truncated-text-cell"

export const AuditDetailCell = ({ detail }: Readonly<AuditDetailCellProps>): JSX.Element => {
  const t = useTranslations("pages.admin")
  const locale = useLocale()

  return (
    <AuditTableCell>
      <span className={`${CATALOG_DATAGRID_MUTED_TEXT_CLASS} text-xs`}>
        {detail === undefined ? EMPTY_VALUE : formatAuditLogDetail(detail, { locale, t })}
      </span>
    </AuditTableCell>
  )
}

interface AuditDetailCellProps {
  readonly detail: AuditLog["detail"] | undefined
}
