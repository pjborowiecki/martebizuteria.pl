import { type JSX, useCallback, useEffect, useState } from "react";

import { useFormatter, useTranslations } from "use-intl";

import { getProductImageUrl } from "~/src/lib/_utils/image";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/components/shadcn/accordion";
import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { QuantityPicker } from "~/src/components/custom/pages/product-page/quantity-picker";

import { PRODUCT_DETAIL_KEYS, type ProductData } from "~/src/data/product-data";
import { useCartStore } from "~/src/stores/cart.store";

const MIN_QUANTITY = 1;
const RESET_ADDED_TIMEOUT = 2000;
const DEFAULT_ACCORDION_VALUE = ["description"];
const CENTS_PER_UNIT = 100;
const FIRST_VARIANT_INDEX = 0;
const FALLBACK_PRICE = 0;

export interface ProductHeroInfoProps {
  readonly product: ProductData & { readonly variants?: readonly { readonly price: number }[] };
}

export function ProductHeroInfo({ product }: ProductHeroInfoProps): JSX.Element {
  const t = useTranslations("pages.product.heroSection");
  const format = useFormatter();
  const [quantity, setQuantity] = useState(MIN_QUANTITY);
  const [isAdded, setIsAdded] = useState(false);
  const { addItem } = useCartStore();

  const variantPrice = product.variants?.[FIRST_VARIANT_INDEX]?.price;
  const price =
    variantPrice === undefined ? t("price") : format.number(variantPrice / CENTS_PER_UNIT, { currency: "PLN", style: "currency" });

  const handleAddToCart = useCallback(() => {
    const size = t("size", { fallback: "One Size" });
    const material = t("material");

    addItem({
      id: `${product.handle}-${size}-${material}`,
      image: getProductImageUrl(product.thumbnail),
      material,
      price,
      qty: Math.max(MIN_QUANTITY, quantity),
      rawPrice: variantPrice ?? FALLBACK_PRICE,
      size,
      slug: product.handle,
      title: product.title
    });

    setIsAdded(true);
  }, [addItem, price, product, quantity, t, variantPrice]);

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
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{product.collection?.title ?? t("collection")}</p>
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
        {PRODUCT_DETAIL_KEYS.map((key) => (
          <AccordionItem key={key} value={key}>
            <AccordionTrigger className="py-5 text-[12px] tracking-[0.2em] uppercase hover:text-foreground/70 hover:no-underline">
              {t(`details.${key}.title`)}
            </AccordionTrigger>
            <AccordionContent className="pb-6 text-sm/relaxed text-muted-foreground">
              {key === "description" && product.description !== null ? product.description : t(`details.${key}.text`)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </aside>
  );
}
