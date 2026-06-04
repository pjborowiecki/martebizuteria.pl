import {
  type BaseSyntheticEvent,
  createContext,
  type JSX,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FormProvider, useForm, type UseFormSetError } from "react-hook-form";
import { toast } from "sonner";
import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import {
  formatCatalogLocaleList,
  useCatalogFormLocaleControls
} from "~/src/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls";
import { localesWithIncompleteProductFormValues } from "~/src/components/custom/pages/admin/catalog/product-editor/product-form-locale.utils";
import {
  createEmptyProductFormValues,
  mapProductDetailToFormValues,
  toCatalogUpsertPayload,
  type AdminProductDetail,
  type ProductFormValues
} from "~/src/components/custom/pages/admin/catalog/product-editor/product-form.utils";
import { galleryImagesToReplacePayload } from "~/src/components/custom/pages/admin/catalog/product-editor/product-image-form.utils";

import { attributeOnProductMutations } from "~/src/modules/attribute-on-product/attribute-on-product.mutations";
import { productImageMutations } from "~/src/modules/product-image/product-image.mutations";
import {
  isDatabaseSchemaOutdatedMutationError,
  isDuplicateAttributeOnProductMutationError,
  isDuplicateHandleMutationError,
  isDuplicateSkuMutationError,
  resolveProductMutationErrorMessage
} from "~/src/modules/product/product.mutation-errors";
import { productMutations } from "~/src/modules/product/product.mutations";
import { parseCatalogUpsertInput, productFormSchema } from "~/src/modules/product/product.zod";

const ZERO_LENGTH = 0;

export const PRODUCT_FORM_ID = "product-form";

export type ProductFormMode = "create" | "edit";

export interface ProductFormContextValue {
  readonly dismiss: () => void;
  readonly isPending: boolean;
  readonly isUploading: boolean;
  readonly mode: ProductFormMode;
  readonly onFormSubmit: (e?: BaseSyntheticEvent) => void;
  readonly productId: string | undefined;
  readonly setUploading: (uploading: boolean) => void;
}

const ProductFormContext = createContext<ProductFormContextValue | undefined>(undefined);

interface UseProductMutationOptions {
  readonly mode: ProductFormMode;
  readonly onCompleted: () => void;
  readonly productId: string | undefined;
  readonly setError: UseFormSetError<ProductFormValues>;
}

function resolveProductMutationErrorDescription(error: unknown, t: (key: string) => string): string {
  if (isDuplicateHandleMutationError(error)) {
    return t("toast.duplicateHandle");
  }

  if (isDuplicateSkuMutationError(error)) {
    return t("toast.duplicateSku");
  }

  if (isDuplicateAttributeOnProductMutationError(error)) {
    return t("toast.duplicateAttribute");
  }

  if (isDatabaseSchemaOutdatedMutationError(error)) {
    return t("toast.databaseSchemaOutdated");
  }

  const message = resolveProductMutationErrorMessage(error);
  if (message !== "") {
    return message;
  }

  return t("toast.errorDescription");
}

function useProductMutation({ mode, onCompleted, productId, setError }: UseProductMutationOptions) {
  const t = useTranslations("pages.admin.catalog.products");
  const queryClient = useQueryClient();

  const invalidate = useCallback(
    async (handle: string, savedProductId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.ALL }),
        queryClient.invalidateQueries({
          queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT.ADMIN.BY_HANDLE, handle] as const
        }),
        queryClient.invalidateQueries({
          queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT_IMAGE.BY_PRODUCT_ID, savedProductId] as const
        }),
        queryClient.invalidateQueries({
          queryKey: [...CONSTANTS.QUERY_KEYS.ATTRIBUTE_ON_PRODUCT.BY_PRODUCT_ID, savedProductId] as const
        })
      ]);
    },
    [queryClient]
  );

  const persistAttributeValues = useCallback(async (savedProductId: string, values: ProductFormValues) => {
    const rows = values.attributeValues
      .filter((row) => row.attributeId.trim() !== "" && row.value.trim() !== "")
      .map((row, index) => ({
        attributeId: row.attributeId,
        id: row.id,
        rank: index,
        value: row.value.trim()
      }));

    await attributeOnProductMutations.setForProductFn({
      data: { productId: savedProductId, values: rows }
    });
  }, []);

  const persistImages = useCallback(async (savedProductId: string, values: ProductFormValues) => {
    await productImageMutations.replaceProductImagesFn({
      data: {
        images: galleryImagesToReplacePayload(values.images, values.mainImageId),
        productId: savedProductId
      }
    });
  }, []);

  const saveProduct = useCallback(
    async (values: ProductFormValues) => {
      const catalogPayload = parseCatalogUpsertInput(values);

      if (mode === "create") {
        const result = await productMutations.createProductCompleteFn({
          data: {
            ...catalogPayload,
            attributeValues: values.attributeValues
              .filter((row) => row.attributeId.trim() !== "" && row.value.trim() !== "")
              .map((row, index) => ({
                attributeId: row.attributeId,
                id: row.id,
                rank: index,
                value: row.value.trim()
              })),
            images: galleryImagesToReplacePayload(values.images, values.mainImageId)
          }
        });

        await invalidate(result.handle, result.id);
        return;
      }

      if (productId === undefined) {
        throw new Error("Product id is required for update");
      }

      const result = await productMutations.updateProductFn({
        data: toCatalogUpsertPayload(catalogPayload, productId)
      });
      await Promise.all([persistImages(result.id, values), persistAttributeValues(result.id, values)]);
      await invalidate(result.handle, result.id);
    },
    [invalidate, mode, persistAttributeValues, persistImages, productId]
  );

  const handleError = useCallback(
    (error: unknown) => {
      if (isDuplicateHandleMutationError(error)) {
        setError("handle", { message: t("toast.duplicateHandle"), type: "manual" });
      } else if (isDuplicateSkuMutationError(error)) {
        setError("simpleVariant.sku", { message: t("toast.duplicateSku"), type: "manual" });
      }

      toast.error(t("toast.errorTitle"), {
        description: resolveProductMutationErrorDescription(error, t)
      });
    },
    [setError, t]
  );

  const mutation = useMutation({
    mutationFn: saveProduct,
    onError: handleError,
    onSuccess: () => {
      toast.success(mode === "create" ? t("toast.createSuccessTitle") : t("toast.updateSuccessTitle"), {
        description: mode === "create" ? t("toast.createSuccessDescription") : t("toast.updateSuccessDescription")
      });
      onCompleted();
    },
    retry: false
  });

  return {
    isPending: mutation.isPending,
    mutateAsync: mutation.mutateAsync
  };
}

interface ProductFormProviderProps {
  readonly children: ReactNode;
  readonly initialProduct?: AdminProductDetail;
  readonly mode: ProductFormMode;
  readonly onDismiss: () => void;
  readonly onSuccess?: () => void;
  /** When false, form state is cleared so cancel/close does not leave validation errors. */
  readonly open: boolean;
}

interface ProductFormSubmitInvalidContext {
  readonly focusIncompleteLocales: (locales: readonly Locale[]) => void;
  readonly getValues: () => ProductFormValues;
  readonly t: (key: string) => string;
  readonly tLocale: (key: string, values?: { locales: string }) => string;
}

function notifyProductFormSubmitInvalid(context: ProductFormSubmitInvalidContext): void {
  const incompleteLocales = localesWithIncompleteProductFormValues(context.getValues());

  if (incompleteLocales.length > ZERO_LENGTH) {
    context.focusIncompleteLocales(incompleteLocales);
    toast.error(context.tLocale("incompleteToastTitle"), {
      description: context.tLocale("incompleteToastDescription", {
        locales: formatCatalogLocaleList(incompleteLocales, (locale) => context.tLocale(`localeNames.${locale}`))
      })
    });
    return;
  }

  toast.error(context.t("form.validation.submitBlockedTitle"), {
    description: context.t("form.validation.submitBlockedDescription")
  });
}

export function ProductFormProvider({
  children,
  initialProduct,
  mode,
  onDismiss,
  onSuccess,
  open
}: Readonly<ProductFormProviderProps>): JSX.Element {
  const t = useTranslations("pages.admin.catalog.products");
  const tLocale = useTranslations("pages.admin.catalog.localePicker");
  const { focusIncompleteLocales } = useCatalogFormLocaleControls();
  const productId = initialProduct?.id;
  const [isUploading, setIsUploading] = useState(false);

  const initialValues = useMemo(
    () => (mode === "edit" && initialProduct !== undefined ? mapProductDetailToFormValues(initialProduct) : createEmptyProductFormValues()),
    [initialProduct, mode]
  );

  const resolver = useMemo(() => zodResolver(productFormSchema()), []);

  const form = useForm<ProductFormValues>({
    defaultValues: initialValues,
    mode: "onSubmit",
    reValidateMode: "onChange",
    resolver,
    shouldFocusError: true
  });

  const { clearErrors, reset, setError } = form;

  const resetFormState = useCallback(
    (values: ProductFormValues) => {
      reset(values, { keepDirty: false, keepTouched: false });
      clearErrors();
      setIsUploading(false);
    },
    [clearErrors, reset]
  );

  useEffect(
    function syncProductFormValues() {
      resetFormState(initialValues);
    },
    [initialValues, resetFormState]
  );

  useEffect(
    function resetProductFormOnClose() {
      if (!open) {
        resetFormState(initialValues);
      }
    },
    [initialValues, open, resetFormState]
  );

  const dismiss = useCallback(() => {
    resetFormState(initialValues);
    onDismiss();
  }, [initialValues, onDismiss, resetFormState]);

  const handleCompleted = useCallback(() => {
    resetFormState(createEmptyProductFormValues());
    onSuccess?.();
  }, [onSuccess, resetFormState]);

  const { isPending, mutateAsync } = useProductMutation({
    mode,
    onCompleted: handleCompleted,
    productId,
    setError
  });

  const submitInFlightRef = useRef(false);

  const handleSubmit = useCallback(
    (e?: BaseSyntheticEvent) => {
      void form.handleSubmit(
        async (values) => {
          if (submitInFlightRef.current) {
            return;
          }

          submitInFlightRef.current = true;
          try {
            await mutateAsync(values);
          } finally {
            submitInFlightRef.current = false;
          }
        },
        () => {
          notifyProductFormSubmitInvalid({ focusIncompleteLocales, getValues: form.getValues, t, tLocale });
        }
      )(e);
    },
    [focusIncompleteLocales, form, mutateAsync, t, tLocale]
  );

  const value = useMemo<ProductFormContextValue>(
    () => ({
      dismiss,
      isPending,
      isUploading,
      mode,
      onFormSubmit: handleSubmit,
      productId,
      setUploading: setIsUploading
    }),
    [dismiss, handleSubmit, isPending, isUploading, mode, productId]
  );

  return (
    <ProductFormContext.Provider value={value}>
      <FormProvider {...form}>
        <div className="flex h-full min-h-0 flex-col">{children}</div>
      </FormProvider>
    </ProductFormContext.Provider>
  );
}

/** Scrollable fields only — footer actions stay outside so cancel does not submit the form. */
export function ProductForm({ children }: Readonly<{ children: ReactNode }>): JSX.Element {
  const { onFormSubmit } = useProductForm();

  return (
    <form id={PRODUCT_FORM_ID} onSubmit={onFormSubmit} noValidate className="min-h-0 flex-1 overflow-y-auto">
      {children}
    </form>
  );
}

export function useProductForm(): ProductFormContextValue {
  const context = useContext(ProductFormContext);
  if (context === undefined) {
    throw new Error("useProductForm must be used within ProductFormProvider");
  }
  return context;
}
