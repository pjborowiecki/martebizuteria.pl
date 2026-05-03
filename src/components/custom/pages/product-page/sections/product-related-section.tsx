import { type JSX, useRef } from "react";

import { useTranslations } from "use-intl";

import { Separator } from "~/src/components/shadcn/separator";

import { ProductCard } from "~/src/components/custom/product-card";

import { useProductAnimations } from "~/src/hooks/use-product-animations";

export interface RelatedProductItem {
  readonly detailKey: string;
  readonly image: string;
  readonly nameKey: string;
  readonly params: { readonly handle: string };
  readonly priceKey: string;
}

export interface ProductRelatedSectionProps {
  readonly products: readonly RelatedProductItem[];
}

export function ProductRelatedSection({ products }: ProductRelatedSectionProps): JSX.Element {
  const t = useTranslations("productPage.relatedSection");
  const sectionRef = useRef<HTMLElement>(null);

  useProductAnimations({ dependencies: [products], rootRef: sectionRef });

  return (
    <section className="mx-auto max-w-400 px-6 pt-20 pb-20 lg:px-12 lg:pt-28 lg:pb-28" ref={sectionRef}>
      <div className="reveal mb-10 space-y-3">
        <Separator className="max-w-16 bg-foreground/30" />
        <h2 className="font-serif text-3xl leading-tight md:text-4xl">{t("title")}</h2>
      </div>

      <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((item) => (
          <ProductCard
            className="reveal"
            detail={t(item.detailKey)}
            href="/products/$handle"
            image={item.image}
            key={item.nameKey}
            name={t(item.nameKey)}
            parallax
            params={item.params}
            price={t(item.priceKey)}
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ))}
      </div>
    </section>
  );
}
