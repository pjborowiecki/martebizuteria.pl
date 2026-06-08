import { type ChangeEvent, type JSX, useCallback, useId } from "react";

import { useTranslations } from "use-intl";

import type { StorefrontProductsSearch } from "~/src/modules/product/product.storefront-catalog";

interface ProductsCatalogPriceFilterProps {
  readonly onSearchChange: (patch: Partial<StorefrontProductsSearch>) => void;
  readonly search: StorefrontProductsSearch;
}

export function ProductsCatalogPriceFilter({ onSearchChange, search }: ProductsCatalogPriceFilterProps): JSX.Element {
  const t = useTranslations("pages.products.filters");
  const minPriceId = useId();
  const maxPriceId = useId();

  const handleMinPriceChange = useCallback(
    (value: string) => {
      const parsed = value.trim() === "" ? undefined : Number(value);
      onSearchChange({ minPrice: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined });
    },
    [onSearchChange]
  );

  const handleMaxPriceChange = useCallback(
    (value: string) => {
      const parsed = value.trim() === "" ? undefined : Number(value);
      onSearchChange({ maxPrice: parsed !== undefined && Number.isFinite(parsed) ? parsed : undefined });
    },
    [onSearchChange]
  );

  const handleMinPriceInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleMinPriceChange(event.target.value);
    },
    [handleMinPriceChange]
  );

  const handleMaxPriceInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleMaxPriceChange(event.target.value);
    },
    [handleMaxPriceChange]
  );

  return (
    <section className="space-y-4 border-t border-border/30 pt-8">
      <h3 className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("price")}</h3>
      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
        <div className="space-y-2">
          <label htmlFor={minPriceId} className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            {t("minPrice")}
          </label>
          <input
            id={minPriceId}
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="0"
            aria-label={t("minPrice")}
            value={search.minPrice ?? ""}
            onChange={handleMinPriceInputChange}
            className="h-9 w-full border-0 border-b border-border/40 bg-transparent px-0 text-sm transition-colors outline-none placeholder:text-muted-foreground/45 focus:border-foreground"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={maxPriceId} className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
            {t("maxPrice")}
          </label>
          <input
            id={maxPriceId}
            type="number"
            min={0}
            inputMode="numeric"
            placeholder="—"
            aria-label={t("maxPrice")}
            value={search.maxPrice ?? ""}
            onChange={handleMaxPriceInputChange}
            className="h-9 w-full border-0 border-b border-border/40 bg-transparent px-0 text-sm transition-colors outline-none placeholder:text-muted-foreground/45 focus:border-foreground"
          />
        </div>
      </div>
      <p className="text-[10px] tracking-[0.16em] text-muted-foreground/70 uppercase">{t("priceHint")}</p>
    </section>
  );
}
