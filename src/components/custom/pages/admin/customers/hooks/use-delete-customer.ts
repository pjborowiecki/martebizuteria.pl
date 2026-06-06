import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { syncQueryInvalidation } from "~/src/lib/_utils/query-client-sync";

import { USER_ERROR_CODES } from "~/src/modules/user/user.constants";
import { userMutations } from "~/src/modules/user/user.mutations";

interface DeleteCustomerResult {
  readonly ok: true;
  readonly userId: string;
}

function resolveDeleteCustomerErrorMessage(
  error: Error,
  t: ReturnType<typeof useTranslations<"pages.admin.customers.rowActions">>
): string {
  if (error.message.includes(USER_ERROR_CODES.CANNOT_DELETE_SELF)) {
    return t("toast.cannotDeleteSelfDescription");
  }

  if (error.message.includes(USER_ERROR_CODES.CANNOT_DELETE_ADMIN)) {
    return t("toast.cannotDeleteAdminDescription");
  }

  if (error.message.includes(USER_ERROR_CODES.NOT_FOUND)) {
    return t("toast.deleteNotFoundDescription");
  }

  return t("toast.deleteErrorDescription");
}

/** Deletes a customer via Better Auth admin API, sends goodbye email, then revalidates the list. */
export function useDeleteCustomer(): UseMutationResult<DeleteCustomerResult, Error, string> {
  const t = useTranslations("pages.admin.customers.rowActions");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userMutations.deleteCustomerFn({ data: { userId } }),
    onError: (error) => {
      toast.error(t("toast.deleteErrorTitle"), {
        description: resolveDeleteCustomerErrorMessage(error, t)
      });
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, CONSTANTS.QUERY_KEYS.USER.ADMIN.CUSTOMERS);
    },
    onSuccess: () => {
      toast.success(t("toast.deleteSuccessTitle"), {
        description: t("toast.deleteSuccessDescription")
      });
    }
  });
}
