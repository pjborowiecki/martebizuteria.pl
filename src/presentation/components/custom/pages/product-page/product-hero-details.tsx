import { type JSX, type ReactNode, useMemo } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import {
  formatProductAttributeValueForDisplay,
  resolveProductAttributeTitle,
} from "~/src/modules/product-attribute/product-attribute.utils"
import { type Product } from "~/src/modules/product/product.types"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/presentation/components/shadcn/accordion"

const AdditionalInfoEmailLink = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => (
  <a
    className="text-foreground underline underline-offset-4 transition-colors hover:text-foreground/70"
    href="mailto:kontakt@martebizuteria.pl"
  >
    {children}
  </a>
)

const renderAdditionalInfoEmail = (chunks: ReactNode): JSX.Element => <AdditionalInfoEmailLink>{chunks}</AdditionalInfoEmailLink>

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
            email: renderAdditionalInfoEmail,
          }),
          key: "flexibleOffer",
          title: t("flexibleOffer.title"),
        },
      ] as const,
    [fulfillmentTime, t],
  )

  return (
    <div className="divide-y divide-border/60">
      {sections.map((section) => (
        <div key={section.key} className="space-y-1.5 py-5 first:pt-0 last:pb-0">
          <h4 className="text-sm font-medium text-foreground">{section.title}</h4>
          <p className="text-sm/relaxed text-muted-foreground">{section.body}</p>
        </div>
      ))}
    </div>
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
    items.push({
      content: <ProductAdditionalInfo fulfillmentTime={fulfillmentTime} />,
      key: "additionalInfo",
      title: t("additionalInfo.title"),
    })

    return items
  }, [description, detailSpecifications, fulfillmentTime, t])

  const defaultValue = useMemo(() => accordionItems.slice(0, 1).map((item) => item.key), [accordionItems])

  return (
    <Accordion className="w-full" defaultValue={defaultValue}>
      {accordionItems.map((section) => (
        <AccordionItem key={section.key} value={section.key}>
          <AccordionTrigger className="py-5 pl-2 text-[12px] tracking-[0.2em] uppercase hover:text-foreground/70 hover:no-underline sm:pl-3">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="pb-6 pl-2 sm:pl-3">{section.content}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

const FULFILLMENT_TIME_ATTRIBUTE_HANDLE = "czas-realizacji"

interface ProductHeroDetailsProps {
  readonly description: string
  readonly specifications: readonly Product["specification"][]
}
