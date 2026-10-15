import { type UseMutationOptions, type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { ADMIN_DASHBOARD_QUERY_KEYS } from "~/src/modules/admin-dashboard/admin-dashboard.constants"
import { ORDER_ERROR_CODES, ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { cancelOrderMutation } from "~/src/modules/order/use-cases/cancel-order"
import { fulfillOrderMutation } from "~/src/modules/order/use-cases/fulfill-order"
import { markOrderDeliveredMutation } from "~/src/modules/order/use-cases/mark-order-delivered"
import { refundAdminOrderMutation } from "~/src/modules/order/use-cases/refund-admin-order"
import { resendOrderEmailMutation } from "~/src/modules/order/use-cases/resend-order-email"
import { restockOrderMutation } from "~/src/modules/order/use-cases/restock-order"
import { shipOrderMutation } from "~/src/modules/order/use-cases/ship-order"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

const resolveOrderActionErrorMessage = (error: Error, t: ReturnType<typeof useTranslations<"pages.admin.orders.rowActions">>): string => {
  const code = errorCode(error)

  if (code === ERROR_CODES.NOT_FOUND) {
    return t("toast.notFoundDescription")
  }

  if (error.message === ORDER_ERROR_CODES.OPEN_DISPUTE) {
    return t("toast.openDisputeDescription")
  }

  if (code === ERROR_CODES.CONFLICT) {
    return t("toast.invalidStateDescription")
  }

  return t("toast.errorDescription")
}

const useAdminOrderActionMutation = <TInput extends OrderIdInput, TResult extends OrderActionResult>(
  options: UseMutationOptions<TResult, Error, TInput>,
  successDescriptionKey: OrderActionSuccessKey,
): UseMutationResult<TResult, Error, TInput> => {
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
      void syncQueryInvalidation(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS)
      void syncQueryInvalidation(queryClient, ADMIN_DASHBOARD_QUERY_KEYS.ALL)
    },
    onSuccess: (...successArguments) => {
      toast.success(t("toast.successTitle"), {
        description: t(successDescriptionKey),
      })

      return options.onSuccess?.(...successArguments)
    },
  })
}

export const useFulfillOrder = (): UseMutationResult<OrderActionResult, Error, OrderIdInput> =>
  useAdminOrderActionMutation(fulfillOrderMutation, "toast.fulfillSuccessDescription")

export const useMarkOrderShipped = (): UseMutationResult<ShipOrderResult, Error, ShipOrderInput> => {
  const t = useTranslations("pages.admin.orders.rowActions")

  return useAdminOrderActionMutation(
    {
      ...shipOrderMutation,
      onSuccess: ({ shippedEmailSent }) => {
        if (!shippedEmailSent) {
          toast.warning(t("toast.shipEmailFailedTitle"), {
            description: t("toast.shipEmailFailedDescription"),
          })
        }
      },
    },
    "toast.shipSuccessDescription",
  )
}

export const useMarkOrderDelivered = (): UseMutationResult<OrderActionResult, Error, OrderIdInput> =>
  useAdminOrderActionMutation(markOrderDeliveredMutation, "toast.markDeliveredSuccessDescription")

export const useCancelOrder = (): UseMutationResult<CancelOrderResult, Error, OrderIdInput> => {
  const t = useTranslations("pages.admin.orders.rowActions")

  return useAdminOrderActionMutation(
    {
      ...cancelOrderMutation,
      onSuccess: ({ cancelledEmailSent }) => {
        if (!cancelledEmailSent) {
          toast.warning(t("toast.cancelEmailFailedTitle"), {
            description: t("toast.cancelEmailFailedDescription"),
          })
        }
      },
    },
    "toast.cancelSuccessDescription",
  )
}

export const useRefundOrder = (): UseMutationResult<OrderActionResult, Error, RefundOrderInput> =>
  useAdminOrderActionMutation(refundAdminOrderMutation, "toast.refundSuccessDescription")

export const useRestockOrder = (): UseMutationResult<OrderActionResult, Error, OrderIdInput> =>
  useAdminOrderActionMutation(restockOrderMutation, "toast.restockSuccessDescription")

export const useResendOrderEmail = (): UseMutationResult<ResendOrderEmailResult, Error, ResendOrderEmailInput> => {
  const t = useTranslations("pages.admin.orders.rowActions")
  const queryClient = useQueryClient()

  return useMutation({
    ...resendOrderEmailMutation,
    onError: (error) => {
      toast.error(t("toast.errorTitle"), {
        description: resolveOrderActionErrorMessage(error, t),
      })
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, ORDER_QUERY_KEYS.ADMIN.ORDERS)
    },
    onSuccess: ({ emailSent }) => {
      if (emailSent) {
        toast.success(t("toast.resendEmailSentTitle"), { description: t("toast.resendEmailSentDescription") })

        return
      }

      toast.warning(t("toast.resendEmailFailedTitle"), { description: t("toast.resendEmailFailedDescription") })
    },
  })
}

type OrderActionSuccessKey =
  | "toast.cancelSuccessDescription"
  | "toast.fulfillSuccessDescription"
  | "toast.markDeliveredSuccessDescription"
  | "toast.refundSuccessDescription"
  | "toast.restockSuccessDescription"
  | "toast.shipSuccessDescription"

interface OrderIdInput {
  readonly orderId: string
}

interface RefundOrderInput extends OrderIdInput {
  readonly restock: boolean
}

interface ResendOrderEmailInput extends OrderIdInput {
  readonly eventId: string
}

interface ShipOrderInput extends OrderIdInput {
  readonly trackingNumber?: string | undefined
  readonly trackingUrl?: string | undefined
}

interface OrderActionResult {
  readonly ok: true
  readonly orderId: string
}

interface ShipOrderResult extends OrderActionResult {
  readonly shippedEmailSent: boolean
}

interface CancelOrderResult extends OrderActionResult {
  readonly cancelledEmailSent: boolean
}

interface ResendOrderEmailResult extends OrderActionResult {
  readonly emailSent: boolean
}
