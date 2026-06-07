import { type JSX, useCallback } from "react";

import { ImageIcon } from "lucide-react";
import { useController, useFormContext, useWatch } from "react-hook-form";
import { useTranslations } from "use-intl";

import { cn } from "~/src/lib/utils";

import { Card, CardContent, CardHeader, CardTitle } from "~/src/components/shadcn/card";
import { Field } from "~/src/components/shadcn/field";

import { ImageGalleryUpload } from "~/src/components/custom/image-upload/components/image-gallery-upload";
import type { GalleryImage } from "~/src/components/custom/image-upload/lib/image-upload.types";
import { CatalogFormFieldLabel } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-field-label";
import { useProductForm } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form-provider";
import type { ProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";
import { productImagesToGallery } from "~/src/components/custom/pages/admin/catalog/product-editor/product-image-form.utils";

interface ProductEditorMediaProps {
  readonly fillHeight?: boolean;
}

export function ProductEditorMedia({ fillHeight = false }: Readonly<ProductEditorMediaProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");
  const { control } = useFormContext<ProductFormValues>();
  const hasVariants = useWatch({ control, name: "hasVariants" });
  const { isPending, setUploading } = useProductForm();

  const imagesField = useController({ control, name: "images" });
  const mainField = useController({ control, name: "mainImageId" });

  const galleryValue = productImagesToGallery(imagesField.field.value);

  const handleGalleryChange = useCallback(
    (images: readonly GalleryImage[]) => {
      const previous = imagesField.field.value;
      imagesField.field.onChange(
        images.map((image) => ({
          alt: previous.find((row) => row.id === image.id)?.alt ?? "",
          id: image.id,
          url: image.url
        }))
      );
    },
    [imagesField.field]
  );

  const handleMainChange = useCallback(
    (id: string | undefined) => {
      mainField.field.onChange(id);
    },
    [mainField.field]
  );

  const handleUploadingChange = useCallback(
    (uploading: boolean) => {
      setUploading(uploading);
    },
    [setUploading]
  );

  return (
    <Card className={cn(fillHeight && "flex h-full flex-col")}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <ImageIcon className="size-4 text-muted-foreground/60" strokeWidth={1.5} />
        <CardTitle className="text-base font-semibold">{t("media.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Field className="gap-2">
          <CatalogFormFieldLabel
            hint={hasVariants ? t("media.hintSharedVariants") : t("media.hint")}
            label={hasVariants ? t("media.galleryLabelShared") : t("media.galleryLabel")}
          />
          <ImageGalleryUpload
            className="w-full max-w-none"
            disabled={isPending}
            folder="products"
            mainId={mainField.field.value}
            onChange={handleGalleryChange}
            onMainChange={handleMainChange}
            onUploadingChange={handleUploadingChange}
            value={galleryValue}
          />
          <p className="text-[12px] text-muted-foreground">{t("media.formats")}</p>
        </Field>
      </CardContent>
    </Card>
  );
}
