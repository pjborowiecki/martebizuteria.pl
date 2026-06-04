import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { productAttributeMutations } from "~/src/modules/product-attribute/product-attribute.mutations";

export function useReorderAttributes(): UseMutationResult<{ ok: boolean }, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.attributes");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderedIds: readonly string[]) => productAttributeMutations.reorderProductAttributesFn({ data: [...orderedIds] }),
    onError: () => {
      toast.error(t("toast.reorderErrorTitle"), {
        description: t("toast.reorderErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.STATS })
      ]);
    }
  });
}
