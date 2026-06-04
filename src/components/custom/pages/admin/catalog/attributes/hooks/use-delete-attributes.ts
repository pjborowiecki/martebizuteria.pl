import { type UseMutationResult, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { PRODUCT_ATTRIBUTE_ERROR_CODES } from "~/src/modules/product-attribute/product-attribute.constants";
import { productAttributeMutations } from "~/src/modules/product-attribute/product-attribute.mutations";

interface DeleteResult {
  readonly deleted: number;
  readonly ok: boolean;
}

export function useDeleteAttributes(): UseMutationResult<DeleteResult, Error, readonly string[]> {
  const t = useTranslations("pages.admin.catalog.attributes");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: readonly string[]) => productAttributeMutations.deleteProductAttributesFn({ data: [...ids] }),
    onError: (error) => {
      const code = error instanceof Error ? error.message : "";

      if (code.includes(PRODUCT_ATTRIBUTE_ERROR_CODES.IN_USE)) {
        toast.error(t("toast.deleteErrorTitle"), {
          description: t("toast.deleteInUseDescription")
        });
        return;
      }

      toast.error(t("toast.deleteErrorTitle"), {
        description: t("toast.deleteErrorDescription")
      });
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.ALL }),
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.STATS })
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
