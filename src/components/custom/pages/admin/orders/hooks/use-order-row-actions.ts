import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { syncQueryInvalidation } from "~/src/lib/_utils/query-client-sync";

import { orderAdminMutationFns } from "~/src/modules/order/order.admin.mutations";
import { ORDER_ERROR_CODES } from "~/src/modules/order/order.constants";

interface OrderRowActionResult {
  readonly ok: true;
  readonly orderId: string;
}

function resolveOrderActionErrorMessage(error: Error, t: ReturnType<typeof useTranslations<"pages.admin.orders.rowActions">>): string {
  if (error.message.includes(ORDER_ERROR_CODES.NOT_FOUND)) {
    return t("toast.notFoundDescription");
  }

  if (error.message.includes(ORDER_ERROR_CODES.INVALID_STATE)) {
    return t("toast.invalidStateDescription");
  }

  return t("toast.errorDescription");
}

function useAdminOrderActionMutation(
  mutationKey: string,
  mutationFn: (orderId: string) => Promise<OrderRowActionResult>,
  successDescriptionKey: "toast.fulfillSuccessDescription" | "toast.shipSuccessDescription" | "toast.cancelSuccessDescription"
): UseMutationResult<OrderRowActionResult, Error, string> {
  const t = useTranslations("pages.admin.orders.rowActions");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    mutationKey: [mutationKey],
    onError: (error) => {
      toast.error(t("toast.errorTitle"), {
        description: resolveOrderActionErrorMessage(error, t)
      });
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, CONSTANTS.QUERY_KEYS.ORDER.ADMIN.ORDERS);
    },
    onSuccess: () => {
      toast.success(t("toast.successTitle"), {
        description: t(successDescriptionKey)
      });
    }
  });
}

export function useFulfillOrder(): UseMutationResult<OrderRowActionResult, Error, string> {
  return useAdminOrderActionMutation(
    "fulfill-admin-order",
    (orderId) => orderAdminMutationFns.fulfillAdminOrderFn({ data: { orderId } }),
    "toast.fulfillSuccessDescription"
  );
}

export function useMarkOrderShipped(): UseMutationResult<OrderRowActionResult, Error, string> {
  return useAdminOrderActionMutation(
    "mark-admin-order-shipped",
    (orderId) => orderAdminMutationFns.markAdminOrderShippedFn({ data: { orderId } }),
    "toast.shipSuccessDescription"
  );
}

export function useCancelOrder(): UseMutationResult<OrderRowActionResult, Error, string> {
  return useAdminOrderActionMutation(
    "cancel-admin-order",
    (orderId) => orderAdminMutationFns.cancelAdminOrderFn({ data: { orderId } }),
    "toast.cancelSuccessDescription"
  );
}
