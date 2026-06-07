import { type JSX } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";

import { ProductEditorAttributeListPanel } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { productAttributeQueryOptions } from "~/src/modules/product-attribute/product-attribute.queries";

export function ProductEditorAttributes(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.attributes");
  const { control } = useFormContext<ProductFormValues>();
  const hasVariants = useWatch({ control, name: "hasVariants" });
  const { data: attributes } = useSuspenseQuery(productAttributeQueryOptions.adminProductAttributesQueryOptions());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{hasVariants ? t("hintSharedVariants") : t("hint")}</p>
      </CardHeader>
      <CardContent>
        <ProductEditorAttributeListPanel attributes={attributes} baseName="attributeValues" />
      </CardContent>
    </Card>
  );
}
