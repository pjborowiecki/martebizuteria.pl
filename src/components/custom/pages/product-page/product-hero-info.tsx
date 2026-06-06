import { type JSX, useCallback, useEffect, useMemo, useState } from "react";

import { useFormatter, useLocale, useTranslations } from "use-intl";

import { getProductImageUrl } from "~/src/lib/_utils/image";
import { trackCartItemAdded } from "~/src/lib/customer-activity/customer-activity.tracking";
import { centsToDisplayAmount } from "~/src/lib/utils";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/components/shadcn/accordion";
import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { QuantityPicker } from "~/src/components/custom/pages/product-page/quantity-picker";

import { PRODUCT_DETAIL_KEYS } from "~/src/data/product-data";
import {
  formatProductAttributeValueForDisplay,
  resolveProductAttributeTitle
} from "~/src/modules/product-attribute/product-attribute.utils";
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils";
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils";
import type { StorefrontProduct } from "~/src/modules/product/product.types";
import { useCartStore } from "~/src/stores/cart.store";

const MIN_QUANTITY = 1;
const RESET_ADDED_TIMEOUT = 2000;
const DEFAULT_ACCORDION_VALUE = ["description"];
const FIRST_VARIANT_INDEX = 0;

export interface ProductHeroInfoProps {
  readonly product: StorefrontProduct;
}

interface DetailSection {
  readonly body: string;
  readonly key: string;
  readonly title: string;
}

export function ProductHeroInfo({ product }: ProductHeroInfoProps): JSX.Element {
  const t = useTranslations("pages.product.heroSection");
  const format = useFormatter();
  const locale = useLocale();
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCartStore();

  const selectedVariant = product.variants?.[FIRST_VARIANT_INDEX];
  const variantPrice = selectedVariant?.price;
  const price =
    variantPrice === undefined ? t("price") : format.number(centsToDisplayAmount(variantPrice), { currency: "PLN", style: "currency" });

  const detailSections = useMemo((): DetailSection[] => {
    const specByHandle = new Map(product.specifications.map((spec) => [spec.handle, spec]));

    const sections: DetailSection[] = [];

    for (const key of PRODUCT_DETAIL_KEYS) {
      if (key === "description") {
        const body = product.description !== null && product.description !== "" ? product.description : t("details.description.text");
        sections.push({ body, key, title: t("details.description.title") });
      } else {
        const spec = specByHandle.get(key);
        if (spec !== undefined && spec.value.trim() !== "") {
          sections.push({
            body: formatProductAttributeValueForDisplay(spec.type, spec.value, {
              allowedValues: spec.allowedValues,
              locale,
              unit: spec.unit
            }),
            key,
            title: resolveProductAttributeTitle(spec.titles, locale)
          });
        } else {
          sections.push({ body: t(`details.${key}.text`), key, title: t(`details.${key}.title`) });
        }
      }
    }

    return sections;
  }, [locale, product.description, product.specifications, t]);

  const handleAddToCart = useCallback(() => {
    if (selectedVariant === undefined || variantPrice === undefined) {
      return;
    }

    const variantTitle = selectedVariant.title === DEFAULT_VARIANT_TITLE ? "" : selectedVariant.title;

    const addQuantity = Math.max(MIN_QUANTITY, quantity);

    addItem({
      id: selectedVariant.id,
      image: getProductImageUrl(product.thumbnail),
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
  }, [addItem, price, product, quantity, selectedVariant, variantPrice]);

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

      <p className="text-xs tracking-wide text-muted-foreground">{t("material")}</p>

      <Separator className="bg-border" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <QuantityPicker quantity={quantity} setQuantity={setQuantity} />

        <Button
          className="h-14 flex-1 bg-foreground px-8 text-[12px] tracking-[0.24em] text-background uppercase hover:bg-foreground/90"
          onClick={handleAddToCart}
          type="button"
        >
          {isAdded ? t("addedToCart", { fallback: "Dodano" }) : t("addToCart")}
        </Button>
      </div>

      <Separator className="bg-border" />

      <Accordion className="w-full" defaultValue={DEFAULT_ACCORDION_VALUE}>
        {detailSections.map((section) => (
          <AccordionItem key={section.key} value={section.key}>
            <AccordionTrigger className="py-5 text-[12px] tracking-[0.2em] uppercase hover:text-foreground/70 hover:no-underline">
              {section.title}
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-sm/relaxed text-muted-foreground">{section.body}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </aside>
  );
}
