import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { collectionMutations } from "~/src/modules/collection/collection.mutations";

/**
 * Persists a new collection display order. The list keeps its own optimistic
 * order locally, so on settle we simply revalidate both the admin and the
 * storefront collection queries (the latter is ordered by rank too).
 */
export function useReorderCollections(): UseMutationResult<{ ok: boolean }, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.collections");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: readonly string[]) => collectionMutations.reorderCollectionsFn({ data: [...orderedIds] }),
    onError: () => {
      toast.error(t("toast.reorderErrorTitle"), {
        description: t("toast.reorderErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.COLLECTION.ALL })
      ]);
    }
  });
}
