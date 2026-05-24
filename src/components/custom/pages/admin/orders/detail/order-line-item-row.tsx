import type { JSX } from "react";

import { Package } from "lucide-react";

import { TableCell, TableRow } from "~/src/components/shadcn/table";

import type { LineItem } from "~/src/data/order-detail-data";

interface OrderLineItemRowProps {
  readonly item: LineItem;
}

export function OrderLineItemRow({ item }: OrderLineItemRowProps): JSX.Element {
  return (
    <TableRow className="group">
      <TableCell className="pl-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md bg-secondary">
            <Package className="size-4 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium">{item.name}</p>
            <p className="text-[12px] text-muted-foreground">{item.variant}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{item.sku}</TableCell>
      <TableCell className="text-center font-mono text-sm">{item.qty}</TableCell>
      <TableCell className="text-right font-mono text-sm">{item.price}</TableCell>
      <TableCell className="pr-5 text-right font-mono text-sm font-medium">{item.total}</TableCell>
    </TableRow>
  );
}
