import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { categoryMutations } from "~/src/modules/product-category/product-category.mutations";

/**
 * Persists a new category display order. The list keeps its own optimistic
 * order locally, so on settle we simply revalidate both the admin and the
 * storefront category queries (the latter is ordered by rank too).
 */
export function useReorderCategories(): UseMutationResult<{ ok: boolean }, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.categories");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: readonly string[]) => categoryMutations.reorderCategoriesFn({ data: [...orderedIds] }),
    onError: () => {
      toast.error(t("toast.reorderErrorTitle"), {
        description: t("toast.reorderErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ALL })
      ]);
    }
  });
}
