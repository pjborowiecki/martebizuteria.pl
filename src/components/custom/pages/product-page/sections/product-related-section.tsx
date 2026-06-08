import { type JSX, useMemo, useRef } from "react";

import { useFormatter, useLocale, useTranslations } from "use-intl";

import { centsToDisplayAmount } from "~/src/lib/utils";

import { Separator } from "~/src/components/shadcn/separator";

import { ProductCard } from "~/src/components/custom/product-card";

import { useProductAnimations } from "~/src/hooks/use-product-animations";
import { DEFAULT_VARIANT_TITLE } from "~/src/modules/product-variant/product-variant.utils";

const EMPTY_PRODUCT_COUNT = 0;

export interface RelatedProductItem {
  readonly handle: string;
  readonly id: string;
  readonly image: string;
  readonly name: string;
  readonly subtitle: string;
  readonly variantId?: string;
  readonly variantPrice?: number;
  readonly variantTitle?: string;
}

export interface ProductRelatedSectionProps {
  readonly products: readonly RelatedProductItem[];
}

function RelatedProductCard({ className, product }: Readonly<{ className?: string; product: RelatedProductItem }>): JSX.Element {
  const format = useFormatter();
  const params = useMemo(() => ({ handle: product.handle }), [product.handle]);

  const { variantPrice, variantTitle: resolvedVariantTitle } = product;
  const price =
    variantPrice === undefined ? undefined : format.number(centsToDisplayAmount(variantPrice), { currency: "PLN", style: "currency" });
  const variantTitle = resolvedVariantTitle === DEFAULT_VARIANT_TITLE ? "" : (resolvedVariantTitle ?? "");

  return (
    <ProductCard
      className={className}
      detail={product.subtitle}
      href="/products/$handle"
      image={product.image}
      name={product.name}
      params={params}
      parallax
      price={price}
      rawPrice={variantPrice}
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
      slug={product.handle}
      variantId={product.variantId}
      variantTitle={variantTitle}
    />
  );
}

export function ProductRelatedSection({ products }: ProductRelatedSectionProps): JSX.Element | undefined {
  const t = useTranslations("pages.product.relatedSection");
  const locale = useLocale();
  const sectionRef = useRef<HTMLElement>(null);

  useProductAnimations({ dependencies: [locale, products], rootRef: sectionRef });

  if (products.length === EMPTY_PRODUCT_COUNT) {
    return undefined;
  }

  return (
    <section className="mx-auto max-w-400 px-6 pb-20 lg:px-12 lg:pb-28" ref={sectionRef}>
      <div className="reveal mb-10 space-y-3">
        <Separator className="max-w-16 bg-foreground/30" />
        <h2 className="font-serif text-3xl leading-tight md:text-4xl">{t("title")}</h2>
      </div>

      <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <RelatedProductCard key={product.id} className="reveal" product={product} />
        ))}
      </div>
    </section>
  );
}
