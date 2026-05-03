import type { JSX } from "react";

import { useTranslations } from "use-intl";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator
} from "~/src/components/shadcn/breadcrumb";

import { LocalizedLink } from "~/src/components/custom/localized-link";

const HOME_LINK = <LocalizedLink to="/" />;
const PRODUCTS_LINK = <LocalizedLink to="/products" />;

export interface ProductBreadcrumbProps {
  readonly productTitle: string;
}

export function ProductBreadcrumb({ productTitle }: ProductBreadcrumbProps): JSX.Element {
  const t = useTranslations("productPage.heroSection");

  return (
    <Breadcrumb className="reveal mx-auto max-w-400 px-6 pt-8 lg:px-12 lg:pt-10">
      <BreadcrumbList className="gap-2 text-[10px] tracking-[0.2em] uppercase sm:gap-2">
        <BreadcrumbItem>
          <BreadcrumbLink render={HOME_LINK}>{t("breadcrumbHome")}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink render={PRODUCTS_LINK}>{t("breadcrumbProducts")}</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbPage>{productTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
