import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { collectionMutations } from "~/src/modules/collection/collection.mutations";

interface DeleteResult {
  readonly deleted: number;
  readonly ok: boolean;
}

/** Batch-deletes the given collections, then revalidates the admin and storefront lists. */
export function useDeleteCollections(): UseMutationResult<DeleteResult, Error, readonly string[]> {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => collectionMutations.deleteCollectionsFn({ data: [...ids] }),
    onError: () => {
      toast.error(t("collections.toast.deleteErrorTitle"), {
        description: t("collections.toast.deleteErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "collections"] }),
        queryClient.invalidateQueries({ queryKey: ["collections"] })
      ]);
    },
    onSuccess: (result) => {
      toast.success(t("collections.toast.deleteSuccessTitle"), {
        description: t("collections.toast.deleteSuccessDescription", {
          count: String(result.deleted)
        })
      });
    }
  });
}
