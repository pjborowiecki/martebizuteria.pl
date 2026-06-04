import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { COLLECTION_ERROR_CODES } from "~/src/modules/collection/collection.constants";
import { collectionMutations } from "~/src/modules/collection/collection.mutations";

interface DeleteResult {
  readonly deleted: number;
  readonly ok: boolean;
}

/** Batch-deletes the given collections, then revalidates the admin and storefront lists. */
export function useDeleteCollections(): UseMutationResult<DeleteResult, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.collections");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => collectionMutations.deleteCollectionsFn({ data: [...ids] }),
    onError: (error) => {
      const code = error instanceof Error ? error.message : "";

      if (code.includes(COLLECTION_ERROR_CODES.HAS_PRODUCTS)) {
        toast.error(t("toast.deleteErrorTitle"), {
          description: t("toast.deleteHasProductsDescription")
        });
        return;
      }

      toast.error(t("toast.deleteErrorTitle"), {
        description: t("toast.deleteErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ALL })
      ]);
    },
    onSuccess: (result) => {
      toast.success(t("toast.deleteSuccessTitle"), {
        description: t("toast.deleteSuccessDescription", {
          count: String(result.deleted)
        })
      });
    }
  });
}
