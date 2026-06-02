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

import { COLLECTION_COLUMN_LENGTH } from "~/src/modules/collection/collection.constants";

export function BasicDetailsSection(): JSX.Element {
  const t = useTranslations("admin");
  const { control, isPending, setValue } = useCollectionForm();

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
    <CollectionFormSection icon={Info} title={t("collections.form.sectionBasic")}>
      <CollectionTextField
        control={control}
        name="title"
        label={t("collections.form.name")}
        placeholder={t("collections.form.namePlaceholder")}
        disabled={isPending}
        onValueChange={handleTitleChange}
      />
      <CollectionSlugField
        control={control}
        name="handle"
        label={t("collections.form.slug")}
        hint={t("collections.form.slugHint")}
        normalize={slugify}
        onManualEdit={lockHandle}
        disabled={isPending}
      />
      <CollectionTextareaField
        control={control}
        name="description"
        label={t("collections.form.description")}
        placeholder={t("collections.form.descriptionPlaceholder")}
        counterMax={COLLECTION_COLUMN_LENGTH.description}
        rows={4}
        disabled={isPending}
      />
    </CollectionFormSection>
  );
}
