import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { auditLogMutations } from "~/src/modules/audit-log/audit-log.mutations";

interface DeleteResult {
  readonly deleted: number;
  readonly ok: boolean;
}

/** Batch-deletes audit log rows, then revalidates list and stats queries. */
export function useDeleteAuditLogs(): UseMutationResult<DeleteResult, Error, readonly string[]> {
  const t = useTranslations("pages.admin");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => auditLogMutations.deleteAuditLogsFn({ data: [...ids] }),
    onError: () => {
      toast.error(t("audit.bulk.deleteErrorTitle"), {
        description: t("audit.bulk.deleteErrorDescription")
      });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.AUDIT_LOG.ADMIN.ALL });
    },
    onSuccess: (result) => {
      toast.success(t("audit.bulk.deleteSuccessTitle"), {
        description: t("audit.bulk.deleteSuccessDescription", {
          count: String(result.deleted)
        })
      });
    }
  });
}
