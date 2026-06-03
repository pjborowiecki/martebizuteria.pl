import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { CATEGORY_ERROR_CODES } from "~/src/modules/category/category.constants";
import { categoryMutations } from "~/src/modules/category/category.mutations";

interface DeleteResult {
  readonly deleted: number;
  readonly ok: boolean;
}

/** Batch-deletes the given categories, then revalidates the admin and storefront lists. */
export function useDeleteCategories(): UseMutationResult<DeleteResult, Error, readonly string[]> {
  const t = useTranslations("admin");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => categoryMutations.deleteCategoriesFn({ data: [...ids] }),
    onError: (error) => {
      const code = error instanceof Error ? error.message : "";

      if (code.includes(CATEGORY_ERROR_CODES.HAS_CHILDREN)) {
        toast.error(t("categories.toast.deleteErrorTitle"), {
          description: t("categories.toast.deleteHasChildrenDescription")
        });
        return;
      }

      if (code.includes(CATEGORY_ERROR_CODES.HAS_PRODUCTS)) {
        toast.error(t("categories.toast.deleteErrorTitle"), {
          description: t("categories.toast.deleteHasProductsDescription")
        });
        return;
      }

      toast.error(t("categories.toast.deleteErrorTitle"), {
        description: t("categories.toast.deleteErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ALL })
      ]);
    },
    onSuccess: (result) => {
      toast.success(t("categories.toast.deleteSuccessTitle"), {
        description: t("categories.toast.deleteSuccessDescription", {
          count: String(result.deleted)
        })
      });
    }
  });
}
