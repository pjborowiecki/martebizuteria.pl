import { type JSX, useState } from "react";

import { useTranslations } from "use-intl";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/components/shadcn/accordion";
import { Button } from "~/src/components/shadcn/button";
import { Separator } from "~/src/components/shadcn/separator";

import { QuantityPicker } from "~/src/components/custom/product-page/quantity-picker";

import { PRODUCT_DETAIL_KEYS, type ProductData } from "~/src/data/product-data";

const MIN_QUANTITY = 1;
const DEFAULT_ACCORDION_VALUE = ["description"];

export interface ProductHeroInfoProps {
  readonly product: ProductData;
}

export function ProductHeroInfo({ product }: ProductHeroInfoProps): JSX.Element {
  const t = useTranslations("productPage.heroSection");
  const [quantity, setQuantity] = useState(MIN_QUANTITY);

  return (
    <aside className="reveal space-y-6 lg:sticky lg:top-24 lg:self-start">
      <header className="space-y-3">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{product.collection?.title ?? t("collection")}</p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">{product.title}</h1>
        <p className="font-serif text-lg text-muted-foreground italic">{product.subtitle ?? t("subtitle")}</p>
      </header>

      <Separator className="bg-border" />

      <p className="text-lg tracking-[0.06em]">{t("price")}</p>

      <p className="text-xs tracking-wide text-muted-foreground">{t("material")}</p>

      <Separator className="bg-border" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <QuantityPicker quantity={quantity} setQuantity={setQuantity} />

        <Button
          className="h-14 flex-1 bg-foreground px-8 text-[12px] tracking-[0.24em] text-background uppercase hover:bg-foreground/90"
          type="button"
        >
          {t("addToCart")}
        </Button>
      </div>

      <p className="text-[10px] tracking-wider text-muted-foreground/60">{t("sku")}</p>

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
