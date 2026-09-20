import { type JSX } from "react"

import { cn } from "cn"

import { TableCell, TableRow } from "~/src/presentation/components/shadcn/table"

import {
  DATA_GRID_EMPTY_MESSAGE_ROW_INDEX,
  DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT,
  DATA_GRID_PLACEHOLDER_BODY_CELL_CLASS,
  DATA_GRID_PLACEHOLDER_BODY_ROW_CLASS,
  DATA_GRID_PLACEHOLDER_CELL_INNER_CLASS,
} from "~/src/presentation/components/custom/datagrid/components/data-grid-row"

interface DataGridEmptyRowProps {
  readonly colSpan: number
  readonly message: string
}

/** Same row count and cell min-heights as the loading skeleton so tbody height does not shift. */
export const DataGridEmptyRow = ({ colSpan, message }: DataGridEmptyRowProps): JSX.Element => (
  <>
    {Array.from({ length: DATA_GRID_EMPTY_PLACEHOLDER_ROW_COUNT }, (_, rowIndex) => (
      <TableRow key={rowIndex} className={DATA_GRID_PLACEHOLDER_BODY_ROW_CLASS}>
        <TableCell colSpan={colSpan} className={DATA_GRID_PLACEHOLDER_BODY_CELL_CLASS}>
          {rowIndex === DATA_GRID_EMPTY_MESSAGE_ROW_INDEX ? (
            <div
              className={cn(
                DATA_GRID_PLACEHOLDER_CELL_INNER_CLASS,
                "flex items-center justify-center text-center text-sm text-muted-foreground",
              )}
            >
              {message}
            </div>
          ) : (
            <span className={cn(DATA_GRID_PLACEHOLDER_CELL_INNER_CLASS, "invisible")} aria-hidden="true">
              {"\u00A0"}
            </span>
          )}
        </TableCell>
      </TableRow>
    ))}
  </>
)
