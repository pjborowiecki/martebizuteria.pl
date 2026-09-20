import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { ORDER_ERROR_CODES, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { cancelAdminOrderFn } from "~/src/modules/order/use-cases/cancel-order"
import { fulfillAdminOrderFn } from "~/src/modules/order/use-cases/fulfill-order"
import { markAdminOrderShippedFn } from "~/src/modules/order/use-cases/ship-order"

import { syncQueryInvalidation } from "~/src/lib/query-client-sync"
const resolveOrderActionErrorMessage = (error: Error, t: ReturnType<typeof useTranslations<"pages.admin.orders.rowActions">>): string => {
  if (error.message.includes(ORDER_ERROR_CODES.NOT_FOUND)) {
    return t("toast.notFoundDescription")
  }
  if (error.message.includes(ORDER_ERROR_CODES.INVALID_STATE)) {
    return t("toast.invalidStateDescription")
  }
  return t("toast.errorDescription")
}
const useAdminOrderActionMutation = (
  mutationKey: string,
  mutationFn: (orderId: string) => Promise<OrderRowActionResult>,
  successDescriptionKey: "toast.fulfillSuccessDescription" | "toast.shipSuccessDescription" | "toast.cancelSuccessDescription",
): UseMutationResult<OrderRowActionResult, Error, string> => {
  const t = useTranslations("pages.admin.orders.rowActions")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    mutationKey: [mutationKey],
    onError: (error) => {
      toast.error(t("toast.errorTitle"), {
        description: resolveOrderActionErrorMessage(error, t),
      })
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, ORDER_QUERY_KEYS.ADMIN.ORDERS)
    },
    onSuccess: () => {
      toast.success(t("toast.successTitle"), {
        description: t(successDescriptionKey),
      })
    },
  })
}
export const useFulfillOrder = (): UseMutationResult<OrderRowActionResult, Error, string> =>
  useAdminOrderActionMutation(
    "fulfill-admin-order",
    (orderId) =>
      fulfillAdminOrderFn({
        data: {
          orderId,
        },
      }),
    "toast.fulfillSuccessDescription",
  )

export const useMarkOrderShipped = (): UseMutationResult<OrderRowActionResult, Error, string> =>
  useAdminOrderActionMutation(
    "mark-admin-order-shipped",
    (orderId) =>
      markAdminOrderShippedFn({
        data: {
          orderId,
        },
      }),
    "toast.shipSuccessDescription",
  )

export const useCancelOrder = (): UseMutationResult<OrderRowActionResult, Error, string> =>
  useAdminOrderActionMutation(
    "cancel-admin-order",
    (orderId) =>
      cancelAdminOrderFn({
        data: {
          orderId,
        },
      }),
    "toast.cancelSuccessDescription",
  )

interface OrderRowActionResult {
  readonly ok: true
  readonly orderId: string
}
