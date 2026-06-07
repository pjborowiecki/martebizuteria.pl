import { useCallback, useMemo, useState } from "react";

import { getVariantQuantityAvailable } from "~/src/modules/inventory/inventory.availability.utils";
import type { StorefrontProduct, StorefrontProductVariant } from "~/src/modules/product/product.types";

const EMPTY_LENGTH = 0;
const FIRST_INDEX = 0;
const MIN_STOCK = 1;

function variantsMatchSelection(variant: StorefrontProductVariant, selection: Readonly<Record<string, string>>): boolean {
  return Object.entries(selection).every(([optionId, valueId]) => variant.optionValueIds[optionId] === valueId);
}

function findVariantForSelection(
  product: StorefrontProduct,
  selection: Readonly<Record<string, string>>
): StorefrontProductVariant | undefined {
  return product.variants.find((variant) => variantsMatchSelection(variant, selection));
}

function buildInitialSelection(product: StorefrontProduct): Record<string, string> {
  const purchasableVariant =
    product.variants.find((variant) => getVariantQuantityAvailable(variant) >= MIN_STOCK) ?? product.variants[FIRST_INDEX];

  if (purchasableVariant === undefined) {
    return {};
  }

  return { ...purchasableVariant.optionValueIds };
}

export interface UseSelectedProductVariantResult {
  readonly selectOptionValue: (optionId: string, valueId: string) => void;
  readonly selectedValueIds: Readonly<Record<string, string>>;
  readonly selectedVariant: StorefrontProductVariant | undefined;
}

export function useSelectedProductVariant(product: StorefrontProduct): UseSelectedProductVariantResult {
  const [selectedValueIds, setSelectedValueIds] = useState<Record<string, string>>(() => buildInitialSelection(product));

  const selectedVariant = useMemo(
    () => findVariantForSelection(product, selectedValueIds) ?? product.variants[FIRST_INDEX],
    [product, selectedValueIds]
  );

  const selectOptionValue = useCallback(
    (optionId: string, valueId: string) => {
      const nextSelection = { ...selectedValueIds, [optionId]: valueId };
      const nextVariant = findVariantForSelection(product, nextSelection);

      if (nextVariant === undefined) {
        return;
      }

      setSelectedValueIds(nextSelection);
    },
    [product, selectedValueIds]
  );

  return {
    selectOptionValue,
    selectedValueIds,
    selectedVariant: product.variants.length === EMPTY_LENGTH ? undefined : selectedVariant
  };
}
