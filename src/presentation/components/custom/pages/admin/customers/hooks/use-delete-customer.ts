import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl"

import { deleteCustomerFn } from "~/src/modules/user/use-cases/delete-customer"
import { USER_ERROR_CODES, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

import { syncQueryInvalidation } from "~/src/lib/query-client-sync"
const resolveDeleteCustomerErrorMessage = (
  error: Error,
  t: ReturnType<typeof useTranslations<"pages.admin.customers.rowActions">>,
): string => {
  if (error.message.includes(USER_ERROR_CODES.CANNOT_DELETE_SELF)) {
    return t("toast.cannotDeleteSelfDescription")
  }
  if (error.message.includes(USER_ERROR_CODES.CANNOT_DELETE_ADMIN)) {
    return t("toast.cannotDeleteAdminDescription")
  }
  if (error.message.includes(USER_ERROR_CODES.NOT_FOUND)) {
    return t("toast.deleteNotFoundDescription")
  }
  return t("toast.deleteErrorDescription")
}

export const useDeleteCustomer = (): UseMutationResult<DeleteCustomerResult, Error, string> => {
  const t = useTranslations("pages.admin.customers.rowActions")
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      deleteCustomerFn({
        data: {
          userId,
        },
      }),
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
interface DeleteCustomerResult {
  readonly ok: true
  readonly userId: string
}
