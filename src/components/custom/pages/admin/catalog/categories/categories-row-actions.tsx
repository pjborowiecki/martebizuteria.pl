"";

import { type JSX, useMemo } from "react";

import { Copy, Edit2, Link2, MoreHorizontal, PackageSearch, Trash2 } from "lucide-react";
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

interface CategoriesRowActionsProps {
  readonly categoryId: number;
}

export function CategoriesRowActions({ categoryId }: CategoriesRowActionsProps): JSX.Element {
  const t = useTranslations("admin.categories.rowActions");

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
          <PackageSearch className="size-4" strokeWidth={1.5} />
          {t("viewProducts")}
        </DropdownMenuItem>
        <DropdownMenuItem className={ITEM_CLASS}>
          <Copy className="size-4" strokeWidth={1.5} />
          {t("copyId", { id: categoryId })}
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1.5" />
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
