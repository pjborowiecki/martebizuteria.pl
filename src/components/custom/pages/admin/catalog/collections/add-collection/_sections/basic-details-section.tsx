import { type JSX, useCallback, useState } from "react";

import { Info } from "lucide-react";
import { useTranslations } from "use-intl";

import {
  CollectionSlugField,
  CollectionTextField,
  CollectionTextareaField
} from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-fields";
import { useCollectionForm } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider";
import { CollectionFormSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-section";
import { slugify } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form.utils";
import { CatalogFormReadOnlyField } from "~/src/components/custom/pages/admin/catalog/components/catalog-form-read-only-field";
import { CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS } from "~/src/components/custom/pages/admin/catalog/components/catalog-form.styles";

import { COLLECTION_COLUMN_LENGTH } from "~/src/modules/collection/collection.constants";

interface BasicDetailsSectionProps {
  /** Row id from the sheet (edit mode); preferred over form context when both are set. */
  readonly recordId?: string;
}

export function BasicDetailsSection({ recordId }: Readonly<BasicDetailsSectionProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.collections");
  const { collectionId, control, isPending, mode, setValue } = useCollectionForm();
  const displayId = recordId ?? (mode === "edit" ? collectionId : undefined);

  // The handle tracks the title until the user takes manual control of it.
  const [handleLocked, setHandleLocked] = useState(false);

  const handleTitleChange = useCallback(
    (value: string) => {
      if (!handleLocked) {
        setValue("handle", slugify(value), { shouldValidate: false });
      }
    },
    [handleLocked, setValue]
  );

  const lockHandle = useCallback(() => {
    setHandleLocked(true);
  }, []);

  return (
    <CollectionFormSection icon={Info} title={t("form.sectionBasic")}>
      {displayId !== undefined && displayId !== "" && (
        <CatalogFormReadOnlyField label={t("form.id")} hint={t("form.hints.id")} value={displayId} />
      )}
      <CollectionTextField
        control={control}
        name="title"
        label={t("form.name")}
        labelHint={t("form.hints.name")}
        placeholder={t("form.namePlaceholder")}
        counterMax={COLLECTION_COLUMN_LENGTH.title}
        disabled={isPending}
        onValueChange={handleTitleChange}
      />
      <CollectionSlugField
        control={control}
        name="handle"
        label={t("form.slug")}
        labelHint={t("form.hints.slug")}
        counterMax={COLLECTION_COLUMN_LENGTH.handle}
        normalize={slugify}
        onManualEdit={lockHandle}
        disabled={isPending}
      />
      <CollectionTextareaField
        control={control}
        name="description"
        label={t("form.description")}
        labelHint={t("form.hints.description")}
        placeholder={t("form.descriptionPlaceholder")}
        counterMax={COLLECTION_COLUMN_LENGTH.description}
        className={CATALOG_FORM_DESCRIPTION_TEXTAREA_CLASS}
        rows={6}
        disabled={isPending}
      />
    </CollectionFormSection>
  );
}
