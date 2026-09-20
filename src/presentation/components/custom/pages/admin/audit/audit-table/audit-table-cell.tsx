import { type JSX, type ReactNode } from "react"

export const AuditTableCell = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => <div className={AUDIT_TABLE_CELL_INNER_CLASS}>{children}</div>

export const AUDIT_TABLE_CELL_INNER_CLASS = "flex h-9 w-full min-w-0 shrink-0 items-center"
