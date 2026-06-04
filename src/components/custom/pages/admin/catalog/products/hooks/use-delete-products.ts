import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { productMutations } from "~/src/modules/product/product.mutations";

interface DeleteResult {
  readonly deleted: number;
  readonly ok: boolean;
}

/** Batch-deletes products (variants cascade), then revalidates admin and storefront lists. */
export function useDeleteProducts(): UseMutationResult<DeleteResult, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => productMutations.deleteProductsFn({ data: [...ids] }),
    onError: () => {
      toast.error(t("toast.deleteErrorTitle"), {
        description: t("toast.deleteErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.STATS }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ALL })
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
