import { type JSX, type MouseEvent, type ReactNode, useCallback } from "react";

import { Loader2 } from "lucide-react";

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

import { suppressDataGridRowClickAfterDialogDismiss } from "~/src/components/custom/datagrid/lib/data-grid-row-click";

interface CatalogDeleteConfirmDialogProps {
  readonly cancelLabel: string;
  readonly confirmLabel: string;
  readonly description: ReactNode;
  readonly isPending: boolean;
  readonly onConfirm: () => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly title: string;
}

export function CatalogDeleteConfirmDialog({
  cancelLabel,
  confirmLabel,
  description,
  isPending,
  onConfirm,
  onOpenChange,
  open,
  title
}: Readonly<CatalogDeleteConfirmDialogProps>): JSX.Element {
  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (isPending) {
        return;
      }

      if (!nextOpen) {
        suppressDataGridRowClickAfterDialogDismiss();
      }

      onOpenChange(nextOpen);
    },
    [isPending, onOpenChange]
  );

  const handleDismissInteraction = useCallback((event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    suppressDataGridRowClickAfterDialogDismiss();
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm();
  }, [onConfirm]);

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending} onClick={handleDismissInteraction} onPointerDown={handleDismissInteraction}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" type="button" onClick={handleConfirm} disabled={isPending} className="gap-1.5">
            {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
