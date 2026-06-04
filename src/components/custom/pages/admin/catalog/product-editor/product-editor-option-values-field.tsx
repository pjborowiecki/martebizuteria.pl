import { type ChangeEvent, type JSX, type KeyboardEvent, useCallback, useState } from "react";

import { X } from "lucide-react";
import { useTranslations } from "use-intl";

import { Badge } from "~/src/components/shadcn/badge";
import { Field } from "~/src/components/shadcn/field";
import { Input } from "~/src/components/shadcn/input";

import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import { CATALOG_SHEET_FIELD_CLASS } from "~/src/components/custom/pages/admin/catalog/form/lib/catalog-form.styles";

import { PRODUCT_COLUMN_LENGTH } from "~/src/modules/product/product.constants";

const EMPTY_LENGTH = 0;

interface ProductEditorOptionValuesFieldProps {
  readonly onValuesChange: (values: string[]) => void;
  readonly values: readonly string[];
}

export function ProductEditorOptionValuesField({ onValuesChange, values }: Readonly<ProductEditorOptionValuesFieldProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products.options");
  const tProducts = useTranslations("pages.admin.catalog.products");
  const [draft, setDraft] = useState("");

  const displayValues = values.filter((value) => value.trim() !== "");

  const commitDraft = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed === "") {
      return;
    }

    if (!displayValues.includes(trimmed)) {
      onValuesChange([...displayValues, trimmed]);
    }

    setDraft("");
  }, [displayValues, draft, onValuesChange]);

  const handleDraftChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraft(event.target.value);
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" || event.key === ",") {
        event.preventDefault();
        commitDraft();
      }
    },
    [commitDraft]
  );

  const handleBlur = useCallback(() => {
    commitDraft();
  }, [commitDraft]);

  const handleRemove = useCallback(
    (value: string) => {
      const next = displayValues.filter((entry) => entry !== value);
      onValuesChange(next.length === EMPTY_LENGTH ? [""] : next);
    },
    [displayValues, onValuesChange]
  );

  return (
    <Field className={CATALOG_SHEET_FIELD_CLASS}>
      <CatalogFormFieldLabel
        counter={`${draft.length}/${PRODUCT_COLUMN_LENGTH.optionValue}`}
        hint={tProducts("form.hints.optionValues")}
        label={t("optionValues")}
      />
      <Input
        variant="sheet"
        maxLength={PRODUCT_COLUMN_LENGTH.optionValue}
        onBlur={handleBlur}
        onChange={handleDraftChange}
        onKeyDown={handleKeyDown}
        placeholder={t("optionValuesPlaceholder")}
        value={draft}
      />
      {displayValues.length > EMPTY_LENGTH && (
        <div className="flex flex-wrap gap-1.5">
          {displayValues.map((value) => (
            <OptionValueChip key={value} onRemove={handleRemove} value={value} />
          ))}
        </div>
      )}
    </Field>
  );
}

function OptionValueChip({ onRemove, value }: Readonly<{ onRemove: (value: string) => void; value: string }>): JSX.Element {
  const handleRemove = useCallback(() => {
    onRemove(value);
  }, [onRemove, value]);

  return (
    <Badge className="gap-1 rounded-md pr-1 text-[11px] font-normal" variant="secondary">
      {value}
      <button
        className="ml-0.5 flex size-3.5 items-center justify-center rounded-sm opacity-50 transition-opacity hover:opacity-100"
        onClick={handleRemove}
        type="button"
      >
        <X className="size-2.5" strokeWidth={2} />
      </button>
    </Badge>
  );
}
