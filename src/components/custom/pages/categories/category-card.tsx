import { useMemo, type JSX } from "react";

import { useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { getProductImageUrl } from "~/src/lib/_utils/image";

import { AspectRatio } from "~/src/components/shadcn/aspect-ratio";

import { Image } from "~/src/components/custom/image";
import { LocalizedLink } from "~/src/components/custom/localized-link";

import type { Category } from "~/src/modules/product-category/product-category.types";
import {
  resolveCategoryDescription,
  resolveCategoryShortDescription,
  resolveCategoryTitle
} from "~/src/modules/product-category/product-category.utils";

const ASPECT_RATIO_PORTRAIT = 0.8;

export interface StorefrontCategoryCardProps {
  readonly aspectRatioClass: string;
  readonly category: Category["storefrontListItem"];
  readonly priority?: boolean;
  readonly showDescription?: boolean;
  readonly sizes: string;
}

export function StorefrontCategoryCard({
  aspectRatioClass,
  category,
  priority = false,
  showDescription = false,
  sizes
}: Readonly<StorefrontCategoryCardProps>): JSX.Element {
  const locale = useLocale();
  const t = useTranslations("pages.categories");
  const title = resolveCategoryTitle(category.titles, locale);
  const shortDescription = resolveCategoryShortDescription(category.shortDescriptions, locale);
  const description = shortDescription === "" ? resolveCategoryDescription(category.descriptions, locale) : shortDescription;
  const image = getProductImageUrl(category.image);
  const params = useMemo(() => ({ handle: category.handle }), [category.handle]);

  return (
    <LocalizedLink className="group block" params={params} to={CONSTANTS.ROUTES.CATEGORY}>
      <AspectRatio className={`overflow-hidden bg-neutral-100 ${aspectRatioClass}`} ratio={ASPECT_RATIO_PORTRAIT}>
        <Image
          alt={title}
          className="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform group-hover:scale-[1.03]"
          height={800}
          priority={priority}
          sizes={sizes}
          src={image}
          width={1000}
        />
      </AspectRatio>
      <div className="mt-5 space-y-2">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-serif text-lg tracking-tight transition-colors duration-500 group-hover:text-muted-foreground sm:text-xl lg:text-2xl">
            {title}
          </h2>
          <span className="shrink-0 text-[10px] tracking-[0.22em] text-foreground/35 uppercase">
            {t("productCount", { count: category.productCount })}
          </span>
        </div>
        {showDescription && description !== "" ? (
          <p className="line-clamp-2 max-w-prose text-sm/relaxed text-muted-foreground">{description}</p>
        ) : undefined}
      </div>
    </LocalizedLink>
  );
}
