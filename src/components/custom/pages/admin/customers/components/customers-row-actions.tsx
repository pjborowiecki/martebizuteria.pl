import { type JSX, type MouseEvent, useCallback, useMemo, useState } from "react";

import { useNavigate } from "@tanstack/react-router";
import { Copy, Eye, MoreHorizontal, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import { ROLES } from "~/src/constants/_constants/permissions";

import { useSession } from "~/src/integrations/better-auth/auth._client";

import { Button } from "~/src/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "~/src/components/shadcn/dropdown-menu";

import { suppressDataGridRowClickAfterDialogDismiss } from "~/src/components/custom/datagrid/lib/data-grid-row-click";
import { CatalogDeleteConfirmDialog } from "~/src/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog";
import { useCatalogRowActionMenu } from "~/src/components/custom/pages/admin/catalog/dialog/lib/use-catalog-row-action-menu";
import { useDeleteCustomer } from "~/src/components/custom/pages/admin/customers/hooks/use-delete-customer";

import type { User } from "~/src/modules/user/user.types";

const ITEM_CLASS = "px-3 py-2.5 text-[13px] gap-3";

interface CustomersRowActionsProps {
  readonly customer: User["adminCustomerListItem"];
}

export function CustomersRowActions({ customer }: CustomersRowActionsProps): JSX.Element {
  const t = useTranslations("pages.admin.customers.rowActions");
  const navigate = useNavigate();
  const { data: session } = useSession();
  const deleteCustomer = useDeleteCustomer();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { closeMenuAndRequestDeleteConfirm, handleConfirmOpenChange, handleMenuOpenChange, menuOpen } = useCatalogRowActionMenu(
    confirmOpen,
    setConfirmOpen
  );

  const { email, id, name, role, stripeCustomerId } = customer;
  const canDelete = session?.user?.id !== id && role !== ROLES.ADMIN;

  const handleViewDetails = useCallback(() => {
    void navigate({ params: { id }, to: `/{-$locale}${CONSTANTS.ROUTES.ADMIN_CUSTOMER}` });
  }, [id, navigate]);

  const handleCopyId = useCallback(() => {
    void navigator.clipboard.writeText(id);
    toast.success(t("copyIdToast"));
  }, [id, t]);

  const handleCopyEmail = useCallback(() => {
    void navigator.clipboard.writeText(email);
    toast.success(t("copyEmailToast"));
  }, [email, t]);

  const handleCopyStripeCustomerId = useCallback(() => {
    const value = stripeCustomerId?.trim();
    if (value === undefined || value === "") {
      toast.error(t("copyStripeCustomerIdMissingToast"));
      return;
    }

    void navigator.clipboard.writeText(value);
    toast.success(t("copyStripeCustomerIdToast"));
  }, [stripeCustomerId, t]);

  const handleDelete = useCallback(() => {
    suppressDataGridRowClickAfterDialogDismiss();
    closeMenuAndRequestDeleteConfirm();
  }, [closeMenuAndRequestDeleteConfirm]);

  const handleConfirmDelete = useCallback(() => {
    deleteCustomer.mutate(id, {
      onSuccess: () => {
        handleConfirmOpenChange(false);
      }
    });
  }, [deleteCustomer, handleConfirmOpenChange, id]);

  const runMenuAction = useCallback(
    (action: () => void) => (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      suppressDataGridRowClickAfterDialogDismiss();
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
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleViewDetails)}>
            <Eye className="size-4" strokeWidth={1.5} />
            {t("viewDetails", { name })}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-1.5" />
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyId")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyEmail)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyEmail")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_CLASS} onClick={runMenuAction(handleCopyStripeCustomerId)}>
            <Copy className="size-4" strokeWidth={1.5} />
            {t("copyStripeCustomerId")}
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem className={ITEM_CLASS} variant="destructive" onClick={runMenuAction(handleDelete)}>
                <Trash2 className="size-4" strokeWidth={1.5} />
                {t("delete")}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canDelete && (
        <CatalogDeleteConfirmDialog
          cancelLabel={t("cancel")}
          confirmLabel={t("confirm")}
          description={t("deleteDescription", { email, name })}
          isPending={deleteCustomer.isPending}
          onConfirm={handleConfirmDelete}
          onOpenChange={handleConfirmOpenChange}
          open={confirmOpen}
          title={t("deleteTitle")}
        />
      )}
    </>
  );
}
