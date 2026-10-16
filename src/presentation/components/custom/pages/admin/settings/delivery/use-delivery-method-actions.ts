import { useCallback } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { DELIVERY_METHOD_ERROR, DELIVERY_METHOD_QUERY_KEYS } from "~/src/modules/delivery-method/delivery-method.constants"
import { archiveDeliveryMethodMutation } from "~/src/modules/delivery-method/use-cases/archive-delivery-method"
import { createDeliveryMethodMutation } from "~/src/modules/delivery-method/use-cases/create-delivery-method"
import { reorderDeliveryMethodsMutation } from "~/src/modules/delivery-method/use-cases/reorder-delivery-methods"
import { updateDeliveryMethodMutation } from "~/src/modules/delivery-method/use-cases/update-delivery-method"

import { useActionError } from "~/src/hooks/use-action-error"

const DELIVERY_METHOD_ERRORS: ReadonlySet<string> = new Set(Object.values(DELIVERY_METHOD_ERROR))

export const useDeliveryMethodActions = () => {
  const t = useTranslations("pages.admin.settings.delivery")
  const queryClient = useQueryClient()
  const actionError = useActionError()

  const refresh = useCallback(
    () =>
      Promise.all([
        syncQueryInvalidation(queryClient, DELIVERY_METHOD_QUERY_KEYS.ADMIN.ALL),
        syncQueryInvalidation(queryClient, DELIVERY_METHOD_QUERY_KEYS.ALL),
      ]),
    [queryClient],
  )

  const reportError = useCallback(
    (error: Error) => {
      if (DELIVERY_METHOD_ERRORS.has(error.message)) {
        toast.error(t(`errors.${error.message}`))

        return
      }

      toast.error(errorCode(error) === ERROR_CODES.CONFLICT ? t("errors.conflict") : actionError(error))
    },
    [actionError, t],
  )

  const create = useMutation({ ...createDeliveryMethodMutation, onError: reportError, onSuccess: refresh })
  const update = useMutation({ ...updateDeliveryMethodMutation, onError: reportError, onSuccess: refresh })
  const archive = useMutation({ ...archiveDeliveryMethodMutation, onError: reportError, onSuccess: refresh })
  const reorder = useMutation({
    ...reorderDeliveryMethodsMutation,
    onError: reportError,
    onSuccess: async () => {
      await refresh()
      toast.success(t("methods.reordered"))
    },
  })

  return { archive, create, reorder, update }
}
