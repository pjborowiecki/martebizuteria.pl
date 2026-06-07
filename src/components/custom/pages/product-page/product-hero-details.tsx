import { type JSX, useMemo } from "react";

import { useLocale, useTranslations } from "use-intl";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "~/src/components/shadcn/accordion";

import { PRODUCT_DETAIL_KEYS } from "~/src/data/product-data";
import {
  formatProductAttributeValueForDisplay,
  resolveProductAttributeTitle
} from "~/src/modules/product-attribute/product-attribute.utils";
import type { ProductSpecification } from "~/src/modules/product/product.types";

const DEFAULT_ACCORDION_VALUE = ["description"];

interface DetailSection {
  readonly body: string;
  readonly key: string;
  readonly title: string;
}

export interface ProductHeroDetailsProps {
  readonly description: string;
  readonly specifications: readonly ProductSpecification[];
}

export function ProductHeroDetails({ description, specifications }: ProductHeroDetailsProps): JSX.Element {
  const t = useTranslations("pages.product.heroSection");
  const locale = useLocale();

  const detailSections = useMemo((): DetailSection[] => {
    const specByHandle = new Map(specifications.map((spec) => [spec.handle, spec]));
    const sections: DetailSection[] = [];

    for (const key of PRODUCT_DETAIL_KEYS) {
      if (key === "description") {
        const body = description === "" ? t("details.description.text") : description;
        sections.push({ body, key, title: t("details.description.title") });
      } else {
        const spec = specByHandle.get(key);
        if (spec !== undefined && spec.value.trim() !== "") {
          sections.push({
            body: formatProductAttributeValueForDisplay(spec.type, spec.value, {
              allowedValues: spec.allowedValues,
              locale,
              unit: spec.unit
            }),
            key,
            title: resolveProductAttributeTitle(spec.titles, locale)
          });
        } else {
          sections.push({ body: t(`details.${key}.text`), key, title: t(`details.${key}.title`) });
        }
      }
    }

    return sections;
  }, [description, locale, specifications, t]);

  return (
    <Accordion className="w-full" defaultValue={DEFAULT_ACCORDION_VALUE}>
      {detailSections.map((section) => (
        <AccordionItem key={section.key} value={section.key}>
          <AccordionTrigger className="py-5 text-[12px] tracking-[0.2em] uppercase hover:text-foreground/70 hover:no-underline">
            {section.title}
          </AccordionTrigger>
          <AccordionContent className="pb-6 text-sm/relaxed text-muted-foreground">{section.body}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
