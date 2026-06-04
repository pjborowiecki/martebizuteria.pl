import { type ChangeEvent, type JSX, useCallback, useMemo } from "react";

import { Plus, Trash2 } from "lucide-react";
import { useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";

import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import {
  CatalogSheetActionColumn,
  CatalogSheetControlsActionRow
} from "~/src/components/custom/pages/admin/catalog/form/components/catalog-sheet-field-layout";
import {
  CATALOG_SHEET_ACTION_BUTTON_CLASS,
  CATALOG_SHEET_FIELD_CLASS
} from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";
import { ProductEditorOptionValuesField } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-option-values-field";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";
import { useSyncProductVariantsFromOptions } from "~/src/components/custom/pages/admin/catalog/product-editor/use-sync-product-variants-from-options";

import { MAX_PRODUCT_OPTIONS } from "~/src/modules/product-variant/product-variant.utils";
import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

const EMPTY_LENGTH = 0;
const MIN_OPTIONS = 1;
const EMPTY_OPTION_VALUES: string[] = [];

interface ProductEditorOptionsProps {
  readonly embedded?: boolean;
}

export function ProductEditorOptions({ embedded = false }: Readonly<ProductEditorOptionsProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.options");
  const { control, getValues, setValue } = useFormContext<ProductFormValues>();
  const options = useWatch({ control, defaultValue: [], name: "options" });

  useSyncProductVariantsFromOptions();

  const handleAddOption = useCallback(() => {
    const current = getValues("options");
    if (current.length >= MAX_PRODUCT_OPTIONS) {
      return;
    }

    setValue("options", [...current, { title: "", values: [""] }], { shouldDirty: true });
  }, [getValues, setValue]);

  const handleRemoveOption = useCallback(
    (index: number) => {
      const next = getValues("options").filter((_, optionIndex) => optionIndex !== index);
      setValue("options", next, { shouldDirty: true });
    },
    [getValues, setValue]
  );

  const addOptionButton = (
    <Button
      className={embedded ? CATALOG_SHEET_ACTION_BUTTON_CLASS : undefined}
      disabled={options.length >= MAX_PRODUCT_OPTIONS}
      onClick={handleAddOption}
      size={embedded ? undefined : "sm"}
      type="button"
      variant="outline"
    >
      <Plus className="mr-1 size-4" />
      {t("addOption")}
    </Button>
  );

  const content =
    options.length === EMPTY_LENGTH ? (
      <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/70 bg-muted/15 px-8 py-10 text-center">
        <p className="max-w-md text-sm text-muted-foreground">{t("empty")}</p>
        {addOptionButton}
      </div>
    ) : (
      <div className="space-y-4">
        {embedded && <div className="flex justify-end">{addOptionButton}</div>}
        {options.map((option, optionIndex) => (
          <OptionEditor
            canRemove={options.length > MIN_OPTIONS && optionIndex >= MIN_OPTIONS}
            key={option.id ?? `option-${String(optionIndex)}`}
            onRemove={handleRemoveOption}
            optionIndex={optionIndex}
          />
        ))}
      </div>
    );

  if (embedded) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        {options.length > EMPTY_LENGTH && addOptionButton}
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}

function OptionEditor({
  canRemove,
  onRemove,
  optionIndex
}: Readonly<{
  canRemove: boolean;
  onRemove: (index: number) => void;
  optionIndex: number;
}>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.options");
  const tProducts = useTranslations("pages.admin.catalog.products");
  const { control, setValue } = useFormContext<ProductFormValues>();
  const option = useWatch({ control, name: `options.${optionIndex}` });
  const optionValues = useMemo(() => option?.values ?? EMPTY_OPTION_VALUES, [option?.values]);
  const optionTitleValue = option?.title ?? "";

  const handleTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(`options.${optionIndex}.title`, event.target.value, { shouldDirty: true });
    },
    [optionIndex, setValue]
  );

  const handleValuesChange = useCallback(
    (values: string[]) => {
      setValue(`options.${optionIndex}.values`, values, { shouldDirty: true });
    },
    [optionIndex, setValue]
  );

  const handleRemoveClick = useCallback(() => {
    onRemove(optionIndex);
  }, [onRemove, optionIndex]);

  return (
    <div className="rounded-lg border border-border/50 p-4">
      <CatalogSheetControlsActionRow>
        <div className="grid min-w-0 flex-1 gap-4 md:grid-cols-2">
          <Field className={CATALOG_SHEET_FIELD_CLASS}>
            <CatalogFormFieldLabel
              counter={`${optionTitleValue.length}/${PRODUCT_COLUMN_LENGTH.optionTitle}`}
              hint={tProducts("form.hints.optionName")}
              label={t("optionName")}
            />
            <Input
              variant="sheet"
              maxLength={PRODUCT_COLUMN_LENGTH.optionTitle}
              onChange={handleTitleChange}
              placeholder={t("optionNamePlaceholder")}
              value={optionTitleValue}
            />
          </Field>
          <ProductEditorOptionValuesField onValuesChange={handleValuesChange} values={optionValues} />
        </div>
        {canRemove && (
          <CatalogSheetActionColumn>
            <Button
              aria-label={t("removeOption")}
              className="size-10 shrink-0"
              onClick={handleRemoveClick}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Trash2 className="size-4" />
            </Button>
          </CatalogSheetActionColumn>
        )}
      </CatalogSheetControlsActionRow>
    </div>
  );
}
