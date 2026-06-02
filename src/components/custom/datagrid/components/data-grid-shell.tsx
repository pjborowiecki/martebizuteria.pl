import type { JSX, ReactNode } from "react";

import { cn } from "~/src/lib/utils";

import { Card, CardContent } from "~/src/components/shadcn/card";

import { ADMIN_CARD_CLASS } from "~/src/components/custom/pages/admin/admin-layout.styles";

/** Card chrome that frames a datagrid (toolbar + table + pagination). */
export function DataGridShell({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  return (
    <Card className={cn("min-w-0 overflow-hidden py-0", ADMIN_CARD_CLASS)}>
      <CardContent className="p-0">{children}</CardContent>
    </Card>
  );
}
