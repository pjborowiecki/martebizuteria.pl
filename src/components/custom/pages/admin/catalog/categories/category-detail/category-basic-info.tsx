import { type JSX, useCallback, useMemo } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Label } from "~/src/components/shadcn/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/components/shadcn/select";
import { Textarea } from "~/src/components/shadcn/textarea";

import { PARENT_CATEGORIES } from "~/src/data/categories-data";

export interface CategoryBasicInfoProps {
  description: string;
  isNew: boolean;
  name: string;
  onDescriptionChange: (val: string) => void;
  onNameChange: (val: string) => void;
  onParentChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  parent: string;
  slug: string;
}

export function CategoryBasicInfo({
  description,
  name,
  onDescriptionChange,
  onNameChange,
  onParentChange,
  onSlugChange,
  parent,
  slug
}: CategoryBasicInfoProps): JSX.Element {
  const t = useTranslations("admin");

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onNameChange(e.target.value);
    },
    [onNameChange]
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSlugChange(e.target.value);
    },
    [onSlugChange]
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onDescriptionChange(e.target.value);
    },
    [onDescriptionChange]
  );

  const handleParentSelectChange = useCallback(
    (val: string | null) => {
      onParentChange(val === "none" || val === null ? "" : val);
    },
    [onParentChange]
  );

  const charCount = useMemo(() => `${description.length}/500`, [description.length]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("categories.form.sectionBasic")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label>{t("categories.form.name")}</Label>
            <Input type="text" value={name} onChange={handleNameChange} placeholder={t("categories.form.namePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>{t("categories.form.slug")}</Label>
            <InputGroup>
              <InputGroupAddon className="text-sm font-normal text-muted-foreground">/categories/</InputGroupAddon>
              <InputGroupInput type="text" value={slug} onChange={handleSlugChange} placeholder="category-name" />
            </InputGroup>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("categories.form.description")}</Label>
            <span className="text-[12px] text-muted-foreground">{charCount}</span>
          </div>
          <Textarea
            rows={4}
            value={description}
            onChange={handleDescriptionChange}
            placeholder={t("categories.form.descriptionPlaceholder")}
          />
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="space-y-2">
            <Label>{t("categories.form.parentCategory")}</Label>
            <div className="relative">
              <ParentCategorySelect parent={parent} onParentChange={handleParentSelectChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("categories.form.sortOrder")}</Label>
            <Input type="number" defaultValue={0} min={0} className="font-mono" />
          </div>
          <div />
        </div>
      </CardContent>
    </Card>
  );
}

function ParentCategorySelect({
  parent,
  onParentChange
}: Readonly<{
  parent: string;
  onParentChange: (val: string | null) => void;
}>): JSX.Element {
  const t = useTranslations("admin");

  return (
    <Select value={parent || "none"} onValueChange={onParentChange}>
      <SelectTrigger className="min-h-11 w-full min-w-0 rounded-none border-0 border-b border-border bg-background px-3 py-2.5 text-sm shadow-none ring-0 transition-[color,background-color,border-color] outline-none focus-visible:border-foreground focus-visible:ring-0 data-[state=open]:border-foreground [&>svg]:opacity-50">
        <SelectValue placeholder={t("categories.form.noParent")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{t("categories.form.noParent")}</SelectItem>
        {PARENT_CATEGORIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
