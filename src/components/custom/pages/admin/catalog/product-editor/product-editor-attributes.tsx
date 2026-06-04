import { type JSX, useCallback, useEffect, useMemo, useState } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useLocale, useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";

import { LocalizedLink } from "~/src/components/custom/localized-link";
import {
  CatalogSheetActionColumn,
  CatalogSheetControlColumn,
  CatalogSheetControlsActionRow
} from "~/src/components/custom/pages/admin/catalog/form/components/catalog-sheet-field-layout";
import { CATALOG_SHEET_ACTION_BUTTON_CLASS } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";
import { catalogSelectControlValue } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.utils";
import { ProductEditorAttributeFields } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-fields";
import { ProductEditorAttributeValueInput } from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value-input";
import {
  isProductAttributeValueComplete,
  toProductEditorAttributeDefinition
} from "~/src/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-value.utils";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";

import { productAttributeQueryOptions } from "~/src/modules/product-attribute/product-attribute.queries";
import { resolveProductAttributeTitle } from "~/src/modules/product-attribute/product-attribute.utils";

const EMPTY_FIELD_COUNT = 0;
const EMPTY_DRAFT = "";
const ATTRIBUTES_CREATE_SEARCH = { create: "1" } as const;

interface AttributeOption {
  readonly label: string;
  readonly value: string;
}

export function ProductEditorAttributes(): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.attributes");
  const locale = useLocale();
  const { control } = useFormContext<ProductFormValues>();
  const { data: attributes } = useSuspenseQuery(productAttributeQueryOptions.adminProductAttributesQueryOptions());

  const { append, fields, remove } = useFieldArray({
    control,
    name: "attributeValues"
  });

  const [draftAttributeId, setDraftAttributeId] = useState(EMPTY_DRAFT);
  const [draftValue, setDraftValue] = useState(EMPTY_DRAFT);

  const attributesById = useMemo(() => new Map(attributes.map((attribute) => [attribute.id, attribute])), [attributes]);

  const attributeOptions = useMemo(
    (): AttributeOption[] =>
      attributes.map((attribute) => ({
        label: resolveProductAttributeTitle(attribute.titles, locale),
        value: attribute.id
      })),
    [attributes, locale]
  );

  const draftDefinition = useMemo(
    () => toProductEditorAttributeDefinition(attributesById.get(draftAttributeId)),
    [attributesById, draftAttributeId]
  );

  const hasCatalogAttributes = attributeOptions.length > EMPTY_FIELD_COUNT;
  const hasRows = fields.length > EMPTY_FIELD_COUNT;
  const canAddDraft = isProductAttributeValueComplete(draftDefinition, draftValue) && draftAttributeId !== EMPTY_DRAFT;

  const handleAddRow = useCallback(() => {
    const attributeId = draftAttributeId.trim();
    const value = draftValue.trim();
    if (!isProductAttributeValueComplete(toProductEditorAttributeDefinition(attributesById.get(attributeId)), value)) {
      return;
    }

    append({ attributeId, value });
    setDraftAttributeId(EMPTY_DRAFT);
    setDraftValue(EMPTY_DRAFT);
  }, [append, attributesById, draftAttributeId, draftValue]);

  useEffect(
    function resetDraftValueWhenAttributeChanges() {
      setDraftValue(EMPTY_DRAFT);
    },
    [draftAttributeId]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <AttributeComposerRow
          attributeId={draftAttributeId}
          attributeOptions={attributeOptions}
          canAdd={canAddDraft}
          definition={draftDefinition}
          hasCatalogAttributes={hasCatalogAttributes}
          onAdd={handleAddRow}
          onAttributeIdChange={setDraftAttributeId}
          onValueChange={setDraftValue}
          value={draftValue}
        />
        {hasRows ? (
          <div className="space-y-4 border-t border-border/60 pt-4">
            {fields.map((field, index) => (
              <ProductEditorAttributeFields
                attributeOptions={attributeOptions}
                attributesById={attributesById}
                index={index}
                key={field.id}
                onRemove={remove}
              />
            ))}
          </div>
        ) : (
          <AttributesEmptyState hasCatalogAttributes={hasCatalogAttributes} />
        )}
      </CardContent>
    </Card>
  );
}

function AttributesEmptyState({ hasCatalogAttributes }: Readonly<{ hasCatalogAttributes: boolean }>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.attributes");
  const createAttributeLink = useMemo(() => <LocalizedLink search={ATTRIBUTES_CREATE_SEARCH} to={CONSTANTS.ROUTES.ADMIN_ATTRIBUTES} />, []);

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/70 bg-muted/15 px-8 py-12 text-center">
      <p className="max-w-md text-sm text-muted-foreground">{hasCatalogAttributes ? t("empty") : t("emptyNoCatalogAttributes")}</p>
      {!hasCatalogAttributes && (
        <Button className={CATALOG_SHEET_ACTION_BUTTON_CLASS} render={createAttributeLink} variant="outline">
          {t("createInCatalog")}
        </Button>
      )}
    </div>
  );
}

interface AttributeComposerRowProps {
  readonly attributeId: string;
  readonly attributeOptions: readonly AttributeOption[];
  readonly canAdd: boolean;
  readonly definition: ReturnType<typeof toProductEditorAttributeDefinition>;
  readonly hasCatalogAttributes: boolean;
  readonly onAdd: () => void;
  readonly onAttributeIdChange: (attributeId: string) => void;
  readonly onValueChange: (value: string) => void;
  readonly value: string;
}

function AttributeComposerRow({
  attributeId,
  attributeOptions,
  canAdd,
  definition,
  hasCatalogAttributes,
  onAdd,
  onAttributeIdChange,
  onValueChange,
  value
}: Readonly<AttributeComposerRowProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.attributes");
  const tForm = useTranslations("pages.admin.catalog.products.form.hints");
  const selectValue = catalogSelectControlValue(attributeId);

  const handleDraftAttributeChange = useCallback(
    (nextValue: string | null) => {
      onAttributeIdChange(nextValue ?? EMPTY_DRAFT);
    },
    [onAttributeIdChange]
  );

  return (
    <CatalogSheetControlsActionRow>
      <CatalogSheetControlColumn hint={tForm("attributeProperty")} label={t("attribute")}>
        <Select disabled={!hasCatalogAttributes} items={attributeOptions} onValueChange={handleDraftAttributeChange} value={selectValue}>
          <SelectTrigger size="sheet">
            <SelectValue placeholder={t("selectAttribute")} />
          </SelectTrigger>
          <SelectContent>
            {attributeOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CatalogSheetControlColumn>
      <CatalogSheetControlColumn hint={tForm("attributeValue")} label={t("value")}>
        <ProductEditorAttributeValueInput
          definition={definition}
          disabled={!hasCatalogAttributes || attributeId === EMPTY_DRAFT}
          onChange={onValueChange}
          value={value}
        />
      </CatalogSheetControlColumn>
      <CatalogSheetActionColumn>
        <Button className={CATALOG_SHEET_ACTION_BUTTON_CLASS} disabled={!canAdd} onClick={onAdd} type="button" variant="outline">
          {t("add")}
        </Button>
      </CatalogSheetActionColumn>
    </CatalogSheetControlsActionRow>
  );
}
