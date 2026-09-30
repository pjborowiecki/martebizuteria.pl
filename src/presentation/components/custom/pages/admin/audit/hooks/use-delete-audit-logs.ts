import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUDIT_LOG_QUERY_KEYS } from "~/src/modules/audit-log/audit-log.constants"
import { deleteAuditLogsMutation } from "~/src/modules/audit-log/use-cases/delete-audit-logs"

export const useDeleteAuditLogs = (): UseMutationResult<DeleteResult, Error, string[]> => {
  const t = useTranslations("pages.admin")
  const queryClient = useQueryClient()

  return useMutation({
    ...deleteAuditLogsMutation,
    onError: () => {
      toast.error(t("audit.bulk.deleteErrorTitle"), {
        description: t("audit.bulk.deleteErrorDescription"),
      })
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({
        queryKey: AUDIT_LOG_QUERY_KEYS.ADMIN.ALL,
      })
    },
    onSuccess: (result) => {
      toast.success(t("audit.bulk.deleteSuccessTitle"), {
        description: t("audit.bulk.deleteSuccessDescription", {
          count: String(result.deleted),
        }),
      })
    },
  })
}

interface DeleteResult {
  readonly deleted: number
  readonly ok: boolean
}
