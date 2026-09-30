import { type UseMutationOptions, type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { cancelOrderMutation } from "~/src/modules/order/use-cases/cancel-order"
import { fulfillOrderMutation } from "~/src/modules/order/use-cases/fulfill-order"
import { shipOrderMutation } from "~/src/modules/order/use-cases/ship-order"

const resolveOrderActionErrorMessage = (error: Error, t: ReturnType<typeof useTranslations<"pages.admin.orders.rowActions">>): string => {
  const code = errorCode(error)

  if (code === ERROR_CODES.NOT_FOUND) {
    return t("toast.notFoundDescription")
  }

  if (code === ERROR_CODES.CONFLICT) {
    return t("toast.invalidStateDescription")
  }

  return t("toast.errorDescription")
}

const useAdminOrderActionMutation = (
  options: AdminOrderActionOptions,
  successDescriptionKey: "toast.fulfillSuccessDescription" | "toast.shipSuccessDescription" | "toast.cancelSuccessDescription",
): UseMutationResult<OrderRowActionResult, Error, OrderIdInput> => {
  const t = useTranslations("pages.admin.orders.rowActions")
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
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

export const useFulfillOrder = (): UseMutationResult<OrderRowActionResult, Error, OrderIdInput> =>
  useAdminOrderActionMutation(fulfillOrderMutation, "toast.fulfillSuccessDescription")

export const useMarkOrderShipped = (): UseMutationResult<OrderRowActionResult, Error, OrderIdInput> =>
  useAdminOrderActionMutation(shipOrderMutation, "toast.shipSuccessDescription")

export const useCancelOrder = (): UseMutationResult<OrderRowActionResult, Error, OrderIdInput> =>
  useAdminOrderActionMutation(cancelOrderMutation, "toast.cancelSuccessDescription")

type AdminOrderActionOptions = UseMutationOptions<OrderRowActionResult, Error, OrderIdInput>

interface OrderIdInput {
  readonly orderId: string
}

interface OrderRowActionResult {
  readonly ok: true
  readonly orderId: string
}
