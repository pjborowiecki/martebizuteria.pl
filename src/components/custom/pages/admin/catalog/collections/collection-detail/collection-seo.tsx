import { type ChangeEvent, type JSX, useCallback, useMemo } from "react";

import { useTranslations } from "use-intl";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Input } from "~/src/components/shadcn/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "~/src/components/shadcn/input-group";
import { Label } from "~/src/components/shadcn/label";
import { Textarea } from "~/src/components/shadcn/textarea";

export interface CollectionSeoProps {
  description: string;
  metaDescription: string;
  metaTitle: string;
  name: string;
  onMetaDescriptionChange: (val: string) => void;
  onMetaTitleChange: (val: string) => void;
  onSlugChange: (val: string) => void;
  slug: string;
}

export function CollectionSeo({
  description,
  metaDescription,
  metaTitle,
  name,
  onMetaDescriptionChange,
  onMetaTitleChange,
  onSlugChange,
  slug
}: CollectionSeoProps): JSX.Element {
  const t = useTranslations("admin");

  const handleMetaTitleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onMetaTitleChange(e.target.value);
    },
    [onMetaTitleChange]
  );

  const handleSlugChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      onSlugChange(e.target.value);
    },
    [onSlugChange]
  );

  const handleMetaDescriptionChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      onMetaDescriptionChange(e.target.value);
    },
    [onMetaDescriptionChange]
  );

  const metaTitleCharCount = useMemo(() => `${metaTitle.length}/60`, [metaTitle.length]);
  const metaDescCharCount = useMemo(() => `${metaDescription.length}/160`, [metaDescription.length]);

  const displayMetaTitle = useMemo(() => {
    if (metaTitle === "") {
      return name === "" ? "Collection name — M'ARTE" : `${name} — M'ARTE`;
    }
    return metaTitle;
  }, [metaTitle, name]);

  const displaySlug = useMemo(() => (slug === "" ? "collection-name" : slug), [slug]);

  const displayMetaDescription = useMemo(() => {
    if (metaDescription === "") {
      return description === "" ? t("collections.form.metaDescriptionPlaceholder") : description;
    }
    return metaDescription;
  }, [metaDescription, description, t]);

  return (
    <Card className="mb-10">
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("collections.form.sectionSeo")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg bg-secondary/30 p-4 ring-1 ring-border/30">
          <p className="text-[14px] leading-none font-medium text-blue-600">{displayMetaTitle}</p>
          <p className="mt-1.5 truncate text-[13px] text-emerald-700">marte.co/collections/{displaySlug}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{displayMetaDescription}</p>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-2">
            <div className="flex h-5 items-center justify-between">
              <Label>{t("collections.form.metaTitle")}</Label>
              <span className="text-[12px] text-muted-foreground">{metaTitleCharCount}</span>
            </div>
            <Input
              type="text"
              value={metaTitle}
              onChange={handleMetaTitleChange}
              placeholder={t("collections.form.metaTitlePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <div className="flex h-5 items-center">
              <Label>{t("collections.form.slug")}</Label>
            </div>
            <InputGroup>
              <InputGroupAddon className="text-sm font-normal text-muted-foreground">/collections/</InputGroupAddon>
              <InputGroupInput type="text" value={slug} onChange={handleSlugChange} placeholder="collection-name" />
            </InputGroup>
          </div>
          <div className="col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("collections.form.metaDescription")}</Label>
              <span className="text-[12px] text-muted-foreground">{metaDescCharCount}</span>
            </div>
            <Textarea
              rows={2}
              value={metaDescription}
              onChange={handleMetaDescriptionChange}
              placeholder={t("collections.form.metaDescriptionPlaceholder")}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
