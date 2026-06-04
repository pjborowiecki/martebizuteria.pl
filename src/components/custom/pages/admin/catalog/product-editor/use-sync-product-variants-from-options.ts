import { useEffect } from "react";

import { useFormContext, useWatch } from "react-hook-form";

import {
  regenerateVariantRows,
  type ProductFormValues
} from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { buildVariantCombinationKey } from "~/src/modules/product-variant/product-variant.utils";

function serializeOptionsForSync(options: ProductFormValues["options"]): string {
  return JSON.stringify(
    options.map((option) => ({
      title: option.title.trim(),
      values: option.values.map((value) => value.trim()).filter((value) => value !== "")
    }))
  );
}

function serializeVariantRowsForSync(variants: ProductFormValues["variants"]): string {
  return JSON.stringify(
    variants.map((variant) => ({
      compareAtPrice: variant.compareAtPrice,
      id: variant.id,
      key: buildVariantCombinationKey(variant.optionValues),
      price: variant.price,
      quantity: variant.quantity,
      sku: variant.sku,
      title: variant.title
    }))
  );
}

/** Keeps variant rows aligned with option axes; preserves SKU/price/stock per combination key. */
export function useSyncProductVariantsFromOptions(): void {
  const { control, getValues, setValue } = useFormContext<ProductFormValues>();
  const options = useWatch({ control, defaultValue: [], name: "options" });
  const optionsKey = serializeOptionsForSync(options);

  useEffect(
    function syncVariantRowsWhenOptionsChange() {
      const currentOptions = getValues("options");
      const currentVariants = getValues("variants");
      const nextVariants = regenerateVariantRows(currentOptions, currentVariants);

      if (serializeVariantRowsForSync(nextVariants) === serializeVariantRowsForSync(currentVariants)) {
        return;
      }

      setValue("variants", nextVariants, { shouldDirty: true });
    },
    [getValues, optionsKey, setValue]
  );
}
