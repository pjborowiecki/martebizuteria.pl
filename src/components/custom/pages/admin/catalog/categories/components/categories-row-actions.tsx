import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react";

import { useParams, useRouter } from "@tanstack/react-router";
import { Copy, Edit2, Link2, Loader2, MoreHorizontal, PackageSearch, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "~/src/components/shadcn/alert-dialog";
import { Button } from "~/src/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/src/components/shadcn/dropdown-menu";

import { suppressNextDataGridRowClick } from "~/src/components/custom/datagrid/lib/data-grid-row-click";
import { useCategoriesSheet } from "~/src/components/custom/pages/admin/catalog/categories/hooks/use-categories-sheet";
import { useDeleteCategories } from "~/src/components/custom/pages/admin/catalog/categories/hooks/use-delete-categories";

import type { Category } from "~/src/modules/category/category.types";

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3";

interface CategoriesRowActionsProps {
  readonly category: Category["adminListItem"];
}

export function CategoriesRowActions({ category }: CategoriesRowActionsProps): JSX.Element {
  const t = useTranslations("pages.admin.catalog.categories.rowActions");
  const router = useRouter();
  const { locale } = useParams({ strict: false });
  const { openEdit } = useCategoriesSheet();
  const deleteCategories = useDeleteCategories();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { handle, id, title } = category;

  const storefrontHref = useMemo(
    () => router.buildLocation({ params: { handle, locale }, to: "/{-$locale}/categories/$handle" }).href,
    [router, handle, locale]
  );

  const handleEdit = useCallback(() => {
    openEdit(category);
  }, [category, openEdit]);

  const handleViewProducts = useCallback(() => {
    globalThis.open(storefrontHref, "_blank", "noopener,noreferrer");
  }, [storefrontHref]);

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(id);
    toast.success(t("copyIdToast"));
  }, [id, t]);

  const handleCopyLink = useCallback(() => {
    void navigator.clipboard.writeText(`${globalThis.location.origin}${storefrontHref}`);
    toast.success(t("copyLinkToast"));
  }, [storefrontHref, t]);

  const handleDelete = useCallback(() => {
    setConfirmOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    deleteCategories.mutate([id], {
      onSuccess: () => {
        setConfirmOpen(false);
      }
    });
  }, [deleteCategories, id]);

  const runMenuAction = useCallback(
    (action: () => void) => (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      suppressNextDataGridRowClick();
      action();
    },
    []
  );

  const handleMenuOpenChange = useCallback((open: boolean) => {
    if (!open) {
      suppressNextDataGridRowClick();
    }
  }, []);

  const stopRowClick = useCallback((event: MouseEvent) => {
    event.stopPropagation();
  }, []);

  const trigger = useMemo(
    () => (
      <Button variant="ghost" size="icon" className="size-8" onClick={stopRowClick} onPointerDown={stopRowClick}>
        <MoreHorizontal className="size-4" strokeWidth={1.5} />
      </Button>
    ),
    [stopRowClick]
  );

  return (
    <>
      <DropdownMenu onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleEdit)}>
            <Edit2 className="size-4" strokeWidth={1.5} />
            {t("edit")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleViewProducts)}>
            <PackageSearch className="size-4" strokeWidth={1.5} />
            {t("viewProducts")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyId")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyLink)}>
            <Link2 className="size-4" strokeWidth={1.5} />
            {t("copyLink")}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} variant="destructive" onClick={runMenuAction(handleDelete)}>
            <Trash2 className="size-4" strokeWidth={1.5} />
            {t("delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDescription", { title })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCategories.isPending}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteCategories.isPending}
              className="gap-1.5"
            >
              {deleteCategories.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
