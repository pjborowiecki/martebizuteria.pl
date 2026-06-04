import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { CATEGORY_ERROR_CODES } from "~/src/modules/product-category/product-category.constants";
import { categoryMutations } from "~/src/modules/product-category/product-category.mutations";

interface DeleteResult {
  readonly deleted: number;
  readonly ok: boolean;
}

/** Batch-deletes the given categories, then revalidates the admin and storefront lists. */
export function useDeleteCategories(): UseMutationResult<DeleteResult, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.categories");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => categoryMutations.deleteCategoriesFn({ data: [...ids] }),
    onError: (error) => {
      const code = error instanceof Error ? error.message : "";

      if (code.includes(CATEGORY_ERROR_CODES.HAS_CHILDREN)) {
        toast.error(t("toast.deleteErrorTitle"), {
          description: t("toast.deleteHasChildrenDescription")
        });
        return;
      }

      if (code.includes(CATEGORY_ERROR_CODES.HAS_PRODUCTS)) {
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
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.CATEGORY.ALL })
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
