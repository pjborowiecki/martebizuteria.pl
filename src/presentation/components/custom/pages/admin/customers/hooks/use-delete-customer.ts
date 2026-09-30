import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { deleteCustomerMutation } from "~/src/modules/user/use-cases/delete-customer"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

const resolveDeleteCustomerErrorMessage = (
  error: Error,
  t: ReturnType<typeof useTranslations<"pages.admin.customers.rowActions">>,
): string => {
  const code = errorCode(error)

  if (code === ERROR_CODES.CONFLICT) {
    return t("toast.cannotDeleteSelfDescription")
  }

  if (code === ERROR_CODES.FORBIDDEN) {
    return t("toast.cannotDeleteAdminDescription")
  }

  if (code === ERROR_CODES.NOT_FOUND) {
    return t("toast.deleteNotFoundDescription")
  }

  return t("toast.deleteErrorDescription")
}

export const useDeleteCustomer = (): UseMutationResult<DeleteCustomerResult, Error, DeleteCustomerInput> => {
  const t = useTranslations("pages.admin.customers.rowActions")
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteCustomerMutation,
    onError: (error) => {
      toast.error(t("toast.deleteErrorTitle"), {
        description: resolveDeleteCustomerErrorMessage(error, t),
      })
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, USER_QUERY_KEYS.ADMIN.CUSTOMERS)
    },
    onSuccess: () => {
      toast.success(t("toast.deleteSuccessTitle"), {
        description: t("toast.deleteSuccessDescription"),
      })
    },
  })
}

interface DeleteCustomerInput {
  readonly userId: string
}

interface DeleteCustomerResult {
  readonly ok: true
  readonly userId: string
}
