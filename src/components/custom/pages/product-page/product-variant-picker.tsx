import { type JSX, useCallback } from "react";

import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { IMPLICIT_VARIANT_OPTION_TITLES } from "~/src/components/custom/pages/admin/catalog/product-editor/product-variant-form.utils";

import { getVariantQuantityAvailable } from "~/src/modules/inventory/inventory.availability.utils";
import type { StorefrontProduct } from "~/src/modules/product/product.types";

const MIN_STOCK = 1;
const EMPTY_OPTIONS = 0;
const SINGLE_OPTION_AXIS = 1;

export interface ProductVariantPickerProps {
  readonly onSelectOptionValue: (optionId: string, valueId: string) => void;
  readonly product: StorefrontProduct;
  readonly selectedValueIds: Readonly<Record<string, string>>;
}

export function ProductVariantPicker({ onSelectOptionValue, product, selectedValueIds }: ProductVariantPickerProps): JSX.Element {
  const t = useTranslations("pages.product.heroSection");
  const showPicker = product.hasVariants && product.options.length > EMPTY_OPTIONS;

  if (!showPicker) {
    return <div className="hidden" aria-hidden />;
  }

  return (
    <div className="space-y-4">
      {product.options.map((option) => (
        <OptionAxis
          key={option.id}
          onSelectValue={onSelectOptionValue}
          option={option}
          product={product}
          selectedValueId={selectedValueIds[option.id]}
        />
      ))}
      <p className="text-xs tracking-wide text-muted-foreground">{t("variantHint")}</p>
    </div>
  );
}

function OptionAxis({
  onSelectValue,
  option,
  product,
  selectedValueId
}: Readonly<{
  onSelectValue: (optionId: string, valueId: string) => void;
  option: StorefrontProduct["options"][number];
  product: StorefrontProduct;
  selectedValueId: string | undefined;
}>): JSX.Element {
  const hideAxisTitle =
    product.options.length === SINGLE_OPTION_AXIS &&
    (option.title === IMPLICIT_VARIANT_OPTION_TITLES.pl || option.title === IMPLICIT_VARIANT_OPTION_TITLES.en);

  return (
    <div className="space-y-2">
      {!hideAxisTitle && <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{option.title}</p>}
      <div className="flex flex-wrap gap-2">
        {option.values.map((value) => (
          <OptionValueButton
            isAvailable={product.variants.some(
              (variant) => variant.optionValueIds[option.id] === value.id && getVariantQuantityAvailable(variant) >= MIN_STOCK
            )}
            isSelected={selectedValueId === value.id}
            key={value.id}
            label={value.label}
            onSelectValue={onSelectValue}
            optionId={option.id}
            valueId={value.id}
          />
        ))}
      </div>
    </div>
  );
}

function OptionValueButton({
  isAvailable,
  isSelected,
  label,
  onSelectValue,
  optionId,
  valueId
}: Readonly<{
  isAvailable: boolean;
  isSelected: boolean;
  label: string;
  onSelectValue: (optionId: string, valueId: string) => void;
  optionId: string;
  valueId: string;
}>): JSX.Element {
  const handleClick = useCallback(() => {
    onSelectValue(optionId, valueId);
  }, [onSelectValue, optionId, valueId]);

  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "min-w-16 rounded-md border px-3 py-2 text-[11px] tracking-[0.14em] uppercase transition-colors",
        isSelected ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground",
        !isAvailable && "opacity-40"
      )}
      disabled={!isAvailable}
      onClick={handleClick}
      type="button"
    >
      {label}
    </button>
  );
}
