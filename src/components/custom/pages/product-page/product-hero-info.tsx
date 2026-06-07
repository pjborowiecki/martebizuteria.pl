import { type JSX, useCallback, useEffect, useState } from "react";

import { useFormatter, useLocale, useTranslations } from "use-intl";

import { getProductImageUrl } from "~/src/lib/_utils/image";
import { trackCartItemAdded } from "~/src/lib/customer-activity/customer-activity.tracking";
import { centsToDisplayAmount } from "~/src/lib/utils";

import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { ProductHeroDetails } from "~/src/components/custom/pages/product-page/product-hero-details";
import { ProductVariantPicker } from "~/src/components/custom/pages/product-page/product-variant-picker";
import { QuantityPicker } from "~/src/components/custom/pages/product-page/quantity-picker";

import { getVariantQuantityAvailable, isVariantPurchasable } from "~/src/modules/inventory/inventory.availability.utils";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils";
import type { StorefrontProduct, StorefrontProductVariant } from "~/src/modules/product/product.types";
import { useCartStore } from "~/src/stores/cart.store";

const MIN_QUANTITY = 1;
const RESET_ADDED_TIMEOUT = 2000;
const FIRST_VARIANT_INDEX = 0;

export interface ProductHeroInfoProps {
  readonly onSelectOptionValue: (optionId: string, valueId: string) => void;
  readonly product: StorefrontProduct;
  readonly selectedValueIds: Readonly<Record<string, string>>;
  readonly selectedVariant: StorefrontProductVariant | undefined;
}

export function ProductHeroInfo({ onSelectOptionValue, product, selectedValueIds, selectedVariant }: ProductHeroInfoProps): JSX.Element {
  const t = useTranslations("pages.product.heroSection");
  const tProduct = useTranslations("pages.product");
  const format = useFormatter();
  const locale = useLocale();
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCartStore();

  const variantPrice = selectedVariant?.price;
  const availableQuantity = getVariantQuantityAvailable(selectedVariant);
  const isOutOfStock = availableQuantity < MIN_QUANTITY;
  const canPurchase = isVariantPurchasable(selectedVariant, quantity);
  const price =
    variantPrice === undefined ? t("price") : format.number(centsToDisplayAmount(variantPrice), { currency: "PLN", style: "currency" });

  const heroImage = selectedVariant?.imageUrls[FIRST_VARIANT_INDEX] ?? product.sharedImageUrls[FIRST_VARIANT_INDEX] ?? product.thumbnail;

  useEffect(() => {
    if (quantity > availableQuantity && availableQuantity >= MIN_QUANTITY) {
      setQuantity(availableQuantity);
    }
  }, [availableQuantity, quantity]);

  useEffect(() => {
    setQuantity(MIN_QUANTITY);
  }, [selectedVariant?.id]);

  const specifications = selectedVariant?.specifications ?? product.sharedSpecifications;

  const handleAddToCart = useCallback(() => {
    if (selectedVariant === undefined || variantPrice === undefined || !isVariantPurchasable(selectedVariant, quantity)) {
      return;
    }

    const variantTitle = selectedVariant.title === DEFAULT_VARIANT_TITLE ? "" : selectedVariant.title;

    const addQuantity = Math.max(MIN_QUANTITY, quantity);

    addItem({
      id: selectedVariant.id,
      image: getProductImageUrl(heroImage),
      price,
      qty: addQuantity,
      rawPrice: variantPrice,
      slug: product.handle,
      title: product.title,
      variantId: selectedVariant.id,
      variantTitle
    });

    trackCartItemAdded({
      productTitle: product.title,
      quantity: addQuantity,
      variantId: selectedVariant.id,
      variantTitle
    });

    setIsAdded(true);
  }, [addItem, heroImage, price, product, quantity, selectedVariant, variantPrice]);

  useEffect(() => {
    if (!isAdded) {
      return;
    }

    const timer = setTimeout(() => {
      setIsAdded(false);
    }, RESET_ADDED_TIMEOUT);

    return () => {
      clearTimeout(timer);
    };
  }, [isAdded]);

  return (
    <aside className="reveal space-y-6 lg:sticky lg:top-24 lg:self-start">
      <header className="space-y-3">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
          {product.collection === undefined
            ? t("collection")
            : resolveCollectionTitle(product.collection.titles, locale) || t("collection")}
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">{product.title}</h1>
        <p className="text-[10px] tracking-wider text-muted-foreground/60">{t("sku")}</p>
      </header>

      <Separator className="bg-border" />

      <p className="text-lg tracking-[0.06em]">{price}</p>

      <ProductVariantPicker onSelectOptionValue={onSelectOptionValue} product={product} selectedValueIds={selectedValueIds} />

      <p className="text-xs tracking-wide text-muted-foreground">{t("material")}</p>

      <Separator className="bg-border" />

      {isOutOfStock ? (
        <p className="text-sm tracking-wide text-destructive">{tProduct("outOfStock")}</p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <QuantityPicker maxQuantity={availableQuantity} quantity={quantity} setQuantity={setQuantity} />

          <Button
            className="h-14 flex-1 bg-foreground px-8 text-[12px] tracking-[0.24em] text-background uppercase hover:bg-foreground/90"
            disabled={!canPurchase}
            onClick={handleAddToCart}
            type="button"
          >
            {isAdded ? t("addedToCart", { fallback: "Dodano" }) : t("addToCart")}
          </Button>
        </div>
      )}

      <Separator className="bg-border" />

      <ProductHeroDetails description={product.description} specifications={specifications} />
    </aside>
  );
}
