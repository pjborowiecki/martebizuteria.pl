import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/src/presentation/components/shadcn/breadcrumb"

import { LocalizedLink } from "~/src/presentation/components/custom/localized-link"

import { ROUTES } from "~/src/routes"

export const ProductBreadcrumb = ({ productTitle }: ProductBreadcrumbProps): JSX.Element => {
  const t = useTranslations("pages.product.heroSection")

  return (
    <Breadcrumb className="reveal storefront-container pt-8 lg:pt-10">
      <BreadcrumbList className="flex-nowrap gap-2 overflow-hidden text-[10px] tracking-[0.2em] uppercase sm:gap-2 pointer-coarse:-my-3">
        <BreadcrumbItem>
          <BreadcrumbLink className={TOUCH_LINK_CLASS} render={HOME_LINK}>
            {t("breadcrumbHome")}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          <BreadcrumbLink className={TOUCH_LINK_CLASS} render={PRODUCTS_LINK}>
            {t("breadcrumbProducts")}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <span>/</span>
        </BreadcrumbSeparator>
        <BreadcrumbItem className="min-w-0">
          <BreadcrumbPage className="truncate">{productTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}

const HOME_LINK = <LocalizedLink to={ROUTES.HOME} />

const PRODUCTS_LINK = <LocalizedLink to={ROUTES.PRODUCTS} />

const TOUCH_LINK_CLASS = "pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"

interface ProductBreadcrumbProps {
  readonly productTitle: string
}
