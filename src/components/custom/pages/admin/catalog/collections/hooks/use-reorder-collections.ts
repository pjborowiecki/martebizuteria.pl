import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { collectionMutations } from "~/src/modules/collection/collection.mutations";

/**
 * Persists a new collection display order. The list keeps its own optimistic
 * order locally, so on settle we simply revalidate both the admin and the
 * storefront collection queries (the latter is ordered by rank too).
 */
export function useReorderCollections(): UseMutationResult<{ ok: boolean }, Error, readonly string[]> {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: readonly string[]) => collectionMutations.reorderCollectionsFn({ data: [...orderedIds] }),
    onError: () => {
      toast.error(t("collections.toast.reorderErrorTitle"), {
        description: t("collections.toast.reorderErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "collections"] }),
        queryClient.invalidateQueries({ queryKey: ["collections"] })
      ]);
    }
  });
}
