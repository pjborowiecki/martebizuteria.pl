import { type JSX, useRef } from "react";

import { useFormatter, useTranslations } from "use-intl";

import { Separator } from "~/src/components/shadcn/separator";

import { ProductCard } from "~/src/components/custom/product-card";

import { useProductAnimations } from "~/src/hooks/use-product-animations";

const CENTS_PER_UNIT = 100;

export interface RelatedProductItem {
  readonly detailKey: string;
  readonly image: string;
  readonly nameKey: string;
  readonly params: { readonly handle: string };
  readonly price?: number;
  readonly priceKey?: string;
}

export interface ProductRelatedSectionProps {
  readonly products: readonly RelatedProductItem[];
}

export function ProductRelatedSection({ products }: ProductRelatedSectionProps): JSX.Element {
  const t = useTranslations("pages.product.relatedSection");
  const sectionRef = useRef<HTMLElement>(null);

  useProductAnimations({ dependencies: [products], rootRef: sectionRef });

  const format = useFormatter();

  return (
    <section className="mx-auto max-w-400 px-6 pt-20 pb-20 lg:px-12 lg:pt-28 lg:pb-28" ref={sectionRef}>
      <div className="reveal mb-10 space-y-3">
        <Separator className="max-w-16 bg-foreground/30" />
        <h2 className="font-serif text-3xl leading-tight md:text-4xl">{t("title")}</h2>
      </div>

      <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((item) => {
          const detail = item.detailKey.includes("related.") ? t(item.detailKey) : item.detailKey;
          const name = item.nameKey.includes("related.") ? t(item.nameKey) : item.nameKey;

          const price = (() => {
            if (item.price === undefined) {
              return item.priceKey === undefined ? undefined : t(item.priceKey);
            }
            return format.number(item.price / CENTS_PER_UNIT, { currency: "PLN", style: "currency" });
          })();

          return (
            <ProductCard
              className="reveal"
              detail={detail}
              href="/products/$handle"
              image={item.image}
              key={item.nameKey}
              name={name}
              parallax
              params={item.params}
              price={price}
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          );
        })}
      </div>
    </section>
  );
}
