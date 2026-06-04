import type { JSX, ReactNode } from "react";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Field, FieldError } from "~/src/components/shadcn/field";

import { ProductEditorOptions } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-options";
import { ProductEditorVariants } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-variants";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { PRODUCT_FORM_VALIDATION_KEYS } from "~/src/modules/product/product.constants";

const PRODUCT_FORM_VALIDATION_KEY_SET = new Set<string>(Object.values(PRODUCT_FORM_VALIDATION_KEYS));

function resolveFormErrorMessage(t: (key: string) => string, message: string | undefined): string | undefined {
  if (message === undefined || message === "") {
    return undefined;
  }

  return PRODUCT_FORM_VALIDATION_KEY_SET.has(message) ? t(message) : message;
}

function VariantsSubsection({ children, hint, title }: Readonly<{ children: ReactNode; hint: string; title: string }>): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      {children}
    </div>
  );
}

export function ProductEditorVariantsSection(): JSX.Element {
  const tProducts = useTranslations("pages.admin.catalog.products");
  const t = useTranslations("pages.admin.catalog.products.variants");
  const {
    formState: { errors }
  } = useFormContext<ProductFormValues>();

  const optionsMessage = resolveFormErrorMessage(tProducts, errors.options?.message);
  const variantsMessage = resolveFormErrorMessage(tProducts, errors.variants?.message);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("sectionHint")}</p>
      </CardHeader>
      <CardContent className="space-y-8">
        {(optionsMessage !== undefined || variantsMessage !== undefined) && (
          <div className="space-y-2">
            {optionsMessage !== undefined && (
              <Field data-invalid>
                <FieldError>{optionsMessage}</FieldError>
              </Field>
            )}
            {variantsMessage !== undefined && (
              <Field data-invalid>
                <FieldError>{variantsMessage}</FieldError>
              </Field>
            )}
          </div>
        )}
        <VariantsSubsection hint={t("optionsDefinitionsHint")} title={t("optionsDefinitions")}>
          <ProductEditorOptions embedded />
        </VariantsSubsection>
        <div className="border-t border-border/30" />
        <VariantsSubsection hint={t("rowsSectionHint")} title={t("rowsTitle")}>
          <ProductEditorVariants embedded />
        </VariantsSubsection>
      </CardContent>
    </Card>
  );
}
