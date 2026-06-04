import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { productMutations } from "~/src/modules/product/product.mutations";

export function useReorderProducts(): UseMutationResult<{ ok: boolean }, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.products.catalogList");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: readonly string[]) => productMutations.reorderProductsFn({ data: [...orderedIds] }),
    onError: () => {
      toast.error(t("toast.reorderErrorTitle"), {
        description: t("toast.reorderErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.PAGE }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ALL })
      ]);
    }
  });
}
