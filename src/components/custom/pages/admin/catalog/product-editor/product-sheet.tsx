import { type JSX, useCallback } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "use-intl";

import { Sheet, SheetDescription, SheetHeader, SheetTitle } from "~/src/components/shadcn/sheet";

import { CatalogFormLocaleControlsProvider } from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls";
import {
  ProductForm,
  ProductFormProvider,
  type ProductFormMode
} from "~/src/components/custom/pages/admin/catalog/product-editor/product-form-provider";
import { ProductSheetFooter } from "~/src/components/custom/pages/admin/catalog/product-editor/product-sheet-footer";
import { ProductSheetFormBody } from "~/src/components/custom/pages/admin/catalog/product-editor/product-sheet-form-body";
import { ProductSheetLoading } from "~/src/components/custom/pages/admin/catalog/product-editor/product-sheet-loading";
import { ProductFormSheetContent } from "~/src/components/custom/pages/admin/catalog/product-form-sheet-content";

import { productQueryOptions } from "~/src/modules/product/product.queries";
import type { Product } from "~/src/modules/product/product.types";

interface ProductSheetProps {
  readonly mode: ProductFormMode;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly product: Product["adminListItem"] | undefined;
}

export function ProductSheet({ mode, onOpenChange, open, product }: Readonly<ProductSheetProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");

  const title = mode === "create" ? t("form.titleAdd") : t("form.titleEdit");
  const description = mode === "create" ? t("form.sheetDescription") : t("form.sheetDescriptionEdit");

  const handleDismiss = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSuccess = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const sheetKey = mode === "create" ? "create" : (product?.id ?? "edit");

  if (mode === "create") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <ProductFormSheetContent>
          <ProductSheetCreate
            key={sheetKey}
            description={description}
            onDismiss={handleDismiss}
            onSuccess={handleSuccess}
            open={open}
            title={title}
          />
        </ProductFormSheetContent>
      </Sheet>
    );
  }

  if (product === undefined) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <ProductFormSheetContent />
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <ProductFormSheetContent>
        <ProductSheetEdit
          key={sheetKey}
          description={description}
          handle={product.handle}
          onDismiss={handleDismiss}
          onSuccess={handleSuccess}
          open={open}
          title={title}
        />
      </ProductFormSheetContent>
    </Sheet>
  );
}

interface ProductSheetShellProps {
  readonly children: JSX.Element;
  readonly description: string;
  readonly title: string;
}

function ProductSheetShell({ children, description, title }: Readonly<ProductSheetShellProps>): JSX.Element {
  return (
    <>
      <SheetHeader className="shrink-0 space-y-1 border-b border-border px-6 py-5 pr-14">
        <SheetTitle className="text-base font-semibold tracking-tight">{title}</SheetTitle>
        <SheetDescription className="max-w-lg text-[13px] leading-relaxed text-muted-foreground">{description}</SheetDescription>
      </SheetHeader>
      {children}
      <ProductSheetFooter />
    </>
  );
}

interface ProductSheetCreateProps {
  readonly description: string;
  readonly onDismiss: () => void;
  readonly onSuccess: () => void;
  readonly open: boolean;
  readonly title: string;
}

function ProductSheetCreate({ description, onDismiss, onSuccess, open, title }: Readonly<ProductSheetCreateProps>): JSX.Element {
  return (
    <CatalogFormLocaleControlsProvider>
      <ProductFormProvider mode="create" open={open} onDismiss={onDismiss} onSuccess={onSuccess}>
        <ProductSheetShell description={description} title={title}>
          <ProductForm>
            <ProductSheetFormBody />
          </ProductForm>
        </ProductSheetShell>
      </ProductFormProvider>
    </CatalogFormLocaleControlsProvider>
  );
}

interface ProductSheetEditProps {
  readonly description: string;
  readonly handle: string;
  readonly onDismiss: () => void;
  readonly onSuccess: () => void;
  readonly open: boolean;
  readonly title: string;
}

function ProductSheetEdit({ description, handle, onDismiss, onSuccess, open, title }: Readonly<ProductSheetEditProps>): JSX.Element {
  const { data: productDetail } = useSuspenseQuery(productQueryOptions.adminProductByHandleQueryOptions(handle));

  if (productDetail === undefined) {
    return <ProductSheetLoading title={title} description={description} />;
  }

  return (
    <CatalogFormLocaleControlsProvider>
      <ProductFormProvider initialProduct={productDetail} mode="edit" open={open} onDismiss={onDismiss} onSuccess={onSuccess}>
        <ProductSheetShell description={description} title={title}>
          <ProductForm>
            <ProductSheetFormBody />
          </ProductForm>
        </ProductSheetShell>
      </ProductFormProvider>
    </CatalogFormLocaleControlsProvider>
  );
}
