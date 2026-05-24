import { type JSX, useCallback, useMemo } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Label } from "~/src/components/shadcn/label";
import { Textarea } from "~/src/components/shadcn/textarea";

export interface CategorySeoProps {
  description: string;
  metaDescription: string;
  metaTitle: string;
  name: string;
  onMetaDescriptionChange: (val: string) => void;
  onMetaTitleChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  slug: string;
}

export function CategorySeo({
  description,
  metaDescription,
  metaTitle,
  name,
  onMetaDescriptionChange,
  onMetaTitleChange,
  onSlugChange,
  slug
}: CategorySeoProps): JSX.Element {
  const t = useTranslations("admin");

  const handleMetaTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onMetaTitleChange(e.target.value);
    },
    [onMetaTitleChange]
  );

  const handleSlugChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSlugChange(e.target.value);
    },
    [onSlugChange]
  );

  const handleMetaDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onMetaDescriptionChange(e.target.value);
    },
    [onMetaDescriptionChange]
  );

  const metaTitleCharCount = useMemo(() => `${metaTitle.length}/60`, [metaTitle.length]);
  const metaDescCharCount = useMemo(() => `${metaDescription.length}/160`, [metaDescription.length]);

  const displayMetaTitle = useMemo(() => {
    if (metaTitle === "") {
      return name === "" ? "Category name — M'ARTE" : `${name} — M'ARTE`;
    }
    return metaTitle;
  }, [metaTitle, name]);

  const displaySlug = useMemo(() => (slug === "" ? "category-name" : slug), [slug]);

  const displayMetaDescription = useMemo(() => {
    if (metaDescription === "") {
      return description === "" ? t("categories.form.metaDescriptionPlaceholder") : description;
    }
    return metaDescription;
  }, [metaDescription, description, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("categories.form.sectionSeo")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="text-[14px] leading-none font-medium text-blue-600">{displayMetaTitle}</p>
          <p className="mt-1.5 truncate text-[13px] text-emerald-700">marte.co/categories/{displaySlug}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{displayMetaDescription}</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex h-5 items-center justify-between">
              <Label>{t("categories.form.metaTitle")}</Label>
              <span className="text-[12px] text-muted-foreground">{metaTitleCharCount}</span>
            </div>
            <Input type="text" value={metaTitle} onChange={handleMetaTitleChange} placeholder={t("categories.form.metaTitlePlaceholder")} />
          </div>
          <div className="space-y-2">
            <div className="flex h-5 items-center">
              <Label>{t("categories.form.slug")}</Label>
            </div>
            <InputGroup>
              <InputGroupAddon className="text-sm font-normal text-muted-foreground">/categories/</InputGroupAddon>
              <InputGroupInput type="text" value={slug} onChange={handleSlugChange} placeholder="category-name" />
            </InputGroup>
          </div>
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("categories.form.metaDescription")}</Label>
              <span className="text-[12px] text-muted-foreground">{metaDescCharCount}</span>
            </div>
            <Textarea
              rows={2}
              value={metaDescription}
              onChange={handleMetaDescriptionChange}
              placeholder={t("categories.form.metaDescriptionPlaceholder")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
