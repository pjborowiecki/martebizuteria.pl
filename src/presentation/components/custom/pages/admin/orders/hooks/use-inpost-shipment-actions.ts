import { type UseMutationOptions, type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { INPOST_ERROR_CODES, type InpostParcelTemplate } from "~/src/integrations/inpost/inpost.constants"
import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { ORDER_QUERY_KEYS } from "~/src/modules/order/order.constants"
import { createInpostShipmentMutation } from "~/src/modules/order/use-cases/create-inpost-shipment"
import { getInpostShipmentLabelMutation } from "~/src/modules/order/use-cases/get-inpost-shipment-label"
import { refreshInpostShipmentMutation } from "~/src/modules/order/use-cases/refresh-inpost-shipment"

const INPOST_FAILURE_KEYS: Readonly<Record<string, string>> = {
  [INPOST_ERROR_CODES.CREDENTIALS_REJECTED]: "credentialsRejected",
  [INPOST_ERROR_CODES.NOT_CONFIGURED]: "notConfigured",
  [INPOST_ERROR_CODES.UNAVAILABLE]: "unavailable",
}

const ORDER_FAILURE_KEYS: Readonly<Record<string, string>> = {
  [ERROR_CODES.CONFLICT]: "invalidState",
  [ERROR_CODES.NOT_FOUND]: "notFound",
}

const resolveInpostFailureKey = (error: Error, refusedKey: InpostRefusedKey): string => {
  if (error.message === INPOST_ERROR_CODES.REQUEST_REFUSED) {
    return refusedKey
  }

  return INPOST_FAILURE_KEYS[error.message] ?? ORDER_FAILURE_KEYS[errorCode(error)] ?? "failed"
}

const useInpostMutation = <TInput, TResult>(
  options: UseMutationOptions<TResult, Error, TInput>,
  { changesOrder, refusedKey }: InpostMutationBehaviour,
): UseMutationResult<TResult, Error, TInput> => {
  const t = useTranslations("pages.admin.orderDetail.inpost.toast")
  const queryClient = useQueryClient()

  return useMutation({
    ...options,
    onError: (error) => {
      toast.error(t("errorTitle"), { description: t(`errors.${resolveInpostFailureKey(error, refusedKey)}`) })
    },
    onSettled: () => {
      if (changesOrder) {
        void syncQueryInvalidation(queryClient, ORDER_QUERY_KEYS.ADMIN.ORDERS)
      }
    },
  })
}

const saveLabel = ({ content, fileName }: InpostLabel): void => {
  const link = document.createElement("a")
  link.href = `data:application/pdf;base64,${content}`
  link.setAttribute("download", fileName)
  link.rel = "noopener"
  link.click()
}

export const useCreateInpostShipment = (): UseMutationResult<InpostOrderResult, Error, CreateInpostShipmentInput> => {
  const t = useTranslations("pages.admin.orderDetail.inpost.toast")

  return useInpostMutation(
    {
      ...createInpostShipmentMutation,
      onSuccess: () => {
        toast.success(t("createdTitle"), { description: t("createdDescription") })
      },
    },
    { changesOrder: true, refusedKey: "shipmentRefused" },
  )
}

export const useRefreshInpostShipment = (): UseMutationResult<InpostOrderResult, Error, OrderIdInput> => {
  const t = useTranslations("pages.admin.orderDetail.inpost.toast")

  return useInpostMutation(
    {
      ...refreshInpostShipmentMutation,
      onSuccess: () => {
        toast.success(t("refreshedTitle"))
      },
    },
    { changesOrder: true, refusedKey: "shipmentMissing" },
  )
}

export const useDownloadInpostLabel = (): UseMutationResult<InpostLabel, Error, OrderIdInput> =>
  useInpostMutation({ ...getInpostShipmentLabelMutation, onSuccess: saveLabel }, { changesOrder: false, refusedKey: "labelNotReady" })

type InpostRefusedKey = "labelNotReady" | "shipmentMissing" | "shipmentRefused"

interface InpostMutationBehaviour {
  readonly changesOrder: boolean
  readonly refusedKey: InpostRefusedKey
}

interface OrderIdInput {
  readonly orderId: string
}

export interface CreateInpostShipmentInput extends OrderIdInput {
  readonly parcelTemplate: InpostParcelTemplate
  readonly weightKg?: number | undefined
}

interface InpostOrderResult {
  readonly ok: true
  readonly orderId: string
}

interface InpostLabel {
  readonly content: string
  readonly fileName: string
}
