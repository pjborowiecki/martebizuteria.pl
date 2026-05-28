import { type ChangeEvent, type JSX, useCallback, useMemo } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Label } from "~/src/components/shadcn/label";
import { Textarea } from "~/src/components/shadcn/textarea";

export interface CollectionBasicInfoProps {
  description: string;
  isNew: boolean;
  name: string;
  onDescriptionChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  slug: string;
}

export function CollectionBasicInfo({
  description,
  name,
  onDescriptionChange,
  onNameChange,
  onSlugChange,
  slug
}: CollectionBasicInfoProps): JSX.Element {
  const t = useTranslations("admin");

  const handleNameChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onNameChange(e.target.value);
    },
    [onNameChange]
  );

  const handleSlugChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onSlugChange(e.target.value);
    },
    [onSlugChange]
  );

  const handleDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onDescriptionChange(e.target.value);
    },
    [onDescriptionChange]
  );

  const charCount = useMemo(() => `${description.length}/500`, [description.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("collections.form.sectionBasic")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>{t("collections.form.name")}</Label>
            <Input type="text" value={name} onChange={handleNameChange} placeholder={t("collections.form.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("collections.form.slug")}</Label>
            <InputGroup>
              <InputGroupAddon className="text-sm font-normal text-muted-foreground">/collections/</InputGroupAddon>
              <InputGroupInput type="text" value={slug} onChange={handleSlugChange} placeholder="collection-name" />
            </InputGroup>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("collections.form.description")}</Label>
            <span className="text-[12px] text-muted-foreground">{charCount}</span>
          </div>
          <Textarea
            rows={4}
            value={description}
            onChange={handleDescriptionChange}
            placeholder={t("collections.form.descriptionPlaceholder")}
            className="min-h-11 resize-none bg-background py-3 text-sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
