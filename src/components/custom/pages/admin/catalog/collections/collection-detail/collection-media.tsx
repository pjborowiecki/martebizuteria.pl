import { type JSX, useCallback } from "react";

import { ImagePlus, Upload, X } from "lucide-react";
import { useTranslations } from "use-intl";

import { Button } from "~/src/components/shadcn/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";

import { Image } from "~/src/components/custom/image";

export interface CollectionMediaProps {
  image: string;
  onImageChange: (val: string) => void;
}

export function CollectionMedia({ image, onImageChange }: CollectionMediaProps): JSX.Element {
  const t = useTranslations("admin");

  const handleRemoveImage = useCallback(() => {
    onImageChange("");
  }, [onImageChange]);

  const handleAddImage = useCallback(() => {
    onImageChange("https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80");
  }, [onImageChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{t("collections.form.mediaTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        {image ? (
          <div className="group/img relative max-w-[320px] overflow-hidden rounded-lg border border-border bg-muted">
            <div className="relative aspect-video w-full">
              <Image src={image} alt="" width={640} height={360} className="absolute inset-0 size-full object-cover" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover/img:opacity-100">
              <ImageHoverActions onRemoveImage={handleRemoveImage} />
            </div>
          </div>
        ) : (
          <ImagePlaceholder onAddImage={handleAddImage} />
        )}
      </CardContent>
    </Card>
  );
}

function ImagePlaceholder({ onAddImage }: Readonly<{ onAddImage: () => void }>): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row">
      <button
        type="button"
        aria-label={t("collections.form.uploadImage")}
        className="flex w-full max-w-[280px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/30 transition-all hover:border-foreground/20 hover:bg-muted/50"
        onClick={onAddImage}
      >
        <div className="flex flex-col items-center gap-2 py-10">
          <div className="flex size-10 items-center justify-center rounded-full bg-foreground/5">
            <Upload className="size-5 text-muted-foreground/60" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium">{t("collections.form.uploadImage")}</p>
          <p className="text-[11px] text-muted-foreground/60">{t("collections.form.imageHint")}</p>
        </div>
      </button>
    </div>
  );
}

function ImageHoverActions({ onRemoveImage }: Readonly<{ onRemoveImage: () => void }>): JSX.Element {
  const t = useTranslations("admin");

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-[12px]">
        <ImagePlus className="size-3.5" strokeWidth={1.5} />
        {t("collections.form.changeImage")}
      </Button>
      <Button variant="secondary" size="sm" className="h-8 gap-1.5 text-[12px]" onClick={onRemoveImage}>
        <X className="size-3.5" strokeWidth={1.5} />
        {t("collections.form.removeImage")}
      </Button>
    </div>
  );
}
