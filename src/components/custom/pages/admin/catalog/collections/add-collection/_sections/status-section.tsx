import { type JSX, useMemo } from "react";

import { CircleDot } from "lucide-react";
import { useTranslations } from "use-intl";

import { Field } from "~/src/components/shadcn/field";
import { Label } from "~/src/components/shadcn/label";

import { CollectionSelectField } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-fields";
import { useCollectionForm } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider";
import { CollectionFormSection } from "~/src/components/custom/pages/admin/catalog/collections/add-collection/collection-form-section";

import { COLLECTION_STATUSES, COLLECTION_STATUS_LABEL_KEYS } from "~/src/modules/collection/collection.constants";

export function StatusSection(): JSX.Element {
  const t = useTranslations("admin");
  const { control, isPending } = useCollectionForm();

  const statusOptions = useMemo(
    () =>
      COLLECTION_STATUSES.map((status) => ({
        label: t(COLLECTION_STATUS_LABEL_KEYS[status]),
        value: status
      })),
    [t]
  );

  return (
    <CollectionFormSection icon={CircleDot} title={t("collections.form.displayOptions")}>
      <Field className="gap-2">
        <Label className="text-[13px] font-medium text-foreground">{t("collections.form.status")}</Label>
        <CollectionSelectField
          control={control}
          name="status"
          ariaLabel={t("collections.form.status")}
          options={statusOptions}
          disabled={isPending}
        />
      </Field>
    </CollectionFormSection>
  );
}
