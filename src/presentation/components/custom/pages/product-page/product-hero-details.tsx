import { type JSX, type ReactNode, useCallback, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import { FULFILLMENT_TIME_ATTRIBUTE_HANDLE } from "~/src/modules/product-attribute/product-attribute.constants"
import {
  formatProductAttributeValueForDisplay,
  resolveProductAttributeTitle,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { type Product } from "~/src/modules/product/product.types"
import { formatSellerPostalAddress } from "~/src/modules/store-setting/store-setting.utils"
import { getSellerDetailsQuery } from "~/src/modules/store-setting/use-cases/get-seller-details"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/presentation/components/shadcn/accordion"

const SellerEmailLink = ({ children, email }: Readonly<{ children: ReactNode; email: string }>): JSX.Element => (
  <a className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/70" href={`mailto:${email}`}>
    {children}
  </a>
)

const formatSpecificationValue = (spec: Product["specification"], locale: string): string =>
  formatProductAttributeValueForDisplay(spec.type, spec.value, {
    allowedValues: spec.allowedValues,
    locale,
    unit: spec.unit,
  })

const ProductSpecificationsList = ({
  specifications,
}: Readonly<{
  specifications: readonly Product["specification"][]
}>): JSX.Element => {
  const locale = useLocale()

  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      {specifications.map((spec) => (
        <div key={spec.handle} className="space-y-1">
          <dt className="text-sm font-medium text-foreground">{resolveProductAttributeTitle(spec.titles, locale)}</dt>
          <dd className="text-sm text-muted-foreground">{formatSpecificationValue(spec, locale)}</dd>
        </div>
      ))}
    </dl>
  )
}

const ProductAdditionalInfo = ({
  fulfillmentTime,
}: Readonly<{
  fulfillmentTime?: string | undefined
}>): JSX.Element => {
  const t = useTranslations("pages.product.heroSection.details.additionalInfo")
  const { data: seller } = useSuspenseQuery(getSellerDetailsQuery())
  const renderEmailLink = useCallback(
    (chunks: ReactNode) => <SellerEmailLink email={seller.email}>{chunks}</SellerEmailLink>,
    [seller.email],
  )
  const sections = useMemo(
    () =>
      [
        {
          body: t("fastFulfillment.text", {
            fulfillmentTime: fulfillmentTime ?? t("fastFulfillment.fallbackTime"),
          }),
          key: "fastFulfillment",
          title: t("fastFulfillment.title"),
        },
        {
          body: t("elegantBox.text"),
          key: "elegantBox",
          title: t("elegantBox.title"),
        },
        {
          body: t("uniqueLook.text"),
          key: "uniqueLook",
          title: t("uniqueLook.title"),
        },
        {
          body: t.rich("flexibleOffer.text", {
            email: seller.email,
            emailLink: renderEmailLink,
          }),
          key: "flexibleOffer",
          title: t("flexibleOffer.title"),
        },
      ] as const,
    [fulfillmentTime, renderEmailLink, seller.email, t],
  )

  return (
    <div className="divide-y divide-border/60">
      {sections.map((section) => (
        <div key={section.key} className="space-y-1.5 py-5 first:pt-0 last:pb-0">
          <h3 className="text-sm font-medium text-foreground">{section.title}</h3>
          <p className="text-sm/relaxed text-muted-foreground">{section.body}</p>
        </div>
      ))}
    </div>
  )
}

const ProductManufacturer = (): JSX.Element => {
  const t = useTranslations("pages.product.heroSection.details.manufacturer")
  const locale = useLocale()
  const { data: seller } = useSuspenseQuery(getSellerDetailsQuery())

  return (
    <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <div className="space-y-1">
        <dt className="text-sm font-medium text-foreground">{t("nameAndAddress")}</dt>
        <dd className="text-sm whitespace-pre-line text-muted-foreground">{formatSellerPostalAddress(seller, locale).join("\n")}</dd>
      </div>
      <div className="space-y-1">
        <dt className="text-sm font-medium text-foreground">{t("email")}</dt>
        <dd className="text-sm text-muted-foreground">
          <SellerEmailLink email={seller.email}>{seller.email}</SellerEmailLink>
        </dd>
      </div>
    </dl>
  )
}

export const ProductHeroDetails = ({ description, specifications }: ProductHeroDetailsProps): JSX.Element => {
  const t = useTranslations("pages.product.heroSection.details")
  const locale = useLocale()
  const detailSpecifications = useMemo(
    () =>
      specifications
        .filter((spec) => spec.handle !== FULFILLMENT_TIME_ATTRIBUTE_HANDLE && spec.value.trim() !== "")
        .toSorted((left, right) => left.rank - right.rank),
    [specifications],
  )

  const fulfillmentTime = useMemo(() => {
    const fulfillmentSpec = specifications.find((spec) => spec.handle === FULFILLMENT_TIME_ATTRIBUTE_HANDLE)
    if (fulfillmentSpec === undefined || fulfillmentSpec.value.trim() === "") {
      return
    }

    return formatSpecificationValue(fulfillmentSpec, locale)
  }, [locale, specifications])

  const accordionItems = useMemo(() => {
    const items: {
      content: JSX.Element
      key: string
      title: string
    }[] = []

    if (description.trim() !== "") {
      items.push({
        content: <p className="text-sm/relaxed whitespace-pre-wrap text-muted-foreground">{description}</p>,
        key: "description",
        title: t("description.title"),
      })
    }

    if (detailSpecifications.length > 0) {
      items.push({
        content: <ProductSpecificationsList specifications={detailSpecifications} />,
        key: "specifications",
        title: t("specifications.title"),
      })
    }
    items.push(
      {
        content: <ProductAdditionalInfo fulfillmentTime={fulfillmentTime} />,
        key: "additionalInfo",
        title: t("additionalInfo.title"),
      },
      {
        content: <ProductManufacturer />,
        key: "manufacturer",
        title: t("manufacturer.title"),
      },
    )

    return items
  }, [description, detailSpecifications, fulfillmentTime, t])

  const defaultValue = useMemo(() => accordionItems.slice(0, 1).map((item) => item.key), [accordionItems])

  return (
    <Accordion className="w-full" defaultValue={defaultValue}>
      {accordionItems.map((section) => (
        <AccordionItem key={section.key} value={section.key}>
          <AccordionTrigger
            className="py-5 pl-2 text-[12px] tracking-[0.2em] uppercase hover:text-foreground/70 hover:no-underline sm:pl-3"
            heading="h2"
          >
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="pb-6 pl-2 sm:pl-3">{section.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

interface ProductHeroDetailsProps {
  readonly description: string
  readonly specifications: readonly Product["specification"][]
}
