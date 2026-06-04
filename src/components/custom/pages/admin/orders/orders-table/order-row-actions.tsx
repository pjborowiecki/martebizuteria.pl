import type { JSX } from "react";

import { Copy, Eye, Package, Printer, RefreshCw, Trash2, Truck } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/src/components/shadcn/dropdown-menu";

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3";

interface OrderRowActionsProps {
  readonly children: JSX.Element;
  readonly orderId: string;
}

export function OrderRowActions({ children, orderId }: OrderRowActionsProps): JSX.Element {
  const t = useTranslations("pages.admin");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={children} />
      <DropdownMenuContent align="end" className="min-w-52 p-1.5">
        <DropdownMenuItem className={ITEM_CLASS}>
          <Eye className="size-4" strokeWidth={1.5} />
          {t("orders.rowActions.viewOrder")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS}>
          <Copy className="size-4" strokeWidth={1.5} />
          {t("orders.rowActions.copyId", { id: orderId })}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem className={ITEM_CLASS}>
          <Package className="size-4" strokeWidth={1.5} />
          {t("orders.rowActions.fulfill")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS}>
          <Truck className="size-4" strokeWidth={1.5} />
          {t("orders.rowActions.markShipped")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS}>
          <Printer className="size-4" strokeWidth={1.5} />
          {t("orders.rowActions.printInvoice")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem className={ITEM_CLASS}>
          <RefreshCw className="size-4" strokeWidth={1.5} />
          {t("orders.rowActions.refund")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS} variant="destructive">
          <Trash2 className="size-4" strokeWidth={1.5} />
          {t("orders.rowActions.cancel")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
