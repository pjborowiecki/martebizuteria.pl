import type { JSX, ReactNode } from "react";

/** Matches catalog/customer list rows and datagrid skeleton placeholder inner height. */
export const AUDIT_TABLE_CELL_INNER_CLASS = "flex h-9 w-full min-w-0 shrink-0 items-center";

export function AuditTableCell({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return <div className={AUDIT_TABLE_CELL_INNER_CLASS}>{children}</div>;
}
