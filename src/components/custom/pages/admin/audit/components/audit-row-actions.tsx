import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react";

import { Loader2, MoreHorizontal, Trash2 } from "lucide-react";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "~/src/components/shadcn/dropdown-menu";

import { suppressNextDataGridRowClick } from "~/src/components/custom/datagrid/lib/data-grid-row-click";
import { useDeleteAuditLogs } from "~/src/components/custom/pages/admin/audit/hooks/use-delete-audit-logs";
import { useCatalogRowActionMenu } from "~/src/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu";

import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3";

interface AuditRowActionsProps {
  readonly entry: AuditLog["adminListItem"];
  readonly eventLabel: string;
}

export function AuditRowActions({ entry, eventLabel }: Readonly<AuditRowActionsProps>): JSX.Element {
  const t = useTranslations("pages.admin");
  const deleteAuditLogs = useDeleteAuditLogs();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen
  );

  const handleDelete = useCallback(() => {
    closeMenuAndRequestDeleteConfirm();
  }, [closeMenuAndRequestDeleteConfirm]);

  const handleConfirmDelete = useCallback(() => {
    deleteAuditLogs.mutate([entry.id], {
      onSuccess: () => {
        handleConfirmOpenChange(false);
      }
    });
  }, [deleteAuditLogs, entry.id, handleConfirmOpenChange]);

  const runMenuAction = useCallback(
    (action: () => void) => (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      suppressNextDataGridRowClick();
      action();
    },
    []
  );

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
      <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" className="min-w-52 p-1.5">
          <DropdownMenuItem className={ITEM_CLASS} variant="destructive" onClick={runMenuAction(handleDelete)}>
            <Trash2 className="size-4" strokeWidth={1.5} />
            {t("audit.rowActions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={handleConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("audit.rowActions.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("audit.rowActions.deleteDescription", { event: eventLabel })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAuditLogs.isPending}>{t("audit.rowActions.cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmDelete} disabled={deleteAuditLogs.isPending} className="gap-1.5">
              {deleteAuditLogs.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("audit.rowActions.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
