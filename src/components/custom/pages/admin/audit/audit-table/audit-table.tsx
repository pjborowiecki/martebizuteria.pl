import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Table, TableBody, TableCell, TableRow } from "~/src/components/shadcn/table";

import { AuditEventRow } from "~/src/components/custom/pages/admin/audit/audit-table/audit-event-row";
import { AuditTableHeader } from "~/src/components/custom/pages/admin/audit/audit-table/audit-table-header";

import type { AuditEvent } from "~/src/data/audit-data";

const TABLE_COLUMN_COUNT = 8;
const EMPTY_LIST_LENGTH = 0;

interface AuditTableProps {
  readonly events: readonly AuditEvent[];
}

export function AuditTable({ events }: AuditTableProps): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-auto">
        <Table>
          <AuditTableHeader />
          <TableBody>
            {events.map((event) => (
              <AuditEventRow event={event} key={event.id} />
            ))}
            {events.length === EMPTY_LIST_LENGTH && (
              <TableRow>
                <TableCell className="py-12 text-center text-sm text-muted-foreground" colSpan={TABLE_COLUMN_COUNT}>
                  {t("audit.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
