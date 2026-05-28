import { type JSX, useMemo } from "react";

import { Copy, Edit2, Eye, Link2, MoreHorizontal, PackageOpen, Trash2 } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/src/components/shadcn/dropdown-menu";

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3";

interface CatalogRowActionsProps {
  readonly productId: string;
}

export function CatalogRowActions({ productId }: CatalogRowActionsProps): JSX.Element {
  const t = useTranslations("admin.catalog.rowActions");

  const trigger = useMemo(
    () => (
      <Button variant="ghost" size="icon" className="size-8 opacity-0 transition-opacity group-hover:opacity-100">
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    []
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={trigger} />
      <DropdownMenuContent align="end" className="min-w-52 p-1.5">
        <DropdownMenuItem className={ITEM_CLASS}>
          <Edit2 className="size-4" strokeWidth={1.5} />
          {t("edit")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS}>
          <Eye className="size-4" strokeWidth={1.5} />
          {t("viewStorefront")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS}>
          <Copy className="size-4" strokeWidth={1.5} />
          {t("copyId", { id: productId })}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem className={ITEM_CLASS}>
          <PackageOpen className="size-4" strokeWidth={1.5} />
          {t("manageVariants")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS}>
          <Link2 className="size-4" strokeWidth={1.5} />
          {t("copyLink")}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem className={ITEM_CLASS} variant="destructive">
          <Trash2 className="size-4" strokeWidth={1.5} />
          {t("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
