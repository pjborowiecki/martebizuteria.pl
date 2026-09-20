import { type JSX } from "react"

import { formatAdminAuditTarget } from "~/src/modules/audit-log/audit-log.utils"

import { AuditTableCell } from "~/src/presentation/components/custom/pages/admin/audit/audit-table/audit-table-cell"
export const AuditTargetCell = ({ resourceId, target }: Readonly<AuditTargetCellProps>): JSX.Element => {
  if (resourceId === undefined || resourceId === target) {
    return (
      <AuditTableCell>
        <span className="truncate text-xs font-medium">{target}</span>
      </AuditTableCell>
    )
  }
  return (
    <AuditTableCell>
      <span className="truncate text-xs" title={formatAdminAuditTarget(target, resourceId)}>
        <span className="font-medium">{target}</span>
        <span className="font-mono text-[10px] text-muted-foreground/70"> ({resourceId})</span>
      </span>
    </AuditTableCell>
  )
}
interface AuditTargetCellProps {
  readonly resourceId?: string | undefined
  readonly target: string
}
