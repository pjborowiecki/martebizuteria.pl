import type { JSX } from "react";

import { TableCell, TableRow } from "~/src/components/shadcn/table";

import {
  DATA_GRID_EMPTY_ROW_CELL_CLASS,
  DATA_GRID_EMPTY_ROW_CONTENT_CLASS
} from "~/src/components/custom/datagrid/lib/data-grid-body.styles";

interface DataGridEmptyRowProps {
  readonly colSpan: number;
  readonly message: string;
}

export function DataGridEmptyRow({ colSpan, message }: DataGridEmptyRowProps): JSX.Element {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className={DATA_GRID_EMPTY_ROW_CELL_CLASS}>
        <div className={DATA_GRID_EMPTY_ROW_CONTENT_CLASS}>{message}</div>
      </TableCell>
    </TableRow>
  );
}
