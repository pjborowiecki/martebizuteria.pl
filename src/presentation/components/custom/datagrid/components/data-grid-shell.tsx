import { type JSX, type ReactNode } from "react"

import { cn } from "cn"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

import { ADMIN_CARD_CLASS } from "~/src/presentation/components/custom/pages/admin/admin-layout.styles"

/** Scrollport for the table body when the grid exceeds the viewport. */
export const DATA_GRID_BODY_SCROLL_CLASS = "min-h-0 overflow-auto"

/** Card chrome that frames a datagrid (toolbar + table + pagination). */
export const DataGridShell = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <Card
    className={cn(
      "grid max-h-full min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden py-0",
      ADMIN_CARD_CLASS,
    )}
  >
    <CardContent className="contents">{children}</CardContent>
  </Card>
)
